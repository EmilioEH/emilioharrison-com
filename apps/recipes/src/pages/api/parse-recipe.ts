import type { APIRoute } from 'astro'
import { GoogleGenAI, Type as SchemaType } from '@google/genai'
import { load } from 'cheerio'

const PROTEIN_OPTIONS = [
  'Chicken',
  'Beef',
  'Pork',
  'Fish',
  'Seafood',
  'Vegetarian',
  'Vegan',
  'Other',
]

const IMAGE_SYSTEM_PROMPT = `
You are an expert Chef and Data Engineer. Your task is to extract structured recipe data from the provided image.

Return a strict JSON object matching the provided schema.

Rules:
1. Describe what you see in the image and infer the recipe (ingredients/steps) as best as possible.
2. Use reasonable defaults if data is missing (e.g. 2 servings).
3. Identify the "Main Protein Source" and map it strictly to one of these values: ${PROTEIN_OPTIONS.join(', ')}.
4. Infer the "Meal Type" (Breakfast, Lunch, Dinner, Snack, Dessert).
5. Infer the "Dish Type" (Main, Side, Appetizer, Salad, Soup, Drink, Sauce).
6. List any specific "Equipment" required (e.g. Air Fryer, Slow Cooker, Blender).
7. Suggest any "Occasion" tags (e.g. Weeknight, Party, Holiday).
8. Extract "Dietary" attributes (e.g. Gluten-Free, Vegan, Keto).
9. **Normalize Ingredients**: Populate 'structuredIngredients' by parsing each ingredient into:
   - 'amount' (number)
   - 'unit' (standardized string, e.g. "cup", "tbsp", "oz", "g")
   - 'name' (ingredient name without unit)
   - 'category' (Produce, Meat, Dairy, Bakery, Frozen, Pantry, Spices, Other)
`

const URL_SYSTEM_PROMPT = `
You are an expert Chef and Data Engineer. Your task is to extract structured recipe data from the provided webpage content (HTML).

Return a strict JSON object matching the provided schema.

Rules:
1. Analyze the provided HTML content carefully.
2. Prioritize extracting data from JSON-LD structured data (Recipe schema) if present in the HTML.
3. If JSON-LD is missing or incomplete, parse the visible text content.
4. Do not hallucinate ingredients or steps that are not present in the content.
5. Use reasonable defaults if optional metadata is missing, but be accurate with Ingredients and Steps.
6. Identify the "Main Protein Source" and map it strictly to one of these values: ${PROTEIN_OPTIONS.join(', ')}.
7. Infer the "Meal Type" (Breakfast, Lunch, Dinner, Snack, Dessert).
8. Infer the "Dish Type" (Main, Side, Appetizer, Salad, Soup, Drink, Sauce).
9. List any specific "Equipment" required (e.g. Air Fryer, Slow Cooker, Blender).
10. Suggest any "Occasion" tags (e.g. Weeknight, Party, Holiday).
11. Extract "Dietary" attributes (e.g. Gluten-Free, Vegan, Keto).
12. **Normalize Ingredients**: Populate 'structuredIngredients' by parsing each ingredient into:
    - 'amount' (number)
    - 'unit' (standardized string, e.g. "cup", "tbsp", "oz", "g")
    - 'name' (ingredient name without unit)
    - 'category' (Produce, Meat, Dairy, Bakery, Frozen, Pantry, Spices, Other)
`

const JSON_LD_SYSTEM_PROMPT = `
You are an expert Chef and Data Engineer. Your task is to MORMALIZE and ENRICH the provided JSON-LD Recipe Data into our internal schema.

The input is already structured data from the source website. Your job is not to guess, but to:
1. Map the fields to our schema.
2. Clean up HTML tags from descriptions or steps.
3. **Normalize Ingredients**: This is critical. Parse the 'recipeIngredient' strings into 'structuredIngredients':
   - 'amount' (number)
   - 'unit' (standardized string, e.g. "cup", "tbsp", "oz", "g")
   - 'name' (ingredient name without unit)
   - 'category' (Produce, Meat, Dairy, Bakery, Frozen, Pantry, Spices, Other)
4. Map "Main Protein Source" to one of: ${PROTEIN_OPTIONS.join(', ')}.
5. Infer "Meal Type", "Dish Type" based on the recipe title and context.
`

/**
 * Helper to extract JSON-LD Recipe data from HTML string using Cheerio (Edge compatible).
 */
function extractJsonLd(html: string): unknown | null {
  try {
    const $ = load(html)
    const scripts = $('script[type="application/ld+json"]')

    for (const script of scripts) {
      try {
        const textContent = $(script).html() || ''
        const json = JSON.parse(textContent)
        // Handle graph or direct object
        const items = Array.isArray(json) ? json : json['@graph'] || [json]

        // Find the recipe item safely
        const recipe = items.find((item: unknown) => {
          if (typeof item === 'object' && item !== null && '@type' in item) {
            const type = (item as { '@type': string | string[] })['@type']
            return type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))
          }
          return false
        })

        if (recipe) {
          return recipe
        }
      } catch (e) {
        console.warn('Failed to parse a JSON-LD script', e)
      }
    }
  } catch (parseError) {
    console.warn('Cheerio parsing failed', parseError)
  }
  return null
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime?.env || import.meta.env
  const apiKey = env.GEMINI_API_KEY

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing API Key configuration' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { url, image } = await request.json()

    if (!url && !image) {
      return new Response(JSON.stringify({ error: 'No input provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let userContentPart: { text?: string; inlineData?: { mimeType: string; data: string } } = {}
    let selectedPrompt = URL_SYSTEM_PROMPT

    if (url) {
      if (!url.startsWith('http')) {
        throw new Error('Invalid URL')
      }

      const siteRes = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      })
      if (!siteRes.ok) throw new Error('Failed to fetch URL')
      const html = await siteRes.text()

      // Hybrid Strategy: Try to extract JSON-LD
      const jsonLdData = extractJsonLd(html)

      if (jsonLdData) {
        console.log('✅ Found JSON-LD Recipe data. Using deterministic hybrid mode.')
        selectedPrompt = JSON_LD_SYSTEM_PROMPT
        userContentPart = {
          text: `Source URL: ${url}\n\nJSON-LD Data:\n${JSON.stringify(jsonLdData, null, 2)}`,
        }
      } else {
        console.log('⚠️ No JSON-LD found. Fallback to raw HTML parsing.')
        selectedPrompt = URL_SYSTEM_PROMPT
        userContentPart = { text: `Source URL: ${url}\n\nHTML Content:\n${html}` }
      }
    } else if (image) {
      // Use the specialized Image prompt
      selectedPrompt = IMAGE_SYSTEM_PROMPT

      // Image is expected to be base64 data URL: "data:image/jpeg;base64,..."
      const base64Data = image.split(',')[1]
      const mimeType = image.split(';')[0].split(':')[1]
      userContentPart = {
        inlineData: {
          mimeType: mimeType,
          data: base64Data,
        },
      }
    }

    const schema = {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING },
        servings: { type: SchemaType.NUMBER },
        prepTime: { type: SchemaType.NUMBER },
        cookTime: { type: SchemaType.NUMBER },
        ingredients: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              name: { type: SchemaType.STRING },
              amount: { type: SchemaType.STRING },
              prep: { type: SchemaType.STRING, nullable: true },
            },
            required: ['name', 'amount'],
          },
        },
        structuredIngredients: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              original: { type: SchemaType.STRING },
              name: { type: SchemaType.STRING },
              amount: { type: SchemaType.NUMBER },
              unit: { type: SchemaType.STRING },
              category: { type: SchemaType.STRING },
            },
            required: ['original', 'name', 'amount', 'unit', 'category'],
          },
        },
        steps: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        notes: { type: SchemaType.STRING, nullable: true },
        protein: {
          type: SchemaType.STRING,
          enum: ['Chicken', 'Beef', 'Pork', 'Fish', 'Seafood', 'Vegetarian', 'Vegan', 'Other'],
        },
        mealType: {
          type: SchemaType.STRING,
          enum: ['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Snack', 'Dessert'],
        },
        dishType: {
          type: SchemaType.STRING,
          enum: ['Main', 'Side', 'Appetizer', 'Salad', 'Soup', 'Drink', 'Sauce'],
        },
        equipment: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        occasion: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        dietary: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        difficulty: { type: SchemaType.STRING },
        cuisine: { type: SchemaType.STRING },
      },
      required: ['title', 'ingredients', 'steps'],
    }

    const client = new GoogleGenAI({ apiKey })

    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: selectedPrompt }, userContentPart],
        },
      ],
    })

    const resultText = response.text

    if (!resultText) throw new Error('No content generated by Gemini')

    const recipeData = JSON.parse(resultText)

    // Add source info
    if (url) recipeData.sourceUrl = url
    if (image) recipeData.sourceImage = image

    return new Response(JSON.stringify(recipeData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    console.error('Parse Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to process recipe'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

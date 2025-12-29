import type { APIRoute } from 'astro'
import { Type as SchemaType } from '@google/genai'
import { load } from 'cheerio'
import { initGeminiClient, serverErrorResponse } from '../../lib/api-helpers'

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
6. **INFER** specific "Equipment" required (e.g. Air Fryer, Slow Cooker, Blender) based on the steps.
7. **INFER** any "Occasion" tags (e.g. Weeknight, Party, Holiday) based on complexity and serving style.
8. **INFER** "Dietary" attributes (e.g. Gluten-Free, Vegan, Keto) based on the ingredients.
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
9. **INFER** specific "Equipment" required (e.g. Air Fryer, Slow Cooker, Blender) based on the steps.
10. **INFER** any "Occasion" tags (e.g. Weeknight, Party, Holiday) based on complexity and serving style.
11. **INFER** "Dietary" attributes (e.g. Gluten-Free, Vegan, Keto) based on the ingredients.
12. **Normalize Ingredients**: Populate 'structuredIngredients' by parsing each ingredient into:
    - 'amount' (number)
    - 'unit' (standardized string, e.g. "cup", "tbsp", "oz", "g")
    - 'name' (ingredient name without unit)
    - 'category' (Produce, Meat, Dairy, Bakery, Frozen, Pantry, Spices, Other)
`

const JSON_LD_SYSTEM_PROMPT = `
You are an expert Chef and Data Engineer. Your task is to NORMALIZE and ENRICH the provided JSON-LD Recipe Data into our internal schema.

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
6. **ENRICH** missing metadata: Infer Occasion, Dietary tags, and Equipment from the content if they are missing.
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
  let client
  try {
    client = initGeminiClient(locals)
  } catch {
    return serverErrorResponse('Missing API Key configuration')
  }

  try {
    const { url, image } = await request.json()

    if (!url && !image) {
      return new Response(JSON.stringify({ error: 'No input provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Process input and get content for AI
    const { prompt, contentPart, sourceInfo } = url
      ? await processUrlInput(url)
      : processImageInput(image)

    const schema = createRecipeSchema()

    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }, contentPart],
        },
      ],
    })

    const resultText = response.text
    if (!resultText) throw new Error('No content generated by Gemini')

    const recipeData = JSON.parse(resultText)

    // Add source info
    if (sourceInfo.url) recipeData.sourceUrl = sourceInfo.url
    if (sourceInfo.image) recipeData.sourceImage = sourceInfo.image

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

/** Represents the processed input for the AI */
type ProcessedInput = {
  prompt: string
  contentPart: { text?: string; inlineData?: { mimeType: string; data: string } }
  sourceInfo: { url?: string; image?: string }
}

/** Processes a URL input: fetches HTML, extracts JSON-LD if available */
async function processUrlInput(url: string): Promise<ProcessedInput> {
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

  // Hybrid Strategy: Try to extract JSON-LD first
  const jsonLdData = extractJsonLd(html)

  if (jsonLdData) {
    console.log('✅ Found JSON-LD Recipe data. Using deterministic hybrid mode.')
    return {
      prompt: JSON_LD_SYSTEM_PROMPT,
      contentPart: {
        text: `Source URL: ${url}\n\nJSON-LD Data:\n${JSON.stringify(jsonLdData, null, 2)}`,
      },
      sourceInfo: { url },
    }
  }

  console.log('⚠️ No JSON-LD found. Fallback to raw HTML parsing.')
  return {
    prompt: URL_SYSTEM_PROMPT,
    contentPart: { text: `Source URL: ${url}\n\nHTML Content:\n${html}` },
    sourceInfo: { url },
  }
}

/** Processes image input: extracts base64 data and mime type */
function processImageInput(image: string): ProcessedInput {
  let base64Data = ''
  let mimeType = 'image/jpeg' // Safe default

  if (image.includes(',')) {
    base64Data = image.split(',')[1] || ''
  } else {
    base64Data = image
  }

  // Extract mimeType from data URL prefix if present
  const mimeMatch = image.match(/^data:([^;]+);base64/)
  if (mimeMatch?.[1]) {
    mimeType = mimeMatch[1]
  }

  if (!base64Data) {
    throw new Error('Invalid image data: missing base64 content')
  }

  console.log(`[parse-recipe] Image mimeType: ${mimeType}, data length: ${base64Data.length}`)

  return {
    prompt: IMAGE_SYSTEM_PROMPT,
    contentPart: {
      inlineData: {
        mimeType,
        data: base64Data,
      },
    },
    sourceInfo: { image },
  }
}

/** Creates the recipe schema for Gemini structured output */
function createRecipeSchema() {
  return {
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
}

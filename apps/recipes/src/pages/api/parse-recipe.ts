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

// Shared prompt sections for redesign features (ingredient grouping + structured steps)
const INGREDIENT_GROUPING_RULES = `
**INGREDIENT GROUPING (REQUIRED)**:
- ALWAYS organize ingredients into logical groups, even if the source has no explicit sections.
- Analyze the steps to understand how ingredients are used together.
- Common patterns:
  • "FOR THE [COMPONENT]" - Ingredients blended/mixed together early (curry paste, marinade, dressing)
  • "THE PROTEIN" - Main protein + its direct seasonings
  • "AROMATICS" or "BASE" - Onions, garlic, ginger used for sautéing
  • "TO FINISH" - Fresh herbs, citrus, garnishes added at the end
- Use SHORT, ALL-CAPS headers (2-4 words max).
- Every ingredient must belong to exactly one group.
- Order groups chronologically by when they're used in the recipe.
- Populate 'ingredientGroups' with startIndex and endIndex for each group.
`

const STRUCTURED_STEPS_RULES = `
**STRUCTURED STEPS (REQUIRED)**:
- For each instruction step, generate:
  • title: Short, action-focused name (2-4 words, e.g., "Sear the Shrimp", "Blend the Base")
  • text: The full instruction text (keep as-is from source)
  • highlightedText: The original instruction with key cooking action verbs wrapped in **bold** markdown (e.g., "**Whisk** the eggs until fluffy", "**Add** the onions and **sauté**")
  • tip: Extract any pro-tips, warnings, or "Chef's notes" embedded in the text (null if none)
- Tip extraction examples:
  • "Don't overcrowd the pan!" → tip
  • "If too thick, add water 1 tbsp at a time" → tip
  • "Pro tip: ..." → tip
- Populate 'structuredSteps' array with these objects.
`

const DISH_INFERENCE_SYSTEM_PROMPT = `
You are an expert Chef and Recipe Developer. Your task is to analyze a photograph of a finished dish and generate a plausible recipe to recreate it.

Context Provided (if available):
- Dish Name: {dishName}
- Cuisine: {cuisine}
- Known Ingredients: {knownIngredients}
- Dietary Notes: {dietaryNotes}
- Taste Profile: {tasteProfile}

Rules:
1. **Visual Analysis**: Identify visible ingredients, cooking techniques (grilled, fried, baked), and presentation style.
2. **Contextual Inference**: If a dish name or cuisine is provided, prioritize ingredients and techniques typical of that regional/cultural tradition.
3. **Ingredient Estimation**: Provide reasonable quantities based on visual proportions. Acknowledge uncertainty where the photo is ambiguous.
4. **Step Generation**: Create logical cooking instructions that would yield the visual result. Include common techniques (searing, simmering, garnishing).
5. **Metadata Inference**: Determine Protein, Meal Type, Dish Type, Equipment, and Dietary tags based on visual cues and context.
6. **Honesty**: If the image is unclear or incomplete, note this in the recipe description (e.g., "Estimated based on visual appearance").
7. **Main Protein Source**: Identify and map strictly to one of these values: ${PROTEIN_OPTIONS.join(', ')}.
8. **Normalize Ingredients**: Populate 'structuredIngredients' by parsing each ingredient into:
   - 'amount' (number)
   - 'unit' (standardized string, e.g. "cup", "tbsp", "oz", "g")
   - 'name' (ingredient name without unit)
   - 'category' (Produce, Meat, Dairy, Bakery, Frozen, Pantry, Spices, Other)
9. **Map Ingredients to Steps**: Populate 'stepIngredients' as an array of objects. Each object should have an 'indices' property containing an array of 0-based indices of ingredients (from the 'ingredients' array) that are used in the corresponding step.

${INGREDIENT_GROUPING_RULES}
${STRUCTURED_STEPS_RULES}
`

const IMAGE_SYSTEM_PROMPT = `
You are an expert Chef and Data Engineer. Your task is to extract structured recipe data from the provided image.

Return a strict JSON object matching the provided schema.

Rules:
1. Describe what you see in the image and infer the recipe (ingredients/steps) as best as possible.
2. Generate a one-sentence "description" that makes the dish sound delicious.
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
10. **Map Ingredients to Steps**: Populate 'stepIngredients' as an array of objects. Each object should have an 'indices' property containing an array of 0-based indices of ingredients (from the 'ingredients' array) that are used in the corresponding step.
${INGREDIENT_GROUPING_RULES}
${STRUCTURED_STEPS_RULES}
`

const TEXT_SYSTEM_PROMPT = `
You are an expert Chef and Data Engineer. Your task is to extract structured recipe data from the provided text content (Markdown or Plain Text).

Return a strict JSON object matching the provided schema.

Rules:
1. Parse the text content to identify the recipe title, ingredients, and instructions.
2. Generate a one-sentence "description" that makes the dish sound delicious.
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
10. **Map Ingredients to Steps**: Populate 'stepIngredients' as an array of arrays. Each inner array should contain the 0-based indices of ingredients (from the 'ingredients' array) that are used in the corresponding step.
${INGREDIENT_GROUPING_RULES}
${STRUCTURED_STEPS_RULES}
`

const URL_SYSTEM_PROMPT = `
You are an expert Chef and Data Engineer. Your task is to extract structured recipe data from the provided webpage content (HTML).

Return a strict JSON object matching the provided schema.

Rules:
1. Analyze the provided HTML content carefully.
2. Prioritize extracting data from JSON-LD structured data (Recipe schema) if present in the HTML.
3. Generate a one-sentence "description" that makes the dish sound delicious.
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
13. **Map Ingredients to Steps**: Populate 'stepIngredients' as an array of objects. Each object should have an 'indices' property containing an array of 0-based indices of ingredients (from the 'ingredients' array) that are used in the corresponding step.
${INGREDIENT_GROUPING_RULES}
${STRUCTURED_STEPS_RULES}
`

const JSON_LD_SYSTEM_PROMPT = `
You are an expert Chef and Data Engineer. Your task is to NORMALIZE and ENRICH the provided JSON-LD Recipe Data into our internal schema.

The input is already structured data from the source website. Your job is not to guess, but to:
1. Map the fields to our schema.
2. Clean up HTML tags from descriptions or steps.
3. Generate a one-sentence "description" that makes the dish sound delicious (if one is not already provided, or improve the existing one).
3. **Normalize Ingredients**: This is critical. Parse the 'recipeIngredient' strings into 'structuredIngredients':
   - 'amount' (number)
   - 'unit' (standardized string, e.g. "cup", "tbsp", "oz", "g")
   - 'name' (ingredient name without unit)
   - 'category' (Produce, Meat, Dairy, Bakery, Frozen, Pantry, Spices, Other)
4. Map "Main Protein Source" to one of: ${PROTEIN_OPTIONS.join(', ')}.
5. Infer "Meal Type", "Dish Type" based on the recipe title and context.
6. **ENRICH** missing metadata: Infer Occasion, Dietary tags, and Equipment from the content if they are missing.
7. **Map Ingredients to Steps**: Populate 'stepIngredients' as an array of objects. Each object should have an 'indices' property containing an array of 0-based indices of ingredients (from the 'ingredients' array) that are used in the corresponding step.
${INGREDIENT_GROUPING_RULES}
${STRUCTURED_STEPS_RULES}
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

interface ParseRequestBody {
  url?: string
  image?: string
  text?: string
  mode?: 'parse' | 'infer'
  dishName?: string
  cuisine?: string
  knownIngredients?: string
  dietaryNotes?: string
  tasteProfile?: string
}

/** Builds the inference prompt with user-provided context substituted */
function buildInferencePrompt(body: ParseRequestBody): string {
  return DISH_INFERENCE_SYSTEM_PROMPT.replace('{dishName}', body.dishName || 'Not provided')
    .replace('{cuisine}', body.cuisine || 'Not provided')
    .replace('{knownIngredients}', body.knownIngredients || 'Not provided')
    .replace('{dietaryNotes}', body.dietaryNotes || 'Not provided')
    .replace('{tasteProfile}', body.tasteProfile || 'Not provided')
}

export const POST: APIRoute = async ({ request, locals }) => {
  let client
  try {
    client = initGeminiClient(locals)
  } catch {
    return serverErrorResponse('Missing API Key configuration')
  }

  try {
    const body: ParseRequestBody = await request.json()
    const { url, image, text, mode = 'parse' } = body

    if (!url && !image && !text) {
      return new Response(JSON.stringify({ error: 'No input provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Process input and get content for AI
    const processedInput = await resolveInput(body)
    const { contentPart, sourceInfo } = processedInput
    let { prompt } = processedInput

    if (mode === 'infer' && image) {
      prompt = buildInferencePrompt(body)
    }

    const parts = [{ text: prompt }, contentPart]
    if (sourceInfo.image && text) {
      parts.push(processImageInput(sourceInfo.image).contentPart)
    }

    const recipeData = await generateRecipe(client, parts)

    // Add source info
    if (sourceInfo.url) recipeData.sourceUrl = sourceInfo.url
    if (sourceInfo.image) recipeData.sourceImage = sourceInfo.image

    return new Response(JSON.stringify(recipeData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('API Error:', error)
    return serverErrorResponse(error instanceof Error ? error.message : 'Internal Server Error')
  }
}

/** Resolves the different input types into a unified format for Gemini */
async function resolveInput(body: ParseRequestBody): Promise<ProcessedInput> {
  const { url, image, text } = body
  if (url) return await processUrlInput(url)
  if (text) return processTextInput(text, image)
  return processImageInput(image!)
}

/** Executes the Gemini generation call and parses the result */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateRecipe(client: any, parts: any[]): Promise<any> {
  const schema = createRecipeSchema()
  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
    contents: [{ role: 'user', parts }],
  })

  const resultText = response.text
  if (!resultText) throw new Error('No content generated by Gemini')
  return JSON.parse(resultText)
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

function processTextInput(text: string, image?: string): ProcessedInput {
  return {
    prompt: TEXT_SYSTEM_PROMPT,
    contentPart: { text: `Recipe Text Content:\n${text}` },
    sourceInfo: { image },
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

  // console.log(`[parse-recipe] Image mimeType: ${mimeType}, data length: ${base64Data.length}`)

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
      description: { type: SchemaType.STRING },
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
      stepIngredients: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            indices: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.NUMBER },
            },
          },
          required: ['indices'],
        },
      },
      ingredientGroups: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            header: { type: SchemaType.STRING },
            startIndex: { type: SchemaType.NUMBER },
            endIndex: { type: SchemaType.NUMBER },
          },
          required: ['header', 'startIndex', 'endIndex'],
        },
      },
      structuredSteps: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            title: { type: SchemaType.STRING, nullable: true },
            text: { type: SchemaType.STRING },
            highlightedText: { type: SchemaType.STRING },
            tip: { type: SchemaType.STRING, nullable: true },
          },
          required: ['text', 'highlightedText'],
        },
      },
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
    required: [
      'title',
      'ingredients',
      'steps',
      'structuredSteps',
      'ingredientGroups',
      'description',
    ],
  }
}

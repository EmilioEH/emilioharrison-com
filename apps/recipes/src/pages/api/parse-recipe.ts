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

const INGREDIENT_PARSING_RULES = `
**INGREDIENT PARSING & FORMATTING (ENHANCED MODE)**:
- **Dual Measurements**: ALWAYS provide volume (cups/tbsp) AND mass (grams/ounces) for dry goods and produce.
  - Ex: "1 cup flour" -> amount: "5 oz (140g)", name: "all-purpose flour"
  - Ex: "1 onion" -> amount: "1 medium", name: "yellow onion", prep: "finely diced (about 1.5 cups)"
- **State & Prep**: Define the PHYSICAL STATE of the ingredient BEFORE it enters the pan.
  - Ex: "Butter" -> name: "unsalted butter", prep: "cut into 1/2-inch cubes and kept chilled"
- **Specificity**: Infer specific varieties contextually.
  - Ex: "Oil" -> name: "neutral oil", prep: "such as canola, grapeseed, or peanut"
- **Divided Uses**: If used multiple times (e.g. sauce and pasta water), append ", divided" to the name/prep.
`

const INGREDIENT_GROUPING_RULES = `
**INGREDIENT GROUPING (ENHANCED MODE)**:
- **Mise-en-Place Flow**: Organize by chronology of use and component grouping.
- **Logical Sub-Headers**: Group by component (e.g., "FOR THE DUXELLES", "FOR THE BEEF", "FOR THE ASSEMBLY").
- **Chronological Ordering**: Ingredients listed in exact order they go into the pot.
- **"Plus More" Syntax**: If used for main task and finishing, use modifier so it doesn't appear twice.
  - Format: "1/2 cup parsley, minced, plus more for garnish"
- **Strict Mapping**: Every ingredient must belong to a group.
- **Populate**: 'ingredientGroups' with startIndex and endIndex for each group.
`

const STRUCTURED_STEPS_RULES = `
**STRUCTURED STEPS (ENHANCED MODE - MACRO-STEPS)**:
- **Macro-Step Architecture**: Group instructions into "Macro-Steps" based on phases of cooking (not individual actions).
  - Aim for 4-6 dense paragraphs total.
  - Phase 1: Prep/Sear (High heat)
  - Phase 2: Aromatics/Deglaze
  - Phase 3: Braise/Simmer
  - Phase 4: Finish/Texture
- **The "Until" Framework**: Every step involving heat MUST define a sensory endpoint using "until".
  - Input: "Cook for 10 minutes."
  - Output: "Cook, stirring frequently, until deep golden brown and reduced by half, about 10 minutes."
- **Heat Management Descriptors**: Use descriptive physics terms (shimmering, foaming subsides, bare simmer).
- **Troubleshooting Parentheticals**: Insert safety nets in parentheses for common failure points.
  - Ex: "(If the garlic begins to darken too quickly, remove from heat to prevent bitterness.)"
- **Scientific "Why"**: Occasionally explain the purpose of a technique (e.g., "...whisking vigorously to emulsify the fat").
- **Parallel Processing**: Organize steps to utilize downtime (e.g., "While the potatoes boil, heat the butter...").
- **The "Reserve" Pattern**: Explicitly manage flow (Cook meat -> Remove and Reserve -> Cook Veg -> Return meat).
- **Data Structure**:
  - title: Action-focused header (e.g., "Sear the Beef")
  - text: The full macro-step paragraph.
  - highlightedText: The text with key verbs in **bold**.
  - tip: Key troubleshooting or scientific note extracted.
  - substeps: Break down the macro-step into atomic actions.
- Populate 'structuredSteps' array with these objects.
`

const STEP_GROUPING_RULES = `
**STEP GROUPING (REQUIRED)**:
- **Match Ingredients**: Organize steps into logical phases that MATCH the ingredient groups.
- **Chronological**: The step groups should mirror the ingredient groups chronologically.
- **Headers**: Use SHORT, ALL-CAPS headers (2-4 words max) that describe the ACTION.
- **Populate**: 'stepGroups' with header, startIndex, and endIndex.
`

// --- STRICT TRANSCRIPTION RULES (Default) ---

const STRICT_INGREDIENT_RULES = `
**INGREDIENT PARSING (STRICT TRANSCRIPTION)**:
- **Accuracy**: Transcribe ingredients EXACTLY as they appear in the source.
- **No Conversion**: Do NOT convert units (e.g., keep "1 cup" as "1 cup", do not add grams).
- **No Inferred States**: Do NOT add prep instructions that aren't explicit (e.g., if it says "Butter", leave it as "Butter").
- **Grouping**: Only group if the source explicitly groups them. Otherwise, put all in one "MAIN" group.
`

const STRICT_STEP_RULES = `
**STEP PARSING (STRICT TRANSCRIPTION)**:
- **Accuracy**: Transcribe instructions EXACTLY as they appear.
- **Structure**: Maintain the original step breakdown. Do NOT combine into macro-steps.
- **No Embellishment**: Do NOT add "Why" or scientific explanations.
- **No Sensory Inferences**: Do NOT add "until" descriptors if they aren't in the text.
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

${INGREDIENT_PARSING_RULES}
${INGREDIENT_GROUPING_RULES}
${STRUCTURED_STEPS_RULES}
${STEP_GROUPING_RULES}
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
${INGREDIENT_PARSING_RULES}
${INGREDIENT_GROUPING_RULES}
${STRUCTURED_STEPS_RULES}
${STEP_GROUPING_RULES}
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
${INGREDIENT_PARSING_RULES}
${INGREDIENT_GROUPING_RULES}
${STRUCTURED_STEPS_RULES}
${STEP_GROUPING_RULES}
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
${INGREDIENT_PARSING_RULES}
${INGREDIENT_GROUPING_RULES}
${STRUCTURED_STEPS_RULES}
${STEP_GROUPING_RULES}
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
${INGREDIENT_PARSING_RULES}
${INGREDIENT_GROUPING_RULES}
${STRUCTURED_STEPS_RULES}
${STEP_GROUPING_RULES}
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
  style?: 'strict' | 'enhanced' // New parameter
  dishName?: string
  cuisine?: string
  knownIngredients?: string
  dietaryNotes?: string
  tasteProfile?: string
}

function getSystemPrompts(style: 'strict' | 'enhanced' = 'strict') {
  if (style === 'enhanced') {
    return `
${INGREDIENT_PARSING_RULES}
${INGREDIENT_GROUPING_RULES}
${STRUCTURED_STEPS_RULES}
${STEP_GROUPING_RULES}
    `
  }
  return `
${STRICT_INGREDIENT_RULES}
${STRICT_STEP_RULES}
  `
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
    client = await initGeminiClient(locals)
  } catch {
    return serverErrorResponse('Missing API Key configuration')
  }

  try {
    const body: ParseRequestBody = await request.json()
    const { url, image, text, mode = 'parse', style = 'strict' } = body

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

    // Inject dynamic rules based on style
    const dynamicRules = getSystemPrompts(style)
    prompt = prompt + '\n' + dynamicRules

    if (mode === 'infer' && image) {
      prompt = buildInferencePrompt(body)
    }

    const parts = [{ text: prompt }, contentPart]
    if (sourceInfo.image && text) {
      parts.push((await processImageInput(sourceInfo.image)).contentPart)
    }

    // If we have source info to add, we'll need to do it client-side or wrap the stream
    // For streaming, we just stream the JSON from Gemini.
    // The client will need to merge in the sourceUrl/sourceImage if needed.
    // Actually, we can just append the source info to the stream?
    // No, that breaks JSON syntax unless we parse on client.
    // Let's rely on client to know the source URL/Image since it sent it.

    // However, the original code added it to the object.
    // We can't easily inject it into the stream without complex buffering.
    // Recommendation: Client handles source info merging.

    const stream = await generateRecipeStream(client, parts)

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Source-Url': sourceInfo.url || '',
        'X-Source-Image': sourceInfo.image || '', // These might be too large for headers if base64.
        // Better: client keeps track of what it sent.
      },
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
  return await processImageInput(image!)
}

/** Executes the Gemini generation call and parses the result */
/** Executes the Gemini generation call and streams the result */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateRecipeStream(client: any, parts: any[]): Promise<ReadableStream> {
  const schema = createRecipeSchema()
  const result = await client.models.generateContentStream({
    model: 'gemini-2.5-flash',
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
    contents: [{ role: 'user', parts }],
  })

  const encoder = new TextEncoder()
  return new ReadableStream({
    async start(controller) {
      try {
        // The result itself is an async iterable in @google/genai
        for await (const chunk of result) {
          const text = chunk.text
          if (text) {
            controller.enqueue(encoder.encode(text))
          }
        }
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })
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
async function processImageInput(image: string): Promise<ProcessedInput> {
  let base64Data = ''
  let mimeType = 'image/jpeg' // Safe default

  // Check if likely a URL
  if (image.startsWith('http://') || image.startsWith('https://')) {
    try {
      const res = await fetch(image)
      if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`)

      const contentLength = res.headers.get('content-length')
      if (contentLength && parseInt(contentLength) > 9 * 1024 * 1024) {
        throw new Error('Image too large (>9MB). Please use a smaller image.')
      }

      const arrayBuffer = await res.arrayBuffer()
      base64Data = Buffer.from(arrayBuffer).toString('base64')
      mimeType = res.headers.get('content-type') || mimeType
    } catch (error) {
      console.warn(
        'Failed to fetch image url in processImageInput, falling back to string check',
        error,
      )
      throw new Error(
        `Failed to download image from URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  } else if (image.includes(',')) {
    base64Data = image.split(',')[1] || ''
  } else {
    base64Data = image
  }

  // Safety Check: Prevent massive payloads (Gemini has limits, Worker has memory limits)
  // 9MB limit (leaving room for base64 expansion)
  if (base64Data.length > 9 * 1024 * 1024) {
    throw new Error('Image too large (>9MB) for AI processing. Please use a smaller image.')
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
            substeps: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  text: { type: SchemaType.STRING },
                  action: { type: SchemaType.STRING },
                  targets: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                },
                required: ['text', 'action'],
              },
            },
          },
          required: ['text', 'highlightedText'],
        },
      },
      stepGroups: {
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
      'stepGroups',
      'description',
    ],
  }
}

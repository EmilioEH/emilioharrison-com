import { load } from 'cheerio'
import { Type as SchemaType } from '@google/genai'
import type { GoogleGenAI } from '@google/genai'
import { closeBalanced } from '../api-utils'
import { createTimeoutSignal } from './ai-timeout'
import { assertSafeExternalUrl } from './url-safety'
import { GEMINI_TEXT_MODEL } from './ai-model-config'

// NOTE: this module must stay free of Cloudflare/Astro/Vite-only imports (no `locals`, no
// `import.meta.glob`, no `api-helpers`/`firebase-server`). It's imported by the self-hosted VM
// worker (see BACKGROUND-JOBS-VM-PLAN.md) running in plain Node, which is why `executeAiParse`
// takes an already-constructed Gemini client rather than reaching for one via `locals`.

/** Default budget for a single Gemini call in `executeAiParse`. Safe only for in-request
 * callers (AI Refresh), where the client holds the connection open — waitUntil-bound callers
 * (background Enhancement) must override it via the `timeoutMs` parameter; see that param's
 * doc for the Cloudflare constraint. */
const GEMINI_TIMEOUT_MS = 45_000

export const PROTEIN_OPTIONS = [
  'Chicken',
  'Beef',
  'Pork',
  'Fish',
  'Seafood',
  'Vegetarian',
  'Vegan',
  'Other',
]

// --- PROMPT SEGMENTS ---

export const INGREDIENT_PARSING_RULES = `
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

export const INGREDIENT_GROUPING_RULES = `
**INGREDIENT GROUPING (ENHANCED MODE)**:
- **Mise-en-Place Flow**: Organize by chronology of use and component grouping.
- **Logical Sub-Headers**: Group by component (e.g., "FOR THE DUXELLES", "FOR THE BEEF", "FOR THE ASSEMBLY").
- **Chronological Ordering**: Ingredients listed in exact order they go into the pot.
- **"Plus More" Syntax**: If used for main task and finishing, use modifier so it doesn't appear twice.
  - Format: "1/2 cup parsley, minced, plus more for garnish"
- **Strict Mapping**: Every ingredient must belong to a group.
- **Populate**: 'ingredientGroups' with startIndex and endIndex for each group.
`

export const STRUCTURED_STEPS_RULES = `
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

export const STEP_GROUPING_RULES = `
**STEP GROUPING (REQUIRED)**:
- **Match Ingredients**: Organize steps into logical phases that MATCH the ingredient groups.
- **Chronological**: The step groups should mirror the ingredient groups chronologically.
- **Headers**: Use SHORT, ALL-CAPS headers (2-4 words max) that describe the ACTION.
- **Populate**: 'stepGroups' with header, startIndex, and endIndex.
`

export const STRICT_INGREDIENT_RULES = `
**INGREDIENT PARSING (STRICT TRANSCRIPTION)**:
- **Accuracy**: Transcribe ingredients EXACTLY as they appear in the source.
- **No Conversion**: Do NOT convert units (e.g., keep "1 cup" as "1 cup", do not add grams).
- **No Inferred States**: Do NOT add prep instructions that aren't explicit (e.g., if it says "Butter", leave it as "Butter").
- **Grouping**: Only group if the source explicitly groups them. Otherwise, put all in one "MAIN" group.
`

export const STRICT_STEP_RULES = `
**STEP PARSING (STRICT TRANSCRIPTION)**:
- **Accuracy**: Transcribe instructions EXACTLY as they appear.
- **Structure**: Maintain the original step breakdown. Do NOT combine into macro-steps.
- **No Embellishment**: Do NOT add "Why" or scientific explanations.
- **No Sensory Inferences**: Do NOT add "until" descriptors if they aren't in the text.
`

// --- SYSTEM PROMPTS ---

export const IMAGE_SYSTEM_PROMPT = `
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

export const TEXT_SYSTEM_PROMPT = `
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
10. **Map Ingredients to Steps**: Populate 'stepIngredients' as an array of objects. Each object should have an 'indices' property containing an array of 0-based indices of ingredients (from the 'ingredients' array) that are used in the corresponding step.
${INGREDIENT_PARSING_RULES}
${INGREDIENT_GROUPING_RULES}
${STRUCTURED_STEPS_RULES}
${STEP_GROUPING_RULES}
`

export const URL_SYSTEM_PROMPT = `
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

export const JSON_LD_SYSTEM_PROMPT = `
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

// --- HELPERS ---

/**
 * Extracts JSON-LD Recipe data from HTML
 */
export function extractJsonLd(html: string): unknown | null {
  try {
    const $ = load(html)
    const scripts = $('script[type="application/ld+json"]')

    for (const script of scripts) {
      try {
        const textContent = $(script).html() || ''
        const json = JSON.parse(textContent)
        const items = Array.isArray(json) ? json : json['@graph'] || [json]

        const recipe = items.find((item: unknown) => {
          if (typeof item === 'object' && item !== null && '@type' in item) {
            const type = (item as { '@type': string | string[] })['@type']
            return type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))
          }
          return false
        })

        if (recipe) return recipe
      } catch (e) {
        console.warn('Failed to parse a JSON-LD script', e)
      }
    }
  } catch (parseError) {
    console.warn('Cheerio parsing failed', parseError)
  }
  return null
}

/**
 * Strips scripts, styles, and other non-content markup from a page's raw HTML before it's sent
 * to the model as the recipe source (used when no JSON-LD `Recipe` data was found). Cuts token
 * usage substantially — inline scripts/styles/tracking pixels routinely make up the bulk of a
 * modern page's byte count — without discarding the semantic structure (headings, lists) the
 * model relies on to tell ingredients from instructions, unlike a plain-text conversion.
 */
export function stripHtmlForPrompt(html: string): string {
  const $ = load(html)
  const title = $('title').first().text().trim()

  $('script, style, noscript, svg, iframe, link, meta, template, head').remove()
  $('*')
    .contents()
    .each((_, node) => {
      if (node.type === 'comment') $(node).remove()
    })

  const bodyHtml = ($('body').html() || $.root().html() || '').trim()
  return title ? `<title>${title}</title>\n${bodyHtml}` : bodyHtml
}

export type ParseParams = {
  url?: string
  image?: string
  text?: string
  style?: 'strict' | 'enhanced'
}

export type ProcessedInput = {
  prompt: string
  contentPart: { text?: string; inlineData?: { mimeType: string; data: string } }
  sourceInfo: {
    url?: string
    image?: string
    candidateImages?: Array<{ url: string; alt?: string; isDefault?: boolean }>
  }
}

/**
 * Resolves input with hybrid URL strategy
 */
async function extractRedditContent(url: string): Promise<ProcessedInput> {
  try {
    assertSafeExternalUrl(url)

    // 1. Resolve URL (handle redirects like /s/ shortlinks)
    const headRes = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
    })
    const finalUrl = headRes.url

    // 2. Construct JSON URL
    const cleanUrl = finalUrl.split('?')[0]
    let jsonUrl = cleanUrl
    if (jsonUrl.endsWith('/')) jsonUrl = jsonUrl.slice(0, -1)
    if (!jsonUrl.endsWith('.json')) jsonUrl += '.json'

    // Re-check after following redirects — a redirect chain could otherwise be used to land
    // the second fetch on an internal host even though the original URL was safe.
    assertSafeExternalUrl(jsonUrl)

    // 3. Fetch JSON
    const res = await fetch(jsonUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
    })

    if (!res.ok) throw new Error(`Failed to fetch Reddit JSON (${res.status})`)

    const json = await res.json()
    const textParts: string[] = []
    let combinedHtmlForImages = ''

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processItem = (item: any) => {
      const data = item?.data
      if (!data) return
      if (data.title) textParts.push(`Title: ${data.title}`)
      if (data.selftext) textParts.push(`Post Content: ${data.selftext}`)
      if (data.body) textParts.push(`Comment Content: ${data.body}`)

      if (data.selftext_html) {
        const $ = load(data.selftext_html)
        combinedHtmlForImages += $.text() // Decode entities
      }
      if (data.body_html) {
        const $ = load(data.body_html)
        combinedHtmlForImages += $.text() // Decode entities
      }

      // Capture main post image/link or thumbnail
      if (data.url && /\.(jpg|jpeg|png|webp|avif)(\?.*)?$/i.test(data.url)) {
        combinedHtmlForImages += `<img src="${data.url}" />`
      }
      if (data.thumbnail && data.thumbnail.startsWith('http')) {
        combinedHtmlForImages += `<img src="${data.thumbnail}" />`
      }
    }

    if (Array.isArray(json)) {
      // [0] Post, [1] Comments
      if (json[0]?.data?.children?.[0]) {
        processItem(json[0].data.children[0])
      }
      // Target specific comment or top 3 comments
      const comments = json[1]?.data?.children || []
      for (const comment of comments.slice(0, 3)) {
        processItem(comment)
      }
    }

    // 4. Extract Images
    const { extractImagesFromHtml } = await import('./extract-images')
    const candidateImages = await extractImagesFromHtml(combinedHtmlForImages, finalUrl)

    return {
      prompt: TEXT_SYSTEM_PROMPT,
      contentPart: {
        text: `Source URL: ${finalUrl}\n\nReddit Content:\n${textParts.join('\n\n')}`,
      },
      sourceInfo: { url: finalUrl, candidateImages },
    }
  } catch (error) {
    console.warn('Reddit extraction failed, falling back to standard fetch:', error)
    // Fallback handled by caller if needed, or just throw
    throw error
  }
}

export async function resolveInput(params: ParseParams, origin?: string): Promise<ProcessedInput> {
  const { url, image, text } = params

  if (url) {
    if (url.includes('reddit.com') || url.includes('redd.it')) {
      return await extractRedditContent(url)
    }

    if (!url.startsWith('http')) throw new Error('Invalid URL')
    assertSafeExternalUrl(url)
    const siteRes = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
    })
    if (!siteRes.ok) {
      // Detect blocked/bot-protected responses
      const blockedStatuses = [403, 429, 503]
      if (blockedStatuses.includes(siteRes.status)) {
        throw new Error(`BLOCKED:${siteRes.status}`)
      }
      throw new Error(`Failed to fetch URL (${siteRes.status}: ${siteRes.statusText})`)
    }
    const html = await siteRes.text()
    const jsonLdData = extractJsonLd(html)

    // Extract candidate images from HTML
    const { extractImagesFromHtml } = await import('./extract-images')
    const candidateImages = await extractImagesFromHtml(html, url)

    if (jsonLdData) {
      return {
        prompt: JSON_LD_SYSTEM_PROMPT,
        contentPart: {
          text: `Source URL: ${url}\n\nJSON-LD Data:\n${JSON.stringify(jsonLdData, null, 2)}`,
        },
        sourceInfo: { url, candidateImages },
      }
    }

    return {
      prompt: URL_SYSTEM_PROMPT,
      contentPart: { text: `Source URL: ${url}\n\nHTML Content:\n${stripHtmlForPrompt(html)}` },
      sourceInfo: { url, candidateImages },
    }
  }

  if (text) {
    return {
      prompt: TEXT_SYSTEM_PROMPT,
      contentPart: { text: `Recipe Text Content:\n${text}` },
      sourceInfo: { image },
    }
  }

  if (image) {
    return await processImageInput(image, origin)
  }

  throw new Error('No input provided')
}

async function processImageInput(image: string, origin?: string): Promise<ProcessedInput> {
  let base64Data = ''
  let mimeType = 'image/jpeg'
  let resolvedImage = image

  if (image.startsWith('/') || image.startsWith('api/')) {
    // Same-origin relative path (e.g. `sourceImage` saved from an earlier upload — see
    // uploads/index.ts, which returns a relative `/api/uploads/<key>` URL). Resolve it to an
    // absolute URL using the current request's origin so AI Refresh/Enhancement can re-fetch
    // the original photo. Without an origin (e.g. called from a context that has none), this
    // can't be resolved — fail clearly rather than silently switching to a different input.
    if (!origin) {
      throw new Error('Invalid image data: received a URL path instead of image bytes')
    }
    resolvedImage = new URL(image, origin).toString()
  }

  if (resolvedImage.startsWith('http')) {
    assertSafeExternalUrl(resolvedImage)
    const res = await fetch(resolvedImage)
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`)
    const arrayBuffer = await res.arrayBuffer()
    base64Data = Buffer.from(arrayBuffer).toString('base64')
    mimeType = res.headers.get('content-type') || mimeType
  } else if (resolvedImage.includes(',')) {
    base64Data = resolvedImage.split(',')[1] || ''
  } else {
    base64Data = resolvedImage
  }

  if (base64Data.length > 9 * 1024 * 1024) {
    throw new Error('Image too large (>9MB)')
  }

  const mimeMatch = image.match(/^data:([^;]+);base64/)
  if (mimeMatch?.[1]) mimeType = mimeMatch[1]

  if (!base64Data) throw new Error('Invalid image data')

  return {
    prompt: IMAGE_SYSTEM_PROMPT,
    contentPart: { inlineData: { mimeType, data: base64Data } },
    sourceInfo: { image },
  }
}

export function getSystemPrompts(style: 'strict' | 'enhanced' = 'strict') {
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

/**
 * Canonical response shape for `executeAiParse`'s Gemini calls (AI Refresh / Enhancement —
 * both always run in 'enhanced' style, see recipe-enhancement-job.ts / refresh.ts). Passed as
 * `responseSchema` so Gemini's structured-output mode enforces field names/types itself, the
 * same way generate-grocery-list.ts already constrains its own response — previously this call
 * only set `responseMimeType`, relying entirely on prompt wording (which drifts) plus
 * downstream repair/validation (tryRepairJson, mergeAiRecipeUpdate) to catch shape problems
 * after the fact.
 */
const RECIPE_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    description: { type: SchemaType.STRING },
    servings: { type: SchemaType.NUMBER },
    prepTime: { type: SchemaType.NUMBER },
    cookTime: { type: SchemaType.NUMBER },
    protein: { type: SchemaType.STRING },
    mealType: { type: SchemaType.STRING },
    dishType: { type: SchemaType.STRING },
    cuisine: { type: SchemaType.STRING },
    difficulty: { type: SchemaType.STRING },
    equipment: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    occasion: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    dietary: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    ingredients: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          amount: { type: SchemaType.STRING },
          prep: { type: SchemaType.STRING },
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
          title: { type: SchemaType.STRING },
          text: { type: SchemaType.STRING },
          highlightedText: { type: SchemaType.STRING },
          tip: { type: SchemaType.STRING },
        },
        required: ['text'],
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
    stepIngredients: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          indices: { type: SchemaType.ARRAY, items: { type: SchemaType.NUMBER } },
        },
        required: ['indices'],
      },
    },
  },
}

// --- CORE SERVICE FUNCTIONS ---

/**
 * High-level function to parse/enhance a recipe via Gemini.
 * Used by AI Refresh (/recipes/[id]/refresh) and background enhancement (/recipes/[id]/enhance).
 * The initial photo-scan flow (/api/parse-recipe) uses OpenRouter instead — see that file.
 */

export async function executeAiParse(
  /** An already-constructed Gemini client. Cloudflare callers build it via
   * `initGeminiClient(locals)`; the VM worker builds it from `process.env` — see the module
   * note at the top of this file. */
  gemini: GoogleGenAI,
  params: ParseParams,
  origin?: string,
  /** External abort signal (e.g. the incoming request being cancelled) — combined with an
   * internal timeout so a hung Gemini call can never block a request or background job forever. */
  externalSignal?: AbortSignal,
  /** Overrides the default 45s call budget. Callers running under `ctx.waitUntil` MUST pass a
   * value that lets the timeout fire — and their error-status write land — inside Cloudflare's
   * ~30s post-response waitUntil cap (see recipe-enhancement-job.ts); the default is only safe
   * for in-request callers like refresh.ts, where the client holds the connection open. */
  timeoutMs: number = GEMINI_TIMEOUT_MS,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const client = gemini
  const { style = 'strict' } = params
  const { signal, cleanup } = createTimeoutSignal(timeoutMs, externalSignal)

  const processedInput = await resolveInput(params, origin)
  const { contentPart } = processedInput
  let { prompt } = processedInput

  const dynamicRules = getSystemPrompts(style)
  prompt = prompt + '\n' + dynamicRules

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
    { text: prompt },
  ]

  // CRITICAL: for text/URL/JSON-LD sources, `contentPart.text` IS the recipe content (the
  // page HTML, JSON-LD, or pasted text) — omitting it here previously meant the model was
  // asked to "extract a recipe" from nothing but the instructions, and fabricated one
  // wholesale. Always forward whichever content the source actually produced.
  if (contentPart && typeof contentPart === 'object') {
    if ('inlineData' in contentPart && contentPart.inlineData) {
      parts.push({ inlineData: contentPart.inlineData as { mimeType: string; data: string } })
    } else if ('text' in contentPart && contentPart.text) {
      parts.push({ text: contentPart.text })
    }
  }

  try {
    const response = await client.models.generateContent({
      // Model lives in ai-model-config.ts — a single source of truth shared with grocery-core.ts.
      // See that file for the cost/quality rationale and how to bump to a full-flash tier if
      // enhancement quality needs it.
      model: GEMINI_TEXT_MODEL,
      config: {
        responseMimeType: 'application/json',
        responseSchema: RECIPE_RESPONSE_SCHEMA,
        abortSignal: signal,
        // Flash models enable dynamic "thinking" by default, which can add tens of seconds of
        // latency before output starts — enough to blow the tight budget background Enhancement
        // runs under (see timeoutMs above). The response schema and the detailed style prompts do
        // the shaping here; disable thinking for consistent, fast responses.
        thinkingConfig: { thinkingBudget: 0 },
      },
      contents: [{ role: 'user', parts }],
    })

    const text = response.text
    if (!text) throw new Error('No content generated by AI')

    try {
      return JSON.parse(text)
    } catch {
      const result = tryRepairJson(text)
      if (result !== undefined) return result
      throw new Error('The AI response was incomplete. Please try again.')
    }
  } finally {
    cleanup()
  }
}

/**
 * Attempts to repair a malformed JSON string from Gemini.
 * Handles: markdown code fences, control chars, trailing commas,
 * unbalanced quotes/braces/brackets, and progressive truncation.
 */
export function tryRepairJson(text: string): unknown | undefined {
  if (!text || text.trim().length === 0) {
    return undefined
  }

  // Strip markdown code fences (```json ... ```)
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```$/, '')
  }

  if (!cleaned) {
    return undefined
  }

  // Replace control characters that break JSON.parse.
  // \n, \r, \t are handled above; strip remaining Cc category chars.
  // Uses Unicode property escape to avoid ESLint no-control-regex.
  cleaned = cleaned
    .replace(/\r/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/\p{Cc}/gu, ' ')

  // Remove trailing commas before closing brackets/braces
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1')

  try {
    return JSON.parse(cleaned)
  } catch {
    // Fall through to deeper repair
  }

  // Balance quotes
  const quoteCount = (cleaned.match(/"/g) || []).length
  let repaired = quoteCount % 2 !== 0 ? cleaned + '"' : cleaned

  // Balance braces and brackets in correct LIFO order
  repaired = closeBalanced(repaired)

  try {
    return JSON.parse(repaired)
  } catch {
    // Fall through to progressive truncation
  }

  // Progressive truncation — try shorter valid prefixes
  for (let end = repaired.lastIndexOf('}'); end > 0; end = repaired.lastIndexOf('}', end - 1)) {
    try {
      return JSON.parse(repaired.slice(0, end + 1))
    } catch {
      continue
    }
  }

  for (let end = repaired.lastIndexOf(']'); end > 0; end = repaired.lastIndexOf(']', end - 1)) {
    try {
      return JSON.parse(repaired.slice(0, end + 1))
    } catch {
      continue
    }
  }

  return undefined
}

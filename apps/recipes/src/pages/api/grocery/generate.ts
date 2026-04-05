import type { APIRoute } from 'astro'
import { formatRecipesForPrompt } from '../../../lib/api-utils'
import { Type as SchemaType } from '@google/genai'
import { initGeminiClient, serverErrorResponse } from '../../../lib/api-helpers'
import { db } from '../../../lib/firebase-server'
import type {
  GroceryList,
  RecurringGroceryItem,
  ShoppableIngredient,
  ProductOverride,
} from '../../../lib/types'
import { filterDueRecurringItems, mergeRecurringIntoIngredients } from '../../../lib/grocery-utils'

const BATCH_SIZE = 5

interface GroceryIngredient {
  name: string
  purchaseAmount: number
  purchaseUnit: string
  category: string
  aisle?: number // H-E-B aisle number (undefined for perimeter departments)
  sources: {
    recipeId: string
    recipeTitle: string
    originalAmount: string
  }[]
}

const SYSTEM_PROMPT = `
You are an expert Grocery Shopping Assistant helping someone prepare a shopping list for H-E-B grocery store.

**YOUR CRITICAL TASK:**
Convert ALL recipe ingredients into STORE-PURCHASABLE units. Think about what you ACTUALLY BUY at a grocery store.

**INPUT FORMAT:**
Each ingredient line has [RECIPE_ID:xxx] [RECIPE_TITLE:xxx] tags for source tracking.

**MANDATORY CONVERSION RULES - ALWAYS APPLY THESE:**

PRODUCE - Convert to whole items:
- Any amount of garlic (cloves, minced, chopped) → "X heads" (10 cloves = 1 head, round UP)
- Any amount of lemon/lime JUICE (tbsp, squeeze, wedges) → "X lemons" or "X limes" (3 tbsp juice = 1 fruit)
- Lemon/lime wedges or zest → count as whole fruits
- Onion amounts (diced, chopped, sliced, cups) → "X onions" (1 cup diced = 1 onion)
- Fresh herb amounts (tbsp, sprigs, leaves, cups) → "X bunches" (1 bunch covers most recipe needs)
- Ginger amounts → "X pieces" or "1 hand ginger"
- Broccoli florets, crowns → "X heads broccoli"
- Bell pepper pieces → "X bell peppers" (any fraction = 1 whole)
- Scallions/green onions → "X bunches"
- Celery stalks → "X bunches celery"
- Carrots → count or "X bags" for many
- Potatoes → count or "X lbs"
- Mushrooms → "X packages" or "X oz"

DAIRY & EGGS:
- Butter tbsp/cups → "X sticks" (1 stick = 8 tbsp = 1/2 cup)
- Eggs → individual count (user decides on dozen)
- Milk/cream amounts → "X cups" or "X pints/quarts"
- Cheese amounts → "X oz" or "X cups shredded"

PANTRY:
- Broth/stock cups → "X cartons" (1 carton = 4 cups) or "X cans" (1 can = 2 cups)
- Tomato paste tbsp → "X cans" (1 small can = 6 tbsp)
- Canned goods → count as cans
- Coconut milk → "X cans" (1 can = ~14oz)

MEAT & SEAFOOD:
- Keep in pounds or ounces
- Aggregate across recipes

OMIT ENTIRELY:
- Salt, pepper, cooking oil, olive oil, vegetable oil
- Water
- Ice

**CRITICAL: NEVER OUTPUT THESE UNITS - ALWAYS CONVERT:**
- "tbsp" of any fresh produce → convert to whole items
- "squeeze" → convert to whole fruit
- "wedges" → convert to whole fruit
- "cloves" → convert to heads
- "florets" → convert to heads/crowns
- "diced/chopped/sliced" → convert to whole items
- "minced" → convert to whole items
- "cups" of cut vegetables → convert to whole items

**AGGREGATION:**
First combine all amounts of the same ingredient, THEN convert to store units.

**SOURCE TRACKING:**
Include ALL recipe IDs and titles that contributed, with their ORIGINAL recipe amounts.

**CATEGORY ASSIGNMENT (H-E-B Store Layout):**
Assign each item to ONE of these 19 categories (in store walking-path order):
1. Produce - Fresh fruits, vegetables, herbs (perimeter)
2. Seafood - Fresh fish, shellfish, shrimp (perimeter)
3. Meat - Beef, pork, chicken, ground meat (perimeter)
4. Deli & Prepared - Deli meats, rotisserie, prepared foods (perimeter)
5. Bakery & Bread - Fresh bread, tortillas, bakery items (perimeter + aisle 4)
6. Beer & Wine - Alcoholic beverages (aisles 1-3)
7. Pantry & Condiments - Pasta, rice, sauces, oils, vinegars (aisles 4-5)
8. Canned & Dry Goods - Canned vegetables, beans, broth, tomatoes (aisle 6)
9. Baking & Spices - Flour, sugar, spices, extracts, baking supplies (aisle 7)
10. Breakfast & Cereal - Cereal, oatmeal, syrup, peanut butter, honey (aisle 8)
11. Snacks - Chips, crackers, nuts, dried fruit (aisles 9-10)
12. Beverages - Soda, juice, coffee, tea (aisles 11-12)
13. Paper & Household - Paper towels, foil, plastic wrap, cleaning (aisles 25-28)
14. Pet - Pet food and supplies (aisles 29-30)
15. Baby - Baby food, diapers, formula (aisle 31)
16. Personal Care - Shampoo, soap, dental, razors (aisles 32-35)
17. Health & Pharmacy - Vitamins, medicine, first aid (aisles 36-38)
18. Dairy & Eggs - Milk, cheese, yogurt, eggs, butter (perimeter)
19. Frozen Foods - Frozen vegetables, ice cream, frozen meals (perimeter)

**AISLE ASSIGNMENT:**
For items in numbered-aisle categories, include the specific aisle number if known:
- Pantry items: aisles 4-5
- Canned goods: aisle 6
- Baking/spices: aisle 7
- Breakfast: aisle 8
- Snacks: aisles 9-10
- Beverages: aisles 11-12
Leave aisle undefined for perimeter departments (Produce, Meat, Seafood, Deli, Dairy, Frozen).

**OUTPUT FORMAT:**
{
  "name": "limes",
  "purchaseAmount": 3,
  "purchaseUnit": "whole",
  "category": "Produce",
  "sources": [
    { "recipeId": "abc", "recipeTitle": "Fish Tacos", "originalAmount": "2 tbsp lime juice" },
    { "recipeId": "xyz", "recipeTitle": "Guacamole", "originalAmount": "squeeze of lime" }
  ]
}

{
  "name": "chicken broth",
  "purchaseAmount": 2,
  "purchaseUnit": "cartons",
  "category": "Canned & Dry Goods",
  "aisle": 6,
  "sources": [
    { "recipeId": "abc", "recipeTitle": "Chicken Soup", "originalAmount": "6 cups broth" }
  ]
}
`

const SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    ingredients: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          purchaseAmount: { type: SchemaType.NUMBER },
          purchaseUnit: { type: SchemaType.STRING },
          category: { type: SchemaType.STRING },
          aisle: { type: SchemaType.NUMBER }, // Optional: H-E-B aisle number for interior items
          sources: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                recipeId: { type: SchemaType.STRING },
                recipeTitle: { type: SchemaType.STRING },
                originalAmount: { type: SchemaType.STRING },
              },
              required: ['recipeId', 'recipeTitle', 'originalAmount'],
            },
          },
        },
        required: ['name', 'purchaseAmount', 'purchaseUnit', 'category', 'sources'],
      },
    },
  },
  required: ['ingredients'],
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processBatch(client: any, recipes: any[]): Promise<GroceryIngredient[]> {
  const inputList = formatRecipesForPrompt(recipes)

  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [{ text: SYSTEM_PROMPT }, { text: `Recipes to Process:\n${inputList}` }],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: SCHEMA,
    },
  })

  // Access text property directly (getter)
  const resultText = response.text
  if (!resultText) throw new Error('No content generated')

  const parsed = JSON.parse(resultText)
  return parsed.ingredients || []
}

function getIngredientKey(ingredient: GroceryIngredient): string {
  return `${ingredient.name.toLowerCase().trim()}_${ingredient.purchaseUnit.toLowerCase().trim()}`
}

function getSafeSourcesArray(ingredient: GroceryIngredient): GroceryIngredient['sources'] {
  return Array.isArray(ingredient.sources) ? ingredient.sources : []
}

function mergeSourcesIntoExisting(
  existing: GroceryIngredient,
  newSources: GroceryIngredient['sources'],
): void {
  const existingSources = existing.sources ?? []
  for (const src of newSources) {
    const isDuplicate = !src.recipeId || existingSources.some((s) => s.recipeId === src.recipeId)
    if (!isDuplicate) {
      existingSources.push(src)
    }
  }
  existing.sources = existingSources
}

function mergeIngredients(batches: GroceryIngredient[][]): GroceryIngredient[] {
  const ingredientMap = new Map<string, GroceryIngredient>()

  for (const batch of batches) {
    for (const ingredient of batch) {
      const key = getIngredientKey(ingredient)
      const sources = getSafeSourcesArray(ingredient)
      const existing = ingredientMap.get(key)

      if (existing) {
        existing.purchaseAmount += ingredient.purchaseAmount
        mergeSourcesIntoExisting(existing, sources)
      } else {
        ingredientMap.set(key, {
          ...ingredient,
          sources: sources.map((s) => ({ ...s })),
        })
      }
    }
  }

  return Array.from(ingredientMap.values())
}

function processStructuredIngredient(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ing: any,
  recipeId: string,
  recipeTitle: string,
  sourceMap: Map<string, GroceryIngredient['sources']>,
): void {
  const normalizedName = ing.name?.toLowerCase().trim()
  if (!normalizedName) return

  const source = {
    recipeId,
    recipeTitle,
    originalAmount: `${ing.amount || ''} ${ing.unit || ''} ${ing.name}`.trim(),
  }
  addToSourceMap(sourceMap, normalizedName, source)
}

function processBasicIngredient(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ing: any,
  recipeId: string,
  recipeTitle: string,
  sourceMap: Map<string, GroceryIngredient['sources']>,
): void {
  const normalizedName = ing.name?.toLowerCase().trim()
  if (!normalizedName) return

  const source = {
    recipeId,
    recipeTitle,
    originalAmount: ing.amount ? `${ing.amount} ${ing.name}` : ing.name,
  }
  addToSourceMap(sourceMap, normalizedName, source)
}

/**
 * Build a map of normalized ingredient names to their recipe sources.
 * Used as a fallback when AI doesn't return proper source attribution.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildSourceMap(recipes: any[]): Map<string, GroceryIngredient['sources']> {
  const sourceMap = new Map<string, GroceryIngredient['sources']>()

  for (const recipe of recipes) {
    const { id: recipeId, title: recipeTitle } = recipe

    const structuredIngredients = recipe.structuredIngredients
    if (Array.isArray(structuredIngredients)) {
      structuredIngredients.forEach((ing) =>
        processStructuredIngredient(ing, recipeId, recipeTitle, sourceMap),
      )
    }

    const basicIngredients = recipe.ingredients
    if (Array.isArray(basicIngredients)) {
      basicIngredients.forEach((ing) =>
        processBasicIngredient(ing, recipeId, recipeTitle, sourceMap),
      )
    }
  }

  return sourceMap
}

function addToSourceMap(
  map: Map<string, GroceryIngredient['sources']>,
  name: string,
  source: GroceryIngredient['sources'][0],
) {
  const existing = map.get(name)
  if (existing) {
    // Avoid duplicate sources from same recipe
    if (!existing.some((s) => s.recipeId === source.recipeId)) {
      existing.push(source)
    }
  } else {
    map.set(name, [source])
  }
}

/**
 * Extract base words from an ingredient name for matching.
 * Removes common modifiers, units, and prep terms.
 */
function extractBaseWords(name: string): Set<string> {
  const normalized = name.toLowerCase().trim()
  // Split on spaces, commas, and common separators
  const words = normalized.split(/[\s,]+/).filter((w) => w.length > 0)

  // Common words to ignore in matching
  const stopWords = new Set([
    'fresh',
    'dried',
    'minced',
    'chopped',
    'diced',
    'sliced',
    'whole',
    'ground',
    'crushed',
    'large',
    'small',
    'medium',
    'cloves',
    'clove',
    'cups',
    'cup',
    'tbsp',
    'tsp',
    'oz',
    'lb',
    'pound',
    'tablespoon',
    'teaspoon',
    'of',
    'the',
    'a',
    'an',
    'for',
    'to',
  ])

  return new Set(words.filter((w) => !stopWords.has(w) && w.length > 2))
}

/**
 * Check if two ingredient names match based on shared base words.
 */
function ingredientNamesMatch(name1: string, name2: string): boolean {
  const words1 = extractBaseWords(name1)
  const words2 = extractBaseWords(name2)

  // Check for any shared words
  for (const word of words1) {
    if (words2.has(word)) return true
    // Also check if word is a substring of any word in the other set
    for (const otherWord of words2) {
      if (word.includes(otherWord) || otherWord.includes(word)) return true
    }
  }
  return false
}

/**
 * Try to find matching sources for an ingredient name using word-based fuzzy matching.
 * Handles cases where AI normalizes names differently (e.g., "garlic cloves" → "garlic").
 */
function findMatchingSources(
  ingredientName: string,
  sourceMap: Map<string, GroceryIngredient['sources']>,
): GroceryIngredient['sources'] {
  const normalizedName = ingredientName.toLowerCase().trim()

  // Exact match first
  if (sourceMap.has(normalizedName)) {
    return sourceMap.get(normalizedName)!
  }

  // Word-based fuzzy matching
  const matches: GroceryIngredient['sources'] = []
  for (const [key, sources] of sourceMap.entries()) {
    if (ingredientNamesMatch(normalizedName, key)) {
      for (const src of sources) {
        if (!matches.some((m) => m.recipeId === src.recipeId)) {
          matches.push(src)
        }
      }
    }
  }

  return matches
}

/**
 * Deterministically assign sources to ingredients based on recipe data.
 * Ignores AI-provided sources entirely - we track sources ourselves from the original recipes.
 */
function assignSourcesDeterministically(
  ingredients: GroceryIngredient[],
  sourceMap: Map<string, GroceryIngredient['sources']>,
): GroceryIngredient[] {
  return ingredients.map((ingredient) => {
    // Always use recipe-derived sources, ignore whatever AI returned
    const sources = findMatchingSources(ingredient.name, sourceMap)

    if (sources.length === 0) {
      console.warn(`[Source Assignment] No matching recipes found for "${ingredient.name}"`)
    }

    return {
      ...ingredient,
      sources,
    }
  })
}

export const POST: APIRoute = async ({ request, locals }) => {
  const { weekStartDate, recipes, userId } = await request.json()

  if (!weekStartDate || !recipes || !userId) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const listId = `${userId}_${weekStartDate}`

  // 1. Initial Processing State
  const initialList: GroceryList = {
    id: listId,
    userId,
    weekStartDate,
    ingredients: [],
    status: 'processing',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  try {
    // 2. Respond immediately (Fire and forget from client perspective)
    // We can't actually fire-and-forget in serverless easily without a queue,
    // but in this constrained env we'll start the promise and return.
    // NOTE: In standard Astro API routes (Lambda-like), returning might kill the process.
    // However, given the "enhance" precedent which appeared to await, we should check if we can await here
    // or if we rely on the client not awaiting the result?
    // The previous implementation for enhance awaited the result.
    // Background tasks in serverless usually need a queue.
    // For this implementation, we will await the result but the CLIENT won't block on UI.
    // The previous prompt said "fire-and-forget from UI perspective", which means the client initiates and doesn't wait for "complete".

    // Create/Update the document immediately to "processing"
    await db.setDocument('grocery_lists', listId, initialList)

    // Start background processing (async without await if platform allows, otherwise we must await)
    // To ensure reliability in this environment, we will await the generation loop but return 202 Accepted if possible?
    // No, standard `fetch` awaits the response.
    // STRATEGY: We will actually perform the work in this request, but the CLIENT will treat it as a background job
    // by not showing a loading spinner for the whole page. The client "triggers" it and then polls Firestore/listens.

    let client
    try {
      client = await initGeminiClient(locals)
    } catch {
      await db.updateDocument('grocery_lists', listId, {
        status: 'error',
        updatedAt: new Date().toISOString(),
      })
      return serverErrorResponse('Missing API Key')
    }

    // Split recipes into batches
    const batches = []
    for (let i = 0; i < recipes.length; i += BATCH_SIZE) {
      batches.push(recipes.slice(i, i + BATCH_SIZE))
    }

    console.log(`[Background] Processing grocery list ${listId} in ${batches.length} batches`)

    // Build source map from original recipes
    const sourceMap = buildSourceMap(recipes)
    console.log(
      `[SourceMap] Built map with ${sourceMap.size} ingredient keys from ${recipes.length} recipes`,
    )
    // Log a few entries
    const mapEntries = Array.from(sourceMap.entries()).slice(0, 5)
    for (const [key, sources] of mapEntries) {
      console.log(`  - "${key}": ${sources.length} sources`)
    }

    // Process all batches
    const results = await Promise.all(batches.map((batch) => processBatch(client, batch)))
    const mergedIngredients = mergeIngredients(results)

    // Ensure all ingredients have source attribution from recipe data
    let finalIngredients: ShoppableIngredient[] = assignSourcesDeterministically(
      mergedIngredients,
      sourceMap,
    )

    // Inject recurring items
    try {
      const recurringCollectionPath = `recurring_grocery_items/${userId}/items`
      const recurringItems = await db.getCollection<RecurringGroceryItem>(recurringCollectionPath)

      if (recurringItems.length > 0) {
        console.log(`[Grocery] Found ${recurringItems.length} recurring items for user ${userId}`)

        const { dueItems, itemsToUpdate } = filterDueRecurringItems(recurringItems, weekStartDate)
        console.log(`[Grocery] ${dueItems.length} recurring items are due this week`)

        if (dueItems.length > 0) {
          // Merge recurring items into ingredient list
          finalIngredients = mergeRecurringIntoIngredients(finalIngredients, dueItems)

          // Update lastAddedWeek for injected items (batch write)
          const updatePromises = itemsToUpdate.map((item) =>
            db.updateDocument(recurringCollectionPath, item.id, {
              lastAddedWeek: weekStartDate,
            }),
          )
          await Promise.all(updatePromises)
          console.log(`[Grocery] Updated lastAddedWeek for ${itemsToUpdate.length} recurring items`)
        }
      }
    } catch (recurringError) {
      // Don't fail the whole operation if recurring items fail
      console.error('[Grocery] Failed to inject recurring items:', recurringError)
    }

    // Apply user product overrides (persistent metadata corrections)
    try {
      const overridesPath = `product_overrides/${userId}/items`
      const overrides = await db.getCollection<ProductOverride>(overridesPath)

      if (overrides.length > 0) {
        console.log(`[Grocery] Applying ${overrides.length} product overrides`)
        const overrideMap = new Map(overrides.map((o) => [o.name.toLowerCase().trim(), o]))

        for (const ing of finalIngredients) {
          const override = overrideMap.get(ing.name.toLowerCase().trim())
          if (override) {
            if (override.hebPrice !== undefined) ing.hebPrice = override.hebPrice
            if (override.hebPriceUnit) ing.hebPriceUnit = override.hebPriceUnit
            if (override.category) ing.category = override.category
            if (override.aisle !== undefined) ing.aisle = override.aisle
            if (override.imageUrl) ing.imageUrl = override.imageUrl
            if (override.hebProductId) ing.hebProductId = override.hebProductId
            if (override.hebProductUrl) ing.hebProductUrl = override.hebProductUrl
            if (override.hebSize) ing.hebSize = override.hebSize
            if (override.storeLocation) ing.storeLocation = override.storeLocation
            if (override.hebUnitPrice !== undefined) ing.hebUnitPrice = override.hebUnitPrice
            if (override.hebUnitPriceUnit) ing.hebUnitPriceUnit = override.hebUnitPriceUnit
          }
        }
      }
    } catch (overrideError) {
      console.error('[Grocery] Failed to apply product overrides:', overrideError)
    }

    // Normalize ingredients to ensure all have sources array
    const normalizedIngredients = finalIngredients.map((ing) => ({
      ...ing,
      sources: ing.sources ?? [],
    }))

    // Debug: Log what we're saving
    console.log(`[Grocery] Saving ${normalizedIngredients.length} ingredients`)
    for (const ing of normalizedIngredients.slice(0, 3)) {
      console.log(
        `  - ${ing.name}: ${ing.sources.length} sources`,
        ing.sources.map((s) => s.recipeTitle),
      )
    }

    // Update to completion
    await db.updateDocument('grocery_lists', listId, {
      status: 'complete',
      ingredients: normalizedIngredients,
      updatedAt: new Date().toISOString(),
    })

    return new Response(JSON.stringify({ success: true, listId }), {
      status: 200, // OK
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Grocery Generation Error:', error)
    // Try to update status to error
    await db.updateDocument('grocery_lists', listId, {
      status: 'error',
      updatedAt: new Date().toISOString(),
    })

    const message = error instanceof Error ? error.message : 'Failed to generate list'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

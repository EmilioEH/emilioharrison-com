import type { APIRoute } from 'astro'
import { formatRecipesForPrompt } from '../../../lib/api-utils'
import { Type as SchemaType } from '@google/genai'
import { initGeminiClient, serverErrorResponse } from '../../../lib/api-helpers'
import { db } from '../../../lib/firebase-server'
import type { GroceryList } from '../../../lib/types'

const BATCH_SIZE = 5

interface GroceryIngredient {
  name: string
  purchaseAmount: number
  purchaseUnit: string
  category: string
  sources: {
    recipeId: string
    recipeTitle: string
    originalAmount: string
  }[]
}

const SYSTEM_PROMPT = `
You are an expert Grocery Shopping Assistant helping someone prepare a shopping list.

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

function mergeIngredients(batches: GroceryIngredient[][]): GroceryIngredient[] {
  const ingredientMap = new Map<string, GroceryIngredient>()

  for (const batch of batches) {
    for (const ingredient of batch) {
      // Normalize name for grouping
      const key = `${ingredient.name.toLowerCase().trim()}_${ingredient.purchaseUnit.toLowerCase().trim()}`

      if (ingredientMap.has(key)) {
        const existing = ingredientMap.get(key)!
        existing.purchaseAmount += ingredient.purchaseAmount
        existing.sources.push(...ingredient.sources)
      } else {
        ingredientMap.set(key, { ...ingredient })
      }
    }
  }

  return Array.from(ingredientMap.values())
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

    // Process all batches
    const results = await Promise.all(batches.map((batch) => processBatch(client, batch)))
    const combinedIngredients = mergeIngredients(results)

    // Update to completion
    await db.updateDocument('grocery_lists', listId, {
      status: 'complete',
      ingredients: combinedIngredients,
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

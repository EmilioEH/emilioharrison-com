import type { APIRoute, APIContext } from 'astro'
import { formatRecipesForPrompt } from '../../lib/api-utils'
import { Type as SchemaType } from '@google/genai'
import {
  initGeminiClient,
  getGroceryScopeId,
  serverErrorResponse,
  unauthorizedResponse,
  badRequestResponse,
} from '../../lib/api-helpers'
import { tryRepairJson } from '../../lib/services/ai-parser'
import { createTimeoutSignal } from '../../lib/services/ai-timeout'
import {
  detectAllNewGroceryStages,
  extractGeminiChunkText,
} from '../../lib/services/grocery-progress'
import { rateLimit } from '../../lib/rate-limit'
import { db } from '../../lib/firebase-server'
import type { GroceryList, Recipe } from '../../lib/types'

const GEMINI_TIMEOUT_MS = 60_000
const GROCERY_RATE_LIMIT = 15
const GROCERY_RATE_WINDOW_SECONDS = 60 * 60

const SYSTEM_PROMPT = `
You are an expert Grocery Shopping Assistant helping someone prepare a grocery shopping list.

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

**CATEGORY ASSIGNMENT:**
Assign each item to ONE of these 8 categories (in store-walk order):
1. Produce - Fresh fruits, vegetables, herbs
2. Meat - Beef, pork, chicken, seafood, deli
3. Dairy - Milk, cheese, yogurt, eggs, butter
4. Bakery - Fresh bread, tortillas, bakery items
5. Frozen - Frozen vegetables, ice cream, frozen meals
6. Pantry - Pasta, rice, sauces, oils, canned goods, broth, snacks, cereal
7. Spices - Flour, sugar, spices, extracts, baking supplies
8. Other - Everything else (beverages, household, etc.)

**OUTPUT FORMAT:**
{
  "ingredients": [
    {
      "name": "limes",
      "purchaseAmount": 3,
      "purchaseUnit": "whole",
      "category": "Produce",
      "sources": [
        { "recipeId": "abc", "recipeTitle": "Fish Tacos", "originalAmount": "2 tbsp lime juice" },
        { "recipeId": "xyz", "recipeTitle": "Guacamole", "originalAmount": "squeeze of lime" }
      ]
    },
    {
      "name": "chicken broth",
      "purchaseAmount": 2,
      "purchaseUnit": "cartons",
      "category": "Pantry",
      "sources": [
        { "recipeId": "abc", "recipeTitle": "Chicken Soup", "originalAmount": "6 cups broth" }
      ]
    }
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

/**
 * Runs the Gemini generation to completion and persists the result (including progress and
 * failure) directly to Firestore. Never throws — safe to hand to `ctx.waitUntil()`.
 *
 * Previously the client read this stream directly and wrote the final result to Firestore
 * itself; if the tab was backgrounded or closed mid-generation, the AI call had already been
 * paid for but the list was lost. Persisting server-side means the client only ever needs to
 * watch its existing Firestore subscription (`grocery_lists/{listId}`) — which already exists
 * for exactly this — regardless of what happens to the original request.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runGroceryGenerationJob(client: any, recipes: Recipe[], listId: string) {
  const { signal, cleanup } = createTimeoutSignal(GEMINI_TIMEOUT_MS)

  try {
    const inputList = formatRecipesForPrompt(recipes)

    const streamResponse = await client.models.generateContentStream({
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
        abortSignal: signal,
      },
    })

    let result = ''
    const foundStages = new Set<string>()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for await (const chunk of streamResponse as AsyncIterable<any>) {
      const text = extractGeminiChunkText(chunk)
      if (!text) continue
      result += text

      for (const update of detectAllNewGroceryStages(result, foundStages)) {
        try {
          await db.updateDocument('grocery_lists', listId, {
            progress: update.progress,
            message: update.message,
            updatedAt: new Date().toISOString(),
          })
        } catch (writeError) {
          console.warn('[Grocery] Failed to persist progress update:', writeError)
        }
      }
    }

    let data
    try {
      data = JSON.parse(result)
    } catch {
      const repaired = tryRepairJson(result)
      if (repaired === undefined) throw new Error('AI response was incomplete')
      data = repaired as { ingredients?: unknown }
    }

    if (!data?.ingredients) throw new Error('No ingredients generated')

    await db.updateDocument('grocery_lists', listId, {
      ingredients: data.ingredients,
      status: 'complete',
      progress: 100,
      message: 'Done!',
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Grocery] Generation failed:', error)
    try {
      await db.updateDocument('grocery_lists', listId, {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: new Date().toISOString(),
      })
    } catch (writeError) {
      console.error('[Grocery] Failed to persist error status:', writeError)
    }
  } finally {
    cleanup()
  }
}

export const POST: APIRoute = async (context: APIContext) => {
  const { request, locals, cookies } = context

  const scope = await getGroceryScopeId(cookies)
  if (!scope) return unauthorizedResponse()

  let client
  try {
    client = await initGeminiClient(locals)
  } catch {
    return serverErrorResponse('Missing API Key')
  }

  const { recipes, weekStartDate } = await request.json()

  if (!recipes || recipes.length === 0) {
    return new Response(JSON.stringify({ success: true, ingredients: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!weekStartDate || typeof weekStartDate !== 'string') {
    return badRequestResponse('weekStartDate is required')
  }

  const kv = locals?.runtime?.env?.SESSION
  const { limited } = await rateLimit(
    kv,
    `grocery:${scope.userId}`,
    GROCERY_RATE_LIMIT,
    GROCERY_RATE_WINDOW_SECONDS,
  )
  if (limited) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const listId = `${scope.scopeId}_${weekStartDate}`
  const now = new Date().toISOString()

  try {
    // Initialize the doc as 'processing' immediately — before the AI call — so the client's
    // existing Firestore subscription reflects generation starting even if this request's
    // connection is later dropped.
    await db.setDocument('grocery_lists', listId, {
      id: listId,
      userId: scope.userId,
      ...(scope.familyId ? { familyId: scope.familyId } : {}),
      weekStartDate,
      ingredients: [],
      status: 'processing',
      progress: 0,
      message: 'Analyzing recipes...',
      createdAt: now,
      updatedAt: now,
    } satisfies GroceryList)
  } catch (error) {
    console.error('[Grocery] Failed to initialize list document:', error)
    return serverErrorResponse('Failed to start generation')
  }

  const job = runGroceryGenerationJob(client, recipes as Recipe[], listId)
  const ctx = locals?.runtime?.ctx
  if (ctx?.waitUntil) {
    ctx.waitUntil(job)
  } else {
    // No Workers `ctx` available (e.g. local dev without the Cloudflare runtime proxy).
    await job
  }

  return new Response(JSON.stringify({ success: true, listId, status: 'processing' }), {
    status: 202,
    headers: { 'Content-Type': 'application/json' },
  })
}

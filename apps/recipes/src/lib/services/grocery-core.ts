import type { GoogleGenAI } from '@google/genai'
import { Type as SchemaType } from '@google/genai'
import { formatRecipesForPrompt } from '../api-utils'
import { tryRepairJson } from './ai-parser'
import { createTimeoutSignal } from './ai-timeout'
import { GEMINI_TEXT_MODEL } from './ai-model-config'
import {
  detectAllNewGroceryStages,
  extractGeminiChunkText,
  type GroceryProgressUpdate,
} from './grocery-progress'
import type { Recipe } from '../types'

// Provider-agnostic core of grocery-list generation. Free of Cloudflare/Astro/Firestore imports
// so both the Cloudflare orchestrator (api/generate-grocery-list.ts) and the self-hosted VM
// worker can call it — see BACKGROUND-JOBS-VM-PLAN.md. It takes an already-built Gemini client,
// streams the generation, reports progress via a callback, and *returns* the ingredients (or
// throws). Persisting to Firestore is the caller's job (REST client on Cloudflare,
// firebase-admin on the VM).

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

// A schema-valid `{"ingredients": []}` is a legitimate model response, not a thrown error — so
// on its own it silently looks like success even when the input clearly had things to buy
// (confirmed live: same prompt, same data, empty output some of the time, non-empty most of the
// time — genuine sampling variance, not a truncation/timeout/data bug). One retry with a fresh
// attempt is cheap insurance against that variance; only exercised when the input actually had
// ingredients to work with, so it never fires on a legitimately empty week.
const MAX_ATTEMPTS = 2

function recipesHaveIngredients(recipes: Recipe[]): boolean {
  return recipes.some(
    (r) =>
      (Array.isArray(r.structuredIngredients) && r.structuredIngredients.length > 0) ||
      (Array.isArray(r.ingredients) && r.ingredients.length > 0),
  )
}

/** Runs a single Gemini call and returns its parsed `ingredients` array (or throws on a
 * malformed/incomplete response). Broken out of `computeGroceryList` so each retry attempt gets
 * its own timeout budget rather than sharing one across attempts. */
async function runGroceryGenerationAttempt(
  gemini: GoogleGenAI,
  inputList: string,
  opts: {
    timeoutMs: number
    onProgress?: (update: GroceryProgressUpdate) => void | Promise<void>
    externalSignal?: AbortSignal
  },
): Promise<unknown[]> {
  const { signal, cleanup } = createTimeoutSignal(opts.timeoutMs, opts.externalSignal)

  try {
    const streamResponse = await gemini.models.generateContentStream({
      model: GEMINI_TEXT_MODEL,
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
        // Flash models enable dynamic "thinking" by default, which can add tens of seconds of
        // latency before output starts. Unit conversion/aggregation is mechanical — the schema
        // and prompt do the shaping — so disable thinking entirely.
        thinkingConfig: { thinkingBudget: 0 },
      },
    })

    let result = ''
    const foundStages = new Set<string>()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for await (const chunk of streamResponse as AsyncIterable<any>) {
      const text = extractGeminiChunkText(chunk)
      if (!text) continue
      result += text

      if (opts.onProgress) {
        for (const update of detectAllNewGroceryStages(result, foundStages)) {
          await opts.onProgress(update)
        }
      }
    }

    let data: { ingredients?: unknown }
    try {
      data = JSON.parse(result)
    } catch {
      const repaired = tryRepairJson(result)
      if (repaired === undefined) throw new Error('AI response was incomplete')
      data = repaired as { ingredients?: unknown }
    }

    if (!Array.isArray(data?.ingredients)) throw new Error('No ingredients generated')
    return data.ingredients
  } finally {
    cleanup()
  }
}

/**
 * Runs the Gemini grocery generation to completion and returns the `ingredients` array. Reports
 * each newly-detected category stage via `onProgress` as the stream arrives (the caller persists
 * those). Throws on an incomplete/malformed result, or on a result that's empty despite non-empty
 * input surviving every retry — the caller maps either to a persisted `error`, never a silent
 * "complete, 0 items."
 *
 * `timeoutMs` bounds each individual attempt; Cloudflare passes a tight (waitUntil-safe) budget,
 * the VM worker passes a generous one. `externalSignal` (unused today; reserved) can cancel early.
 */
export async function computeGroceryList(
  gemini: GoogleGenAI,
  recipes: Recipe[],
  opts: {
    timeoutMs: number
    onProgress?: (update: GroceryProgressUpdate) => void | Promise<void>
    externalSignal?: AbortSignal
  },
): Promise<unknown[]> {
  const inputList = formatRecipesForPrompt(recipes)
  const expectsOutput = recipesHaveIngredients(recipes)
  const maxAttempts = expectsOutput ? MAX_ATTEMPTS : 1

  let lastResult: unknown[] = []
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    lastResult = await runGroceryGenerationAttempt(gemini, inputList, opts)
    if (lastResult.length > 0 || !expectsOutput) return lastResult
  }

  if (expectsOutput && lastResult.length === 0) {
    throw new Error(
      `Gemini returned an empty ingredient list ${maxAttempts} time(s) in a row despite ` +
        `${recipes.length} recipe(s) with real ingredients — treating as a failure rather than ` +
        `a legitimately empty list.`,
    )
  }

  return lastResult
}

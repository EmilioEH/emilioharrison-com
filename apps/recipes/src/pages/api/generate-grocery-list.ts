import type { APIRoute, APIContext } from 'astro'
import type { GoogleGenAI } from '@google/genai'
import {
  initGeminiClient,
  getGroceryScopeId,
  serverErrorResponse,
  unauthorizedResponse,
  badRequestResponse,
} from '../../lib/api-helpers'
import { computeGroceryList } from '../../lib/services/grocery-core'
import { groceryListSignature, mergeGroceryIngredients } from '../../lib/grocery-signature'
import { scaleRecipe } from '../../lib/servings-scale'
import { rateLimit } from '../../lib/rate-limit'
import { logAiError } from '../../lib/services/ai-error-log'
import { db } from '../../lib/firebase-server'
import { isBackgroundWorkerEnabled } from '../../lib/env'
import { getAllowedCreatorIds, isRecipeAccessible } from '../../lib/recipe-access'
import type { GroceryList, Recipe, ShoppableIngredient, FamilyRecipeData } from '../../lib/types'

// HARD PLATFORM CONSTRAINT: this job runs under `ctx.waitUntil`, and Cloudflare Workers cancels
// waitUntil work ~30 seconds after the response is sent — silently, without running catch/finally.
// The previous 60s budget here could never be reached: any generation crossing ~30s was killed
// mid-flight, the error-status write never ran, and the Firestore doc stayed 'processing'
// forever (surfacing to the user as a "Generation Timed Out" state that retry couldn't clear,
// because every retry died the same way). The timeout must fire — and the error write must
// land — comfortably inside that 30s window.
const GEMINI_TIMEOUT_MS = 25_000
const GROCERY_RATE_LIMIT = 15
const GROCERY_RATE_WINDOW_SECONDS = 60 * 60

/**
 * Cloudflare orchestrator: runs the shared grocery generation core and persists progress + the
 * final result (or failure) to Firestore via the REST `db`. Never throws — safe to hand to
 * `ctx.waitUntil()`.
 *
 * The AI logic itself lives in grocery-core.ts (shared with the self-hosted VM worker — see
 * BACKGROUND-JOBS-VM-PLAN.md); this wrapper owns the Cloudflare-specific half: the Firestore
 * writes and the tight `GEMINI_TIMEOUT_MS` budget the waitUntil ceiling requires. The client
 * only ever watches its Firestore subscription on `grocery_lists/{listId}`, so it doesn't matter
 * that the original request may be gone by the time this finishes.
 */
async function runGroceryGenerationJob(
  gemini: GoogleGenAI,
  recipes: Recipe[],
  listId: string,
  sourceRecipeIds: string[],
) {
  try {
    const generated = await computeGroceryList(gemini, recipes, {
      timeoutMs: GEMINI_TIMEOUT_MS,
      onProgress: async (update) => {
        try {
          await db.updateDocument('grocery_lists', listId, {
            progress: update.progress,
            message: update.message,
            updatedAt: new Date().toISOString(),
          })
        } catch (writeError) {
          console.warn('[Grocery] Failed to persist progress update:', writeError)
        }
      },
    })

    // Re-read rather than trusting a snapshot taken before the AI call: the cook may well have
    // ticked things off or added an item while this was running, and those edits go straight to
    // this same document via api/grocery/items.ts.
    const existing = await db.getDocument<GroceryList>('grocery_lists', listId)
    // `generated` is typed `unknown[]` by the core — the model's output, shaped by the response
    // schema but not validated element-wise. It is written to the doc as ingredients either way.
    const ingredients = mergeGroceryIngredients(
      existing?.ingredients,
      generated as ShoppableIngredient[],
    )

    await db.updateDocument('grocery_lists', listId, {
      ingredients,
      sourceRecipeIds,
      status: 'complete',
      progress: 100,
      message: 'Done!',
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Grocery] Generation failed:', error)
    logAiError('grocery', error, { context: { listId, recipeCount: String(recipes.length) } })
    try {
      await db.updateDocument('grocery_lists', listId, {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: new Date().toISOString(),
      })
    } catch (writeError) {
      console.error('[Grocery] Failed to persist error status:', writeError)
    }
  }
}

/**
 * Each recipe as it will actually be cooked this week.
 *
 * The count lives on the family's plan entry (`weekPlan.servings`), so this is one read per recipe
 * against the collection the endpoint is already authorised for. A recipe with no chosen count —
 * which is nearly all of them — comes back untouched, and `servingsById` only carries the ones
 * that were changed, so the week's signature is unaffected until someone actually picks a number.
 *
 * Failing to read the plan is not worth failing the list over: the recipes go through as written,
 * which is what the app did before servings existed.
 */
async function scaleRecipesToWeekPlan(
  recipes: Recipe[],
  familyId: string | undefined,
): Promise<{ recipes: Recipe[]; servingsById: Record<string, number | undefined> }> {
  if (!familyId) return { recipes, servingsById: {} }

  const servingsById: Record<string, number | undefined> = {}
  const scaled = await Promise.all(
    recipes.map(async (recipe) => {
      try {
        const plan = await db.getDocument<FamilyRecipeData>(
          `families/${familyId}/recipeData`,
          recipe.id,
        )
        const wanted = plan?.weekPlan?.servings
        if (typeof wanted !== 'number') return recipe
        servingsById[recipe.id] = wanted
        return scaleRecipe(recipe, wanted)
      } catch (error) {
        console.warn('[Grocery] Could not read week servings for', recipe.id, error)
        return recipe
      }
    }),
  )

  return { recipes: scaled, servingsById }
}

export const POST: APIRoute = async (context: APIContext) => {
  const { request, locals, cookies } = context

  const scope = await getGroceryScopeId(cookies)
  if (!scope) return unauthorizedResponse()

  const { recipeIds, weekStartDate } = await request.json()

  if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
    return new Response(JSON.stringify({ success: true, ingredients: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!weekStartDate || typeof weekStartDate !== 'string') {
    return badRequestResponse('weekStartDate is required')
  }

  // Server-authoritative fetch: the client tells us *which* recipes are in the week, but never
  // supplies their contents. This is the fix for a real incident — a stale/thin client-side
  // snapshot (e.g. mid-import, or a slimmed list-view projection) silently produced empty
  // grocery lists with no error, because the old contract trusted whatever ingredient data the
  // browser happened to have in memory at click-time. Re-fetching here, gated by the same
  // per-recipe authorization every other recipe-by-id endpoint uses, means the server always
  // works from the current, complete, canonical document.
  const allowedCreators = await getAllowedCreatorIds(scope.userId)
  const fetchedRecipes = await Promise.all(
    (recipeIds as unknown[])
      .filter((id): id is string => typeof id === 'string')
      .map((id) => db.getDocument<Recipe>('recipes', id)),
  )
  const recipes = fetchedRecipes.filter(
    (r): r is Recipe => r !== null && isRecipeAccessible(r, allowedCreators),
  )

  if (recipes.length === 0) {
    return new Response(JSON.stringify({ success: true, ingredients: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // How many people each recipe is being cooked for this week, read off the family's plan rather
  // than sent by the client. That is the same rule as the recipes themselves: the client says
  // *which*, the server reads *what* — the contract that exists because a previous version
  // trusted client-side recipe data and silently produced empty grocery lists.
  //
  // A recipe with no chosen count is left exactly as written, so this is a no-op for every list
  // where nobody has touched the servings.
  const scoped = await scaleRecipesToWeekPlan(recipes, scope.familyId)

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

  // The signature is taken from what the client asked for, not from what survived the access
  // filter above — the client compares against this same set, so anything else guarantees a
  // permanent mismatch and a list that regenerates on every open.
  const sourceRecipeIds = groceryListSignature(
    (recipeIds as string[]).map((id) => ({ id, servings: scoped.servingsById[id] })),
  )

  // Does a list already exist for this week? If so its status/progress get *updated*, leaving the
  // previous ingredients (and the cook's ticks, deletions and hand-added items) on screen and
  // intact while the new one is generated. The old code wrote a fresh document with
  // `ingredients: []` here, which threw all of that away before the AI had even been called —
  // and if generation then failed, it was gone for nothing.
  const existing = await db.getDocument<GroceryList>('grocery_lists', listId)

  // Cutover path: hand the job to the self-hosted VM worker instead of running it under
  // Cloudflare's ~30s waitUntil ceiling (see BACKGROUND-JOBS-VM-PLAN.md). Write the doc as
  // `pending` — the state the worker's Firestore listener claims on — and stash the request's
  // recipes as `inputRecipes` so the async worker (which never sees this request) can generate
  // from them. No Gemini call happens here in this path.
  if (isBackgroundWorkerEnabled(context)) {
    try {
      if (existing) {
        await db.updateDocument('grocery_lists', listId, {
          status: 'pending',
          progress: 0,
          message: 'Waiting for worker...',
          updatedAt: now,
          inputRecipes: scoped.recipes,
          inputRecipeIds: sourceRecipeIds,
        })
      } else {
        await db.setDocument('grocery_lists', listId, {
          id: listId,
          userId: scope.userId,
          ...(scope.familyId ? { familyId: scope.familyId } : {}),
          weekStartDate,
          ingredients: [],
          status: 'pending',
          progress: 0,
          message: 'Waiting for worker...',
          createdAt: now,
          updatedAt: now,
          inputRecipes: scoped.recipes,
          inputRecipeIds: sourceRecipeIds,
        } satisfies GroceryList)
      }
    } catch (error) {
      console.error('[Grocery] Failed to enqueue list document:', error)
      return serverErrorResponse('Failed to start generation')
    }

    return new Response(JSON.stringify({ success: true, listId, status: 'pending' }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Legacy in-request path: run under Cloudflare waitUntil with the tight budget.
  let client
  try {
    client = await initGeminiClient(locals)
  } catch {
    return serverErrorResponse('Missing API Key')
  }

  try {
    // Initialize the doc as 'processing' immediately — before the AI call — so the client's
    // existing Firestore subscription reflects generation starting even if this request's
    // connection is later dropped. On an existing list this is an *update*: the previous
    // ingredients stay on screen and survive a failed generation.
    if (existing) {
      await db.updateDocument('grocery_lists', listId, {
        status: 'processing',
        progress: 0,
        message: 'Analyzing recipes...',
        updatedAt: now,
      })
    } else {
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
    }
  } catch (error) {
    console.error('[Grocery] Failed to initialize list document:', error)
    return serverErrorResponse('Failed to start generation')
  }

  const job = runGroceryGenerationJob(client, scoped.recipes, listId, sourceRecipeIds)
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

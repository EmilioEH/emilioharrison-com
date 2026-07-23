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
import { rateLimit } from '../../lib/rate-limit'
import { logAiError } from '../../lib/services/ai-error-log'
import { db } from '../../lib/firebase-server'
import { isBackgroundWorkerEnabled } from '../../lib/env'
import { getAllowedCreatorIds, isRecipeAccessible } from '../../lib/recipe-access'
import type { GroceryList, Recipe } from '../../lib/types'

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
async function runGroceryGenerationJob(gemini: GoogleGenAI, recipes: Recipe[], listId: string) {
  try {
    const ingredients = await computeGroceryList(gemini, recipes, {
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

    await db.updateDocument('grocery_lists', listId, {
      ingredients,
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

  // Cutover path: hand the job to the self-hosted VM worker instead of running it under
  // Cloudflare's ~30s waitUntil ceiling (see BACKGROUND-JOBS-VM-PLAN.md). Write the doc as
  // `pending` — the state the worker's Firestore listener claims on — and stash the request's
  // recipes as `inputRecipes` so the async worker (which never sees this request) can generate
  // from them. No Gemini call happens here in this path.
  if (isBackgroundWorkerEnabled(context)) {
    try {
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
        inputRecipes: recipes,
      } satisfies GroceryList)
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

  const job = runGroceryGenerationJob(client, recipes, listId)
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

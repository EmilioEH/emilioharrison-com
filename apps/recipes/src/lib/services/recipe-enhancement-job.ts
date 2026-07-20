import { db } from '../firebase-server'
import { initGeminiClient } from '../api-helpers'
import { computeEnhancedRecipe } from './enhancement-core'
import { logAiError } from './ai-error-log'
import { UnusableAiResultError } from './recipe-merge'
import type { Recipe } from '../types'

export type EnhancementJobResult =
  | { success: true; recipe: Recipe }
  | { success: false; error: string; status: number }

// The Cloudflare-side orchestrator. The provider-agnostic compute lives in enhancement-core.ts
// (shared with the self-hosted VM worker — see BACKGROUND-JOBS-VM-PLAN.md); this file owns the
// Cloudflare-specific half: building the Gemini client from `locals`, persisting status to
// Firestore via the REST `db`, and the waitUntil budget below.
//
// This job is handed to `ctx.waitUntil` (see recipes/index.ts), and Cloudflare Workers cancels
// waitUntil work ~30 seconds after the response is sent — silently, without running catch
// blocks. The Gemini call budget must therefore fire early enough that the error-status write
// below still lands inside that window; the core's default (executeAiParse's 45s) would instead
// let the runtime kill this job mid-call, leaving enhancementStatus stuck at 'processing'
// forever. (Once the VM worker owns this job — Phase 3 of the plan — this cap goes away, since a
// real Node process has no waitUntil ceiling.)
const WAITUNTIL_SAFE_TIMEOUT_MS = 25_000

/**
 * Runs the "Kenji-style" total reparse (background Enhancement after a fresh AI import, or a
 * manual AI Refresh) and persists the result — including failure — directly to Firestore.
 *
 * This never throws: every outcome (success, an unusable AI result, or an upstream failure) is
 * written to `recipe.enhancementStatus`/`enhancementError` and returned as a result object, so
 * it's safe to hand this promise to `ctx.waitUntil()` without an unhandled rejection, and safe
 * to `await` directly from an HTTP handler that wants to map the result to a response.
 */
export async function runEnhancementJob(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  locals: any,
  recipe: Recipe,
  origin: string,
  signal?: AbortSignal,
): Promise<EnhancementJobResult> {
  const recipeId = recipe.id

  try {
    await db.updateDocument('recipes', recipeId, { enhancementStatus: 'processing' })
  } catch (e) {
    console.error('[Enhance] Failed to mark processing:', e)
  }

  try {
    const gemini = await initGeminiClient(locals)
    const updatedRecipe = await computeEnhancedRecipe(gemini, recipe, origin, {
      signal,
      timeoutMs: WAITUNTIL_SAFE_TIMEOUT_MS,
    })

    await db.updateDocument('recipes', recipeId, updatedRecipe)

    return { success: true, recipe: updatedRecipe }
  } catch (error: unknown) {
    const isUnusable = error instanceof UnusableAiResultError
    const message = error instanceof Error ? error.message : 'Failed to enhance recipe'
    console.error('[Enhance] Error:', message)
    let source = 'text'
    if (recipe.sourceUrl) source = 'url'
    else if (recipe.sourceImage) source = 'image'
    logAiError('enhancement', error, { context: { recipeId, source } })

    try {
      await db.updateDocument('recipes', recipeId, {
        enhancementStatus: 'error',
        enhancementError: message,
      })
    } catch (writeError) {
      console.error('[Enhance] Failed to persist error status:', writeError)
    }

    return { success: false, error: message, status: isUnusable ? 422 : 500 }
  }
}

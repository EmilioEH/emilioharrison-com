import type { GoogleGenAI } from '@google/genai'
import type { Recipe } from '../../../apps/recipes/src/lib/types'

export type { Recipe }
export type { GoogleGenAI }

/**
 * The Firestore operations the jobs need, as an interface so the orchestration in jobs.ts can be
 * unit-tested against an in-memory fake — the real implementation (firestore-store.ts) wraps
 * firebase-admin with transactional claims.
 *
 * "Claim" is transactional: it flips a `pending` doc to `processing` and returns its payload only
 * if it was still `pending` at read time, so two workers (or a retrying listener) can't both run
 * the same job. A `null` return means someone/something else already claimed it — skip.
 */
export interface WorkerStore {
  // --- Enhancement (top-level `recipes` docs; queue field: `enhancementStatus`) ---
  claimEnhancement(recipeId: string): Promise<Recipe | null>
  completeEnhancement(recipeId: string, updated: Recipe): Promise<void>
  failEnhancement(recipeId: string, message: string): Promise<void>

  // --- Grocery (`grocery_lists` docs; queue field: `status`) ---
  /** Returns the input recipes stored on the pending doc (`inputRecipes`), or null if not
   * claimable. The Cloudflare cutover writes `inputRecipes` onto the pending doc since the async
   * worker — unlike the original request — doesn't otherwise have them. */
  claimGrocery(listId: string): Promise<Recipe[] | null>
  writeGroceryProgress(listId: string, progress: number, message: string): Promise<void>
  completeGrocery(listId: string, ingredients: unknown[]): Promise<void>
  failGrocery(listId: string, message: string): Promise<void>

  // --- Reaper: flip docs stuck in `processing` past the deadline to `error`. Returns count. ---
  reapStuckEnhancements(deadlineMs: number, now: number): Promise<number>
  reapStuckGrocery(deadlineMs: number, now: number): Promise<number>
}

/** Matches `computeEnhancedRecipe` in apps/recipes/.../enhancement-core.ts. Injected so jobs.ts
 * needn't import the app's module graph (index.ts passes the real one; tests pass a fake). */
export type ComputeEnhanced = (
  gemini: GoogleGenAI,
  recipe: Recipe,
  origin: string,
  opts: { signal?: AbortSignal; timeoutMs?: number },
) => Promise<Recipe>

/** Matches `computeGroceryList` in apps/recipes/.../grocery-core.ts. */
export type ComputeGrocery = (
  gemini: GoogleGenAI,
  recipes: Recipe[],
  opts: {
    timeoutMs: number
    onProgress?: (update: { progress: number; message: string }) => void | Promise<void>
    externalSignal?: AbortSignal
  },
) => Promise<unknown[]>

/** Outcome of attempting one job — used only for logging/metrics; never throws to the caller. */
export type JobOutcome = 'done' | 'skipped' | 'failed'

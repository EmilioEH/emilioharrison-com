import type {
  GoogleGenAI,
  WorkerStore,
  ComputeEnhanced,
  ComputeGrocery,
  JobOutcome,
} from './types'

/**
 * Runs one background Enhancement job end-to-end for a recipe id: claim it, run the shared
 * compute core, and persist the result — or a loud `error` status — back to Firestore. Never
 * throws (the listener loop must survive one bad job), and returns the outcome for logging.
 *
 * Mirrors the Cloudflare orchestrator (recipe-enhancement-job.ts), but with no waitUntil budget:
 * the injected `jobTimeoutMs` is generous because a real Node process has no ~30s ceiling.
 */
export async function runEnhancementForDoc(
  deps: {
    store: WorkerStore
    gemini: GoogleGenAI
    origin: string
    jobTimeoutMs: number
    computeEnhanced: ComputeEnhanced
  },
  recipeId: string,
): Promise<JobOutcome> {
  const recipe = await deps.store.claimEnhancement(recipeId).catch((e) => {
    console.error(`[worker] claimEnhancement(${recipeId}) failed:`, e)
    return null
  })
  if (!recipe) return 'skipped'

  try {
    const updated = await deps.computeEnhanced(deps.gemini, recipe, deps.origin, {
      timeoutMs: deps.jobTimeoutMs,
    })
    await deps.store.completeEnhancement(recipeId, updated)
    console.log(`[worker] enhancement complete: ${recipeId}`)
    return 'done'
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to enhance recipe'
    console.error(`[worker] enhancement failed: ${recipeId} — ${message}`)
    await deps.store
      .failEnhancement(recipeId, message)
      .catch((e) => console.error(`[worker] failEnhancement(${recipeId}) write failed:`, e))
    return 'failed'
  }
}

/**
 * Runs one grocery-generation job end-to-end for a `grocery_lists` doc id. Same shape as the
 * enhancement job; progress updates stream to Firestore via the store so the client's existing
 * subscription shows granular status.
 */
export async function runGroceryForDoc(
  deps: {
    store: WorkerStore
    gemini: GoogleGenAI
    jobTimeoutMs: number
    computeGrocery: ComputeGrocery
  },
  listId: string,
): Promise<JobOutcome> {
  const recipes = await deps.store.claimGrocery(listId).catch((e) => {
    console.error(`[worker] claimGrocery(${listId}) failed:`, e)
    return null
  })
  if (!recipes) return 'skipped'

  try {
    const ingredients = await deps.computeGrocery(deps.gemini, recipes, {
      timeoutMs: deps.jobTimeoutMs,
      onProgress: (update) =>
        deps.store
          .writeGroceryProgress(listId, update.progress, update.message)
          .catch((e) => console.warn(`[worker] grocery progress write failed (${listId}):`, e)),
    })
    await deps.store.completeGrocery(listId, ingredients)
    console.log(`[worker] grocery complete: ${listId} (${ingredients.length} items)`)
    return 'done'
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate grocery list'
    console.error(`[worker] grocery failed: ${listId} — ${message}`)
    await deps.store
      .failGrocery(listId, message)
      .catch((e) => console.error(`[worker] failGrocery(${listId}) write failed:`, e))
    return 'failed'
  }
}

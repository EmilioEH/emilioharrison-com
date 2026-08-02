import type { GoogleGenAI, WorkerStore, ComputeGrocery, JobOutcome } from './types'
import type { LogAiError } from './ai-error-log'

/**
 * Runs one grocery-generation job end-to-end for a `grocery_lists` doc id. Progress updates
 * stream to Firestore via the store so the client's existing subscription shows granular status.
 */
export async function runGroceryForDoc(
  deps: {
    store: WorkerStore
    gemini: GoogleGenAI
    jobTimeoutMs: number
    computeGrocery: ComputeGrocery
    logAiError: LogAiError
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
    deps.logAiError('grocery', error, { context: { listId } })
    await deps.store
      .failGrocery(listId, message)
      .catch((e) => console.error(`[worker] failGrocery(${listId}) write failed:`, e))
    return 'failed'
  }
}

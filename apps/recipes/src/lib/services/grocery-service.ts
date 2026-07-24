import {
  aiOperationStore,
  startAiOperation,
  updateAiOperation,
  removeAiOperation,
} from '../aiOperationStore'
import type { Recipe } from '../types'

/**
 * Triggers grocery list generation. The server now runs the AI call and persists progress
 * and the final result directly to Firestore (see generate-grocery-list.ts), surviving the
 * client's tab/connection closing mid-generation. The caller's existing `useFirestoreDocument`
 * subscription on `grocery_lists/{scopeId}_{weekStartDate}` is the source of truth for
 * progress/completion/errors from here — this function only guards against duplicate triggers
 * and gives an instant local "processing" signal before that subscription catches up.
 *
 * Sends recipe **IDs** only, never the client's in-memory recipe objects — the server re-fetches
 * the full, current documents itself. A prior version sent whatever ingredient data the browser
 * happened to have, which silently produced empty grocery lists when that data was stale or thin
 * (e.g. a slimmed list-view projection, or a recipe generation triggered before an import had
 * fully landed client-side). `recipes` is still accepted as the parameter shape so call sites
 * don't need to change — only the id is used.
 */
export async function triggerGroceryGeneration(
  weekStartDate: string,
  recipes: Pick<Recipe, 'id'>[],
  scopeId: string,
) {
  const listId = `${scopeId}_${weekStartDate}`
  const opId = `grocery-${listId}`

  // Prevent duplicate operations if already running
  const existing = aiOperationStore.get().operations.find((op) => op.id === opId)
  if (existing) {
    console.log('[Grocery] Skipping generation - operation already exists:', opId)
    return
  }

  console.log('[Grocery] Starting generation for', listId, 'with', recipes.length, 'recipes')

  startAiOperation({
    id: opId,
    feature: 'grocery-list',
    cancelable: false,
    error: undefined,
  })

  try {
    const baseUrl = import.meta.env.BASE_URL.endsWith('/')
      ? import.meta.env.BASE_URL
      : `${import.meta.env.BASE_URL}/`

    const res = await fetch(`${baseUrl}api/generate-grocery-list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipeIds: recipes.map((r) => r.id),
        weekStartDate,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || `Generation failed: ${res.statusText}`)
    }

    // Handoff complete — the server has already written `status: 'processing'` to Firestore
    // before returning this response, so the Firestore subscription is authoritative from
    // this point on.
    removeAiOperation(opId)
  } catch (err) {
    console.error('[Grocery] Generation failed:', err)
    updateAiOperation(opId, {
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    })
    // Error persists until user retries
  }
}

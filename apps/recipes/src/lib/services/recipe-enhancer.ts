import {
  aiOperationStore,
  startAiOperation,
  updateAiOperation,
  removeAiOperation,
} from '../aiOperationStore'

/**
 * Triggers a background enhancement job for a newly imported recipe.
 * This is "fire-and-forget" from the UI perspective, but tracked in the store.
 */
export async function triggerBackgroundEnhancement(recipeId: string, _recipeTitle: string) {
  const opId = `enhance-${recipeId}`

  // Prevent duplicate operations
  const existing = aiOperationStore.get().operations.find((op) => op.id === opId)
  if (existing) return

  startAiOperation({
    id: opId,
    feature: 'recipe-enhancement',
    cancelable: false, // Background jobs shouldn't be cancelled easily by UI
    error: undefined,
  })

  try {
    const baseUrl = import.meta.env.BASE_URL.endsWith('/')
      ? import.meta.env.BASE_URL
      : `${import.meta.env.BASE_URL}/`

    // Call the enhance endpoint
    const res = await fetch(`${baseUrl}api/recipes/${recipeId}/enhance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}), // No body needed, it fetches from DB
    })

    if (!res.ok) {
      throw new Error(`Enhancement failed: ${res.statusText}`)
    }

    const data = await res.json()

    if (data.success) {
      // Success! The Firestore document is now updated.
      // We don't need to do anything else because the client is subscribed to the document.
      // Just mark complete.
      updateAiOperation(opId, { status: 'complete', progress: 100 })

      // Remove after a delay so the UI (if showing status) has time to register "Done"
      setTimeout(() => removeAiOperation(opId), 3000)
    } else {
      removeAiOperation(opId)
    }
  } catch (err) {
    // console.warn('Background enhancement failed', err)
    updateAiOperation(opId, {
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    })
    // Remove error after a bit
    setTimeout(() => removeAiOperation(opId), 5000)
  }
}

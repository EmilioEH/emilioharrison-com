import {
  aiOperationStore,
  startAiOperation,
  updateAiOperation,
  removeAiOperation,
} from '../aiOperationStore'
import type { Recipe } from '../types'

/**
 * Triggers background grocery list generation.
 * Fire-and-forget: The UI should subscribe to the Firestore document for updates.
 */
export async function triggerGroceryGeneration(
  weekStartDate: string,
  recipes: Recipe[],
  userId: string,
) {
  const listId = `${userId}_${weekStartDate}`
  const opId = `grocery-${listId}`

  // Prevent duplicate operations if already running
  const existing = aiOperationStore.get().operations.find((op) => op.id === opId)
  if (existing) return

  startAiOperation({
    id: opId,
    feature: 'grocery-list',
    cancelable: false,
    error: undefined, // Initialize with undefined error
  })

  try {
    const baseUrl = import.meta.env.BASE_URL.endsWith('/')
      ? import.meta.env.BASE_URL
      : `${import.meta.env.BASE_URL}/`

    // Call the generate endpoint
    // This awaits the FULL generation in our serverless-ish model,
    // but we treat it as background from UI store perspective.
    const res = await fetch(`${baseUrl}api/grocery/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weekStartDate,
        recipes: recipes.map((r) => ({ ...r })), // Ensure plain objects
        userId,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || `Generation failed: ${res.statusText}`)
    }

    const data = await res.json()

    if (data.success) {
      updateAiOperation(opId, { status: 'complete', progress: 100 })
      // Remove after small delay
      setTimeout(() => removeAiOperation(opId), 3000)
    } else {
      throw new Error(data.error || 'Unknown failure')
    }
  } catch (err) {
    console.error('Grocery generation trigger failed', err)
    updateAiOperation(opId, {
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    })
    // Keep error visible for a bit
    setTimeout(() => removeAiOperation(opId), 5000)
  }
}

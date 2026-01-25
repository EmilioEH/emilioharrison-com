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
  if (existing) {
    console.log('[Grocery] Skipping generation - operation already exists:', opId)
    return
  }

  console.log('[Grocery] Starting generation for', listId, 'with', recipes.length, 'recipes')

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

    // Call the generate endpoint with streaming support
    const res = await fetch(`${baseUrl}api/generate-grocery-list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipes: recipes.map((r) => ({ ...r })), // Ensure plain objects
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || `Generation failed: ${res.statusText}`)
    }

    if (!res.body) throw new Error('No response body')

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let result = ''
    const foundStages = new Set<string>()

    // Stream reading loop
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      result += chunk

      // Progress Heuristics
      if (!foundStages.has('start') && result.length > 50) {
        foundStages.add('start')
        updateAiOperation(opId, {
          progress: 10,
          message: 'Analyzing recipes...',
        })
      }
      if (!foundStages.has('produce') && /"category":\s*"Produce"/i.test(result)) {
        foundStages.add('produce')
        updateAiOperation(opId, {
          progress: 30,
          message: 'Selecting fresh produce...',
        })
      }
      if (!foundStages.has('meat') && /"category":\s*"Meat"/i.test(result)) {
        foundStages.add('meat')
        updateAiOperation(opId, {
          progress: 50,
          message: 'Checking butcher items...',
        })
      }
      if (!foundStages.has('dairy') && /"category":\s*"Dairy"/i.test(result)) {
        foundStages.add('dairy')
        updateAiOperation(opId, {
          progress: 70,
          message: 'Reviewing dairy & eggs...',
        })
      }
      if (!foundStages.has('pantry') && /"category":\s*"Pantry"/i.test(result)) {
        foundStages.add('pantry')
        updateAiOperation(opId, {
          progress: 85,
          message: 'Auditing pantry essentials...',
        })
      }
    }

    // Final Parse
    let data
    try {
      data = JSON.parse(result)
    } catch {
      console.warn('JSON parse failed on stream result, likely incomplete')
      throw new Error('AI response was incomplete')
    }

    if (data && data.ingredients) {
      // Save to Firestore
      const { doc, setDoc } = await import('firebase/firestore')
      const { db } = await import('../firebase-client')

      const listRef = doc(db, 'grocery_lists', listId)
      await setDoc(listRef, {
        id: listId,
        userId,
        weekStartDate,
        ingredients: data.ingredients,
        status: 'complete',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      console.log('[Grocery] Saved list to Firestore:', listId)
      updateAiOperation(opId, { status: 'complete', progress: 100, message: 'Done!' })
      // Remove after small delay
      setTimeout(() => removeAiOperation(opId), 3000)
    } else {
      throw new Error('No ingredients generated')
    }
  } catch (err) {
    console.error('[Grocery] Generation failed:', err)
    updateAiOperation(opId, {
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    })
    // Error persists until user retries
  }
}

import {
  aiOperationStore,
  startAiOperation,
  updateAiOperation,
  removeAiOperation,
} from '../aiOperationStore'
import type { GroceryList, Recipe, RecurringGroceryItem, ShoppableIngredient } from '../types'
import { filterDueRecurringItems, mergeRecurringIntoIngredients } from '../grocery-utils'

/**
 * Triggers background grocery list generation.
 * Fire-and-forget: The UI should subscribe to the Firestore document for updates.
 * @param scopeId - familyId ?? userId — determines the Firestore document key
 * @param userId - The authenticated user's UID (required for Firestore rules)
 * @param familyId - Optional family ID when in family mode
 */
export async function triggerGroceryGeneration(
  weekStartDate: string,
  recipes: Recipe[],
  scopeId: string,
  userId: string,
  familyId?: string,
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

      // Progress Heuristics (matches new 19-category H-E-B walking-path order)
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
          progress: 25,
          message: 'Selecting fresh produce...',
        })
      }
      if (!foundStages.has('meat') && /"category":\s*"(Meat|Seafood)"/i.test(result)) {
        foundStages.add('meat')
        updateAiOperation(opId, {
          progress: 40,
          message: 'Checking butcher & seafood...',
        })
      }
      if (
        !foundStages.has('pantry') &&
        /"category":\s*"(Pantry & Condiments|Canned & Dry Goods|Baking & Spices)"/i.test(result)
      ) {
        foundStages.add('pantry')
        updateAiOperation(opId, {
          progress: 60,
          message: 'Auditing pantry essentials...',
        })
      }
      if (!foundStages.has('dairy') && /"category":\s*"Dairy & Eggs"/i.test(result)) {
        foundStages.add('dairy')
        updateAiOperation(opId, {
          progress: 80,
          message: 'Reviewing dairy & eggs...',
        })
      }
      if (!foundStages.has('frozen') && /"category":\s*"Frozen Foods"/i.test(result)) {
        foundStages.add('frozen')
        updateAiOperation(opId, {
          progress: 90,
          message: 'Adding frozen items...',
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
      let finalIngredients: ShoppableIngredient[] = data.ingredients

      // Inject recurring items
      try {
        const recurringRes = await fetch(`${baseUrl}api/grocery/recurring`)
        if (recurringRes.ok) {
          const { items: recurringItems } = (await recurringRes.json()) as {
            items: RecurringGroceryItem[]
          }

          if (recurringItems && recurringItems.length > 0) {
            console.log(`[Grocery] Found ${recurringItems.length} recurring items`)

            const { dueItems, itemsToUpdate } = filterDueRecurringItems(
              recurringItems,
              weekStartDate,
            )
            console.log(`[Grocery] ${dueItems.length} recurring items are due this week`)

            if (dueItems.length > 0) {
              // Merge recurring items into ingredient list
              finalIngredients = mergeRecurringIntoIngredients(finalIngredients, dueItems)

              // Update lastAddedWeek for injected items via API
              const updatePromises = itemsToUpdate.map((item) =>
                fetch(`${baseUrl}api/grocery/recurring`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    itemId: item.id,
                    lastAddedWeek: weekStartDate,
                  }),
                }),
              )

              // Fire and forget the updates (best effort)
              Promise.all(updatePromises).catch((err) =>
                console.warn('[Grocery] Failed to update some recurring items:', err),
              )
            }
          }
        }
      } catch (recurringError) {
        // Don't fail the whole operation if recurring items fail
        console.warn('[Grocery] Failed to inject recurring items:', recurringError)
      }

      // Save to Firestore
      const { doc, setDoc } = await import('firebase/firestore')
      const { db } = await import('../firebase-client')

      const listRef = doc(db, 'grocery_lists', listId)
      await setDoc(listRef, {
        id: listId,
        userId,
        ...(familyId ? { familyId } : {}),
        weekStartDate,
        ingredients: finalIngredients,
        status: 'complete',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } satisfies Omit<GroceryList, 'productPickerStatus' | 'unmatchedCount'>)

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

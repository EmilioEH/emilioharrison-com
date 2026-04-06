import type { APIRoute } from 'astro'
import { db } from '../../../lib/firebase-server'
import { getGroceryScopeId, unauthorizedResponse } from '../../../lib/api-helpers'
import { setRequestContext } from '../../../lib/request-context'
import type { RecurringGroceryItem } from '../../../lib/types'
import { resolveFrequencyWeeks } from '../../../lib/grocery-utils'

/**
 * Recurring grocery items CRUD operations.
 * Collection: recurring_grocery_items/{scopeId}/items/{itemId}
 * scopeId = familyId ?? userId (shared across family members)
 */

interface CreateRecurringItemRequest {
  userId: string
  item: Omit<RecurringGroceryItem, 'id' | 'createdAt' | 'lastAddedWeek'>
}

interface DeleteRecurringItemRequest {
  userId: string
  itemId: string
}

/**
 * GET: List all recurring items for a user
 */
export const GET: APIRoute = async (context) => {
  setRequestContext(context)
  try {
    const scope = await getGroceryScopeId(context.cookies)
    if (!scope) return unauthorizedResponse()

    const collectionPath = `recurring_grocery_items/${scope.scopeId}/items`
    const rawItems = await db.getCollection<RecurringGroceryItem>(collectionPath)

    // Lazy-migrate: resolve frequencyWeeks for legacy items with string frequency
    const items = rawItems.map((item) => ({
      ...item,
      frequencyWeeks: resolveFrequencyWeeks(item),
    }))

    return new Response(JSON.stringify({ items }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Get recurring items error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to get items' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}

/**
 * POST: Create a recurring item from a grocery list item
 */
export const POST: APIRoute = async (context) => {
  setRequestContext(context)
  try {
    const scope = await getGroceryScopeId(context.cookies)
    if (!scope) return unauthorizedResponse()

    const { item } = (await context.request.json()) as { item: CreateRecurringItemRequest['item'] }

    if (!item) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (
      !item.frequencyWeeks ||
      typeof item.frequencyWeeks !== 'number' ||
      item.frequencyWeeks < 1 ||
      item.frequencyWeeks > 52
    ) {
      return new Response(JSON.stringify({ error: 'Invalid frequencyWeeks (must be 1-52)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const collectionPath = `recurring_grocery_items/${scope.scopeId}/items`

    // Check if item already exists (by name, case-insensitive)
    const existingItems = await db.getCollection<RecurringGroceryItem>(collectionPath)
    const normalizedName = item.name.toLowerCase().trim()
    const existing = existingItems.find((i) => i.name.toLowerCase().trim() === normalizedName)

    if (existing) {
      // Update frequency instead of creating duplicate
      await db.updateDocument(collectionPath, existing.id, {
        frequencyWeeks: item.frequencyWeeks,
        purchaseAmount: item.purchaseAmount,
        purchaseUnit: item.purchaseUnit,
      })

      return new Response(JSON.stringify({ success: true, itemId: existing.id, updated: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Create new recurring item with generated ID
    const itemId = `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    // Get display name for family attribution
    const userDoc = await db.getDocument<{ displayName?: string }>('users', scope.userId)

    const newItem: RecurringGroceryItem = {
      id: itemId,
      name: item.name.trim(),
      purchaseAmount: item.purchaseAmount,
      purchaseUnit: item.purchaseUnit,
      category: item.category,
      frequencyWeeks: item.frequencyWeeks,
      createdAt: new Date().toISOString(),
      addedBy: scope.userId,
      addedByName: userDoc?.displayName || 'User',
      ...(item.aisle !== undefined && { aisle: item.aisle }),
      ...(item.hebPrice !== undefined && { hebPrice: item.hebPrice }),
      ...(item.hebPriceUnit !== undefined && { hebPriceUnit: item.hebPriceUnit }),
    }

    await db.addSubDocument('recurring_grocery_items', scope.scopeId, 'items', itemId, newItem)

    return new Response(JSON.stringify({ success: true, itemId }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Create recurring item error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to create item' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}

/**
 * DELETE: Remove a recurring item
 */
export const DELETE: APIRoute = async (context) => {
  setRequestContext(context)
  try {
    const scope = await getGroceryScopeId(context.cookies)
    if (!scope) return unauthorizedResponse()

    const { itemId } = (await context.request.json()) as DeleteRecurringItemRequest

    if (!itemId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const collectionPath = `recurring_grocery_items/${scope.scopeId}/items`
    await db.deleteDocument(collectionPath, itemId)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Delete recurring item error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to delete item' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}

/**
 * PATCH: Update a recurring item's frequency or lastAddedWeek
 */
export const PATCH: APIRoute = async (context) => {
  setRequestContext(context)
  try {
    const { itemId, frequencyWeeks, lastAddedWeek } = (await context.request.json()) as {
      itemId: string
      frequencyWeeks?: number
      lastAddedWeek?: string
    }

    const scope = await getGroceryScopeId(context.cookies)
    if (!scope) return unauthorizedResponse()

    if (!itemId) {
      return new Response(JSON.stringify({ error: 'Missing itemId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!frequencyWeeks && !lastAddedWeek) {
      return new Response(JSON.stringify({ error: 'Nothing to update' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (
      frequencyWeeks &&
      (typeof frequencyWeeks !== 'number' || frequencyWeeks < 1 || frequencyWeeks > 52)
    ) {
      return new Response(JSON.stringify({ error: 'Invalid frequencyWeeks (must be 1-52)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const collectionPath = `recurring_grocery_items/${scope.scopeId}/items`
    const updates: Record<string, string | number> = {}

    if (frequencyWeeks) updates.frequencyWeeks = frequencyWeeks
    if (lastAddedWeek) updates.lastAddedWeek = lastAddedWeek

    await db.updateDocument(collectionPath, itemId, updates)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Update recurring item error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to update item' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}

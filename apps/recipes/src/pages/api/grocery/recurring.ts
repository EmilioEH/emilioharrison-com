import type { APIRoute } from 'astro'
import { db } from '../../../lib/firebase-server'
import type { RecurringGroceryItem } from '../../../lib/types'

/**
 * Recurring grocery items CRUD operations.
 * Collection: recurring_grocery_items/{userId}/items/{itemId}
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
export const GET: APIRoute = async ({ url }) => {
  try {
    const userId = url.searchParams.get('userId')

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const collectionPath = `recurring_grocery_items/${userId}/items`
    const items = await db.getCollection<RecurringGroceryItem>(collectionPath)

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
export const POST: APIRoute = async ({ request }) => {
  try {
    const { userId, item } = (await request.json()) as CreateRecurringItemRequest

    if (!userId || !item) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!item.frequency || !['weekly', 'biweekly', 'monthly'].includes(item.frequency)) {
      return new Response(JSON.stringify({ error: 'Invalid frequency' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const collectionPath = `recurring_grocery_items/${userId}/items`

    // Check if item already exists (by name, case-insensitive)
    const existingItems = await db.getCollection<RecurringGroceryItem>(collectionPath)
    const normalizedName = item.name.toLowerCase().trim()
    const existing = existingItems.find((i) => i.name.toLowerCase().trim() === normalizedName)

    if (existing) {
      // Update frequency instead of creating duplicate
      await db.updateDocument(collectionPath, existing.id, {
        frequency: item.frequency,
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
    const newItem: RecurringGroceryItem = {
      id: itemId,
      name: item.name.trim(),
      purchaseAmount: item.purchaseAmount,
      purchaseUnit: item.purchaseUnit,
      category: item.category,
      frequency: item.frequency,
      createdAt: new Date().toISOString(),
      ...(item.aisle !== undefined && { aisle: item.aisle }),
      ...(item.hebPrice !== undefined && { hebPrice: item.hebPrice }),
      ...(item.hebPriceUnit !== undefined && { hebPriceUnit: item.hebPriceUnit }),
    }

    await db.addSubDocument('recurring_grocery_items', userId, 'items', itemId, newItem)

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
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { userId, itemId } = (await request.json()) as DeleteRecurringItemRequest

    if (!userId || !itemId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const collectionPath = `recurring_grocery_items/${userId}/items`
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
export const PATCH: APIRoute = async ({ request }) => {
  try {
    const { userId, itemId, frequency, lastAddedWeek } = (await request.json()) as {
      userId: string
      itemId: string
      frequency?: 'weekly' | 'biweekly' | 'monthly'
      lastAddedWeek?: string
    }

    if (!userId || !itemId) {
      return new Response(JSON.stringify({ error: 'Missing userId or itemId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!frequency && !lastAddedWeek) {
      return new Response(JSON.stringify({ error: 'Nothing to update' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (frequency && !['weekly', 'biweekly', 'monthly'].includes(frequency)) {
      return new Response(JSON.stringify({ error: 'Invalid frequency' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const collectionPath = `recurring_grocery_items/${userId}/items`
    const updates: Record<string, string> = {}

    if (frequency) updates.frequency = frequency
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

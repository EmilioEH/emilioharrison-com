import type { APIRoute } from 'astro'
import { db } from '../../../lib/firebase-server'
import { getGroceryScopeId, unauthorizedResponse } from '../../../lib/api-helpers'
import { setRequestContext } from '../../../lib/request-context'
import type { ProductOverride, RecurringGroceryItem } from '../../../lib/types'
import { resolveFrequencyWeeks } from '../../../lib/grocery-utils'

/**
 * Recurring grocery items CRUD operations.
 * Collection: recurring_grocery_items/{scopeId}/items/{itemId}
 * scopeId = familyId ?? userId (shared across family members)
 */

/** HEB product fields sent alongside the recurring item for override creation */
interface ProductFields {
  imageUrl?: string
  hebProductId?: string
  hebProductUrl?: string
  hebSize?: string
  storeLocation?: string
  hebUnitPrice?: number
  hebUnitPriceUnit?: string
}

interface CreateRecurringItemRequest {
  userId: string
  item: Omit<RecurringGroceryItem, 'id' | 'createdAt' | 'lastAddedWeek'> & ProductFields
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
 * POST: Create or update one or more recurring items.
 * Accepts either `{ item }` (single) or `{ items: [...] }` (bulk).
 */
export const POST: APIRoute = async (context) => {
  setRequestContext(context)
  try {
    const scope = await getGroceryScopeId(context.cookies)
    if (!scope) return unauthorizedResponse()

    const body = (await context.request.json()) as {
      item?: CreateRecurringItemRequest['item']
      items?: CreateRecurringItemRequest['item'][]
    }

    const inputs = body.items && body.items.length > 0 ? body.items : body.item ? [body.item] : []

    if (inputs.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    for (const input of inputs) {
      if (
        !input.frequencyWeeks ||
        typeof input.frequencyWeeks !== 'number' ||
        input.frequencyWeeks < 1 ||
        input.frequencyWeeks > 52
      ) {
        return new Response(JSON.stringify({ error: 'Invalid frequencyWeeks (must be 1-52)' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    const collectionPath = `recurring_grocery_items/${scope.scopeId}/items`
    const existingItems = await db.getCollection<RecurringGroceryItem>(collectionPath)
    const userDoc = await db.getDocument<{ displayName?: string }>('users', scope.userId)
    const displayName = userDoc?.displayName || 'User'

    const created: string[] = []
    const updated: string[] = []

    for (const input of inputs) {
      const normalizedName = input.name.toLowerCase().trim()
      const existing = existingItems.find((i) => i.name.toLowerCase().trim() === normalizedName)

      if (existing) {
        await db.updateDocument(collectionPath, existing.id, {
          frequencyWeeks: input.frequencyWeeks,
          purchaseAmount: input.purchaseAmount,
          purchaseUnit: input.purchaseUnit,
        })
        await upsertProductOverride(scope.scopeId, input)
        updated.push(existing.id)
      } else {
        const itemId = `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
        const newItem: RecurringGroceryItem = {
          id: itemId,
          name: input.name.trim(),
          purchaseAmount: input.purchaseAmount,
          purchaseUnit: input.purchaseUnit,
          category: input.category,
          frequencyWeeks: input.frequencyWeeks,
          createdAt: new Date().toISOString(),
          addedBy: scope.userId,
          addedByName: displayName,
          ...(input.aisle !== undefined && { aisle: input.aisle }),
          ...(input.hebPrice !== undefined && { hebPrice: input.hebPrice }),
          ...(input.hebPriceUnit !== undefined && { hebPriceUnit: input.hebPriceUnit }),
        }
        await db.addSubDocument('recurring_grocery_items', scope.scopeId, 'items', itemId, newItem)
        await upsertProductOverride(scope.scopeId, input)
        existingItems.push(newItem)
        created.push(itemId)
      }
    }

    const isBulk = Array.isArray(body.items)
    if (isBulk) {
      return new Response(JSON.stringify({ success: true, created, updated }), {
        status: created.length > 0 && updated.length === 0 ? 201 : 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Single-item response shape (backwards compat)
    if (updated.length > 0) {
      return new Response(JSON.stringify({ success: true, itemId: updated[0], updated: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ success: true, itemId: created[0] }), {
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

function normalizeKey(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, '-')
}

async function upsertProductOverride(
  scopeId: string,
  item: CreateRecurringItemRequest['item'],
): Promise<void> {
  const hasProductData = item.imageUrl || item.hebProductId
  if (!hasProductData) return

  const collectionPath = `product_overrides/${scopeId}/items`
  const key = normalizeKey(item.name)

  const override: ProductOverride = {
    name: item.name.trim(),
    updatedAt: new Date().toISOString(),
    ...(item.imageUrl && { imageUrl: item.imageUrl }),
    ...(item.hebProductId && { hebProductId: item.hebProductId }),
    ...(item.hebProductUrl && { hebProductUrl: item.hebProductUrl }),
    ...(item.hebPrice !== undefined && { hebPrice: item.hebPrice }),
    ...(item.hebPriceUnit && { hebPriceUnit: item.hebPriceUnit }),
    ...(item.hebSize && { hebSize: item.hebSize }),
    ...(item.aisle !== undefined && { aisle: item.aisle }),
    ...(item.storeLocation && { storeLocation: item.storeLocation }),
    ...(item.hebUnitPrice !== undefined && { hebUnitPrice: item.hebUnitPrice }),
    ...(item.hebUnitPriceUnit && { hebUnitPriceUnit: item.hebUnitPriceUnit }),
  }

  await db.setDocument(collectionPath, key, override)
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

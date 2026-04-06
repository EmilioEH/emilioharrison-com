import type { APIRoute } from 'astro'
import { db } from '../../../lib/firebase-server'
import { getGroceryScopeId, unauthorizedResponse } from '../../../lib/api-helpers'
import { setRequestContext } from '../../../lib/request-context'
import type { GroceryList, ShoppableIngredient } from '../../../lib/types'

/**
 * Manual grocery item CRUD operations.
 * Operates on the existing grocery_lists Firestore document.
 */

interface ManualItemRequest {
  weekStartDate: string
  userId: string
  item: ShoppableIngredient
}

interface DeleteItemRequest {
  weekStartDate: string
  userId: string
  itemName: string
}

interface PatchItemRequest {
  weekStartDate: string
  userId: string
  itemName: string
  updates: {
    purchaseAmount?: number
    purchaseUnit?: string
    category?: string
    hebPrice?: number
    aisle?: number
    storeLocation?: string
    isRecurring?: boolean
    recurringFrequencyWeeks?: number
    imageUrl?: string
    hebProductId?: string
    hebProductUrl?: string
    hebSize?: string
    hebUnitPrice?: number
    hebUnitPriceUnit?: string
  }
}

/**
 * POST: Add a manual item to the grocery list
 */
export const POST: APIRoute = async (context) => {
  setRequestContext(context)
  try {
    const scope = await getGroceryScopeId(context.cookies)
    if (!scope) return unauthorizedResponse()

    const { weekStartDate, item } = (await context.request.json()) as ManualItemRequest

    if (!weekStartDate || !item) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const listId = `${scope.scopeId}_${weekStartDate}`

    // Get existing list or create new one
    let groceryList = await db.getDocument<GroceryList>('grocery_lists', listId)

    if (!groceryList) {
      // Create new list with the manual item
      groceryList = {
        id: listId,
        userId: scope.userId,
        ...(scope.familyId && { familyId: scope.familyId }),
        weekStartDate,
        ingredients: [],
        status: 'complete',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }

    // Mark item as manual
    const manualItem: ShoppableIngredient = {
      ...item,
      isManual: true,
      sources: [], // Manual items don't have recipe sources
    }

    // Check for existing item with same name and unit
    const existingIndex = groceryList.ingredients.findIndex(
      (ing) =>
        ing.name.toLowerCase().trim() === manualItem.name.toLowerCase().trim() &&
        ing.purchaseUnit.toLowerCase().trim() === manualItem.purchaseUnit.toLowerCase().trim(),
    )

    if (existingIndex >= 0) {
      // Merge quantities
      groceryList.ingredients[existingIndex].purchaseAmount += manualItem.purchaseAmount
      // If existing item wasn't manual, keep its sources but add manual flag
      if (!groceryList.ingredients[existingIndex].isManual) {
        groceryList.ingredients[existingIndex].isManual = false // AI takes precedence
      }
      // Copy price info from manual item if not present
      if (manualItem.hebPrice && !groceryList.ingredients[existingIndex].hebPrice) {
        groceryList.ingredients[existingIndex].hebPrice = manualItem.hebPrice
        groceryList.ingredients[existingIndex].hebPriceUnit = manualItem.hebPriceUnit
      }
    } else {
      // Add new item
      groceryList.ingredients.push(manualItem)
    }

    // Save to Firestore
    await db.setDocument('grocery_lists', listId, {
      ...groceryList,
      updatedAt: new Date().toISOString(),
    })

    return new Response(JSON.stringify({ success: true, listId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Add manual item error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to add item' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}

/**
 * DELETE: Remove a manual item from the grocery list
 */
export const DELETE: APIRoute = async (context) => {
  setRequestContext(context)
  try {
    const scope = await getGroceryScopeId(context.cookies)
    if (!scope) return unauthorizedResponse()

    const { weekStartDate, itemName } = (await context.request.json()) as DeleteItemRequest

    if (!weekStartDate || !itemName) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const listId = `${scope.scopeId}_${weekStartDate}`
    const groceryList = await db.getDocument<GroceryList>('grocery_lists', listId)

    if (!groceryList) {
      return new Response(JSON.stringify({ error: 'Grocery list not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Find and remove the item
    const normalizedName = itemName.toLowerCase().trim()
    const filteredIngredients = groceryList.ingredients.filter(
      (ing) => ing.name.toLowerCase().trim() !== normalizedName,
    )

    if (filteredIngredients.length === groceryList.ingredients.length) {
      return new Response(JSON.stringify({ error: 'Item not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Save updated list
    await db.updateDocument('grocery_lists', listId, {
      ingredients: filteredIngredients,
      updatedAt: new Date().toISOString(),
    })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Delete manual item error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to delete item' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}

/**
 * PATCH: Edit a manual item's quantity/unit
 */
export const PATCH: APIRoute = async (context) => {
  setRequestContext(context)
  try {
    const scope = await getGroceryScopeId(context.cookies)
    if (!scope) return unauthorizedResponse()

    const { weekStartDate, itemName, updates } = (await context.request.json()) as PatchItemRequest

    if (!weekStartDate || !itemName || !updates) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const listId = `${scope.scopeId}_${weekStartDate}`
    const groceryList = await db.getDocument<GroceryList>('grocery_lists', listId)

    if (!groceryList) {
      return new Response(JSON.stringify({ error: 'Grocery list not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Find and update the item
    const normalizedName = itemName.toLowerCase().trim()
    const itemIndex = groceryList.ingredients.findIndex(
      (ing) => ing.name.toLowerCase().trim() === normalizedName,
    )

    if (itemIndex < 0) {
      return new Response(JSON.stringify({ error: 'Item not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Apply updates
    if (updates.purchaseAmount !== undefined) {
      groceryList.ingredients[itemIndex].purchaseAmount = updates.purchaseAmount
    }
    if (updates.purchaseUnit !== undefined) {
      groceryList.ingredients[itemIndex].purchaseUnit = updates.purchaseUnit
    }
    if (updates.category !== undefined) {
      groceryList.ingredients[itemIndex].category = updates.category
    }
    if (updates.hebPrice !== undefined) {
      groceryList.ingredients[itemIndex].hebPrice = updates.hebPrice
    }
    if (updates.aisle !== undefined) {
      groceryList.ingredients[itemIndex].aisle = updates.aisle
    }
    if (updates.storeLocation !== undefined) {
      groceryList.ingredients[itemIndex].storeLocation = updates.storeLocation
    }
    if (updates.imageUrl !== undefined) {
      groceryList.ingredients[itemIndex].imageUrl = updates.imageUrl
    }
    if (updates.hebProductId !== undefined) {
      groceryList.ingredients[itemIndex].hebProductId = updates.hebProductId
    }
    if (updates.hebProductUrl !== undefined) {
      groceryList.ingredients[itemIndex].hebProductUrl = updates.hebProductUrl
    }
    if (updates.hebSize !== undefined) {
      groceryList.ingredients[itemIndex].hebSize = updates.hebSize
    }
    if (updates.hebUnitPrice !== undefined) {
      groceryList.ingredients[itemIndex].hebUnitPrice = updates.hebUnitPrice
    }
    if (updates.hebUnitPriceUnit !== undefined) {
      groceryList.ingredients[itemIndex].hebUnitPriceUnit = updates.hebUnitPriceUnit
    }
    if (updates.isRecurring !== undefined) {
      groceryList.ingredients[itemIndex].isRecurring = updates.isRecurring || undefined
      groceryList.ingredients[itemIndex].recurringFrequencyWeeks = updates.recurringFrequencyWeeks
    }

    // Save updated list
    await db.updateDocument('grocery_lists', listId, {
      ingredients: groceryList.ingredients,
      updatedAt: new Date().toISOString(),
    })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Patch manual item error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to update item' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}

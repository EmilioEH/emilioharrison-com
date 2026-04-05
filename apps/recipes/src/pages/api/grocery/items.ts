import type { APIRoute } from 'astro'
import { db } from '../../../lib/firebase-server'
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
  }
}

/**
 * POST: Add a manual item to the grocery list
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const { weekStartDate, userId, item } = (await request.json()) as ManualItemRequest

    if (!weekStartDate || !userId || !item) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const listId = `${userId}_${weekStartDate}`

    // Get existing list or create new one
    let groceryList = await db.getDocument<GroceryList>('grocery_lists', listId)

    if (!groceryList) {
      // Create new list with the manual item
      groceryList = {
        id: listId,
        userId,
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
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { weekStartDate, userId, itemName } = (await request.json()) as DeleteItemRequest

    if (!weekStartDate || !userId || !itemName) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const listId = `${userId}_${weekStartDate}`
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
export const PATCH: APIRoute = async ({ request }) => {
  try {
    const { weekStartDate, userId, itemName, updates } = (await request.json()) as PatchItemRequest

    if (!weekStartDate || !userId || !itemName || !updates) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const listId = `${userId}_${weekStartDate}`
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

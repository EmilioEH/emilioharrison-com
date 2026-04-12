import type { APIRoute } from 'astro'
import { db } from '../../../lib/firebase-server'
import { getGroceryScopeId, unauthorizedResponse } from '../../../lib/api-helpers'
import { setRequestContext } from '../../../lib/request-context'
import type {
  GroceryList,
  RecurringGroceryItem,
  ShoppableIngredient,
  ProductOverride,
} from '../../../lib/types'
import { resolveFrequencyWeeks, mergeRecurringIntoIngredients } from '../../../lib/grocery-utils'

/**
 * POST: Inject specific recurring items into a week's grocery list.
 * Creates the grocery list document if it doesn't exist.
 * Updates lastAddedWeek on each injected recurring item.
 */
export const POST: APIRoute = async (context) => {
  setRequestContext(context)
  try {
    const scope = await getGroceryScopeId(context.cookies)
    if (!scope) return unauthorizedResponse()

    const { weekStartDate, recurringItemIds } = (await context.request.json()) as {
      weekStartDate: string
      recurringItemIds: string[]
    }

    if (!weekStartDate || !recurringItemIds?.length) {
      return new Response(JSON.stringify({ error: 'Missing weekStartDate or recurringItemIds' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const recurringPath = `recurring_grocery_items/${scope.scopeId}/items`
    const allRecurring = await db.getCollection<RecurringGroceryItem>(recurringPath)
    const requestedSet = new Set(recurringItemIds)
    const matched = allRecurring.filter((item) => requestedSet.has(item.id))

    if (matched.length === 0) {
      return new Response(JSON.stringify({ error: 'No matching recurring items found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const shoppableItems: ShoppableIngredient[] = matched.map((item) => ({
      name: item.name,
      purchaseAmount: item.purchaseAmount,
      purchaseUnit: item.purchaseUnit,
      category: item.category,
      isRecurring: true,
      recurringFrequencyWeeks: resolveFrequencyWeeks(item),
      sources: [],
      ...(item.aisle !== undefined && { aisle: item.aisle }),
      ...(item.hebPrice !== undefined && { hebPrice: item.hebPrice }),
      ...(item.hebPriceUnit !== undefined && { hebPriceUnit: item.hebPriceUnit }),
    }))

    const listId = `${scope.scopeId}_${weekStartDate}`
    let groceryList = await db.getDocument<GroceryList>('grocery_lists', listId)

    if (!groceryList) {
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

    groceryList.ingredients = mergeRecurringIntoIngredients(
      groceryList.ingredients,
      shoppableItems,
    )

    // Apply product overrides
    const overridesPath = `product_overrides/${scope.scopeId}/items`
    const overrides = await db.getCollection<ProductOverride>(overridesPath)
    if (overrides.length > 0) {
      const overrideMap = new Map(overrides.map((o) => [o.name.toLowerCase().trim(), o]))
      for (const ing of groceryList.ingredients) {
        const override = overrideMap.get(ing.name.toLowerCase().trim())
        if (override) {
          if (override.aisle !== undefined) ing.aisle = override.aisle
          if (override.storeLocation) ing.storeLocation = override.storeLocation
          if (override.imageUrl) ing.imageUrl = override.imageUrl
          if (override.hebProductId) ing.hebProductId = override.hebProductId
          if (override.hebProductUrl) ing.hebProductUrl = override.hebProductUrl
          if (override.hebSize) ing.hebSize = override.hebSize
          if (override.hebPrice !== undefined && !ing.hebPrice) ing.hebPrice = override.hebPrice
          if (override.hebPriceUnit && !ing.hebPriceUnit) ing.hebPriceUnit = override.hebPriceUnit
          if (override.hebUnitPrice !== undefined) ing.hebUnitPrice = override.hebUnitPrice
          if (override.hebUnitPriceUnit) ing.hebUnitPriceUnit = override.hebUnitPriceUnit
        }
      }
    }

    await db.setDocument('grocery_lists', listId, {
      ...groceryList,
      updatedAt: new Date().toISOString(),
    })

    // Update lastAddedWeek on injected recurring items
    await Promise.all(
      matched.map((item) =>
        db.updateDocument(recurringPath, item.id, { lastAddedWeek: weekStartDate }),
      ),
    )

    return new Response(
      JSON.stringify({ success: true, listId, injectedCount: matched.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Recurring inject error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to inject items' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}

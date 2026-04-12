import type { Recipe, ShoppableIngredient, RecurringGroceryItem } from './types'

/**
 * Aggregates ingredients from multiple recipes into a single shoppable list.
 * Handles both structured and basic ingredients.
 */
export function buildGroceryItems(recipes: Recipe[]): ShoppableIngredient[] {
  const ingredientMap = new Map<string, ShoppableIngredient>()

  for (const recipe of recipes) {
    if (recipe.structuredIngredients && recipe.structuredIngredients.length > 0) {
      processStructuredIngredients(recipe, ingredientMap)
    } else if (recipe.ingredients) {
      processBasicIngredients(recipe, ingredientMap)
    }
  }

  return Array.from(ingredientMap.values())
}

function processStructuredIngredients(recipe: Recipe, map: Map<string, ShoppableIngredient>) {
  for (const ing of recipe.structuredIngredients!) {
    const key = `${ing.name.toLowerCase()}|${ing.unit.toLowerCase()}`
    const existing = map.get(key)

    if (existing) {
      existing.purchaseAmount += ing.amount
      const sources = existing.sources ?? []
      if (!sources.some((s) => s.recipeId === recipe.id)) {
        existing.sources = [
          ...sources,
          {
            recipeId: recipe.id,
            recipeTitle: recipe.title,
            originalAmount: `${ing.amount} ${ing.unit}`,
          },
        ]
      }
    } else {
      map.set(key, {
        name: ing.name,
        purchaseAmount: ing.amount,
        purchaseUnit: ing.unit,
        category: ing.category || 'Other',
        sources: [
          {
            recipeId: recipe.id,
            recipeTitle: recipe.title,
            originalAmount: `${ing.amount} ${ing.unit}`,
          },
        ],
      })
    }
  }
}

function processBasicIngredients(recipe: Recipe, map: Map<string, ShoppableIngredient>) {
  for (const ing of recipe.ingredients) {
    const key = `${ing.name.toLowerCase()}|basic`
    const existing = map.get(key)

    if (existing) {
      const sources = existing.sources ?? []
      if (!sources.some((s) => s.recipeId === recipe.id)) {
        existing.sources = [
          ...sources,
          {
            recipeId: recipe.id,
            recipeTitle: recipe.title,
            originalAmount: ing.amount ? `${ing.amount} ${ing.name}` : ing.name,
          },
        ]
      }
    } else {
      map.set(key, {
        name: ing.name?.toLowerCase() || 'unknown',
        purchaseAmount: 1,
        purchaseUnit: 'unit',
        category: 'Other',
        sources: [
          {
            recipeId: recipe.id,
            recipeTitle: recipe.title,
            originalAmount: ing.amount ? `${ing.amount} ${ing.name}` : ing.name,
          },
        ],
      })
    }
  }
}

/**
 * Calculates cost from HEB-verified prices on grocery items.
 * Returns the total of verified items and counts of verified vs unverified.
 */
export function calculateGroceryCost(items: ShoppableIngredient[]) {
  let total = 0
  let verifiedCount = 0
  let unverifiedCount = 0

  for (const item of items) {
    if (typeof item.hebPrice === 'number' && item.hebPrice > 0) {
      total += item.hebPrice
      verifiedCount++
    } else {
      unverifiedCount++
    }
  }

  return {
    total,
    verifiedCount,
    unverifiedCount,
    isComplete: unverifiedCount === 0 && items.length > 0,
    hasAnyData: verifiedCount > 0,
    itemCount: items.length,
  }
}

// ============================================================================
// Recurring Items Logic
// ============================================================================

/**
 * Returns the most recent Saturday on or before the given date.
 * Saturday is the anchor day for recurring item frequency calculations —
 * each Saturday marks the start of a new shopping week.
 */
function getMostRecentSaturday(date: Date): Date {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayOfWeek = d.getUTCDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const daysBack = dayOfWeek === 6 ? 0 : dayOfWeek + 1
  d.setUTCDate(d.getUTCDate() - daysBack)
  return d
}

/**
 * Resolves frequencyWeeks from a RecurringGroceryItem, handling legacy `frequency` field.
 * Legacy mapping: weekly → 1, biweekly → 2, monthly → 4
 */
export function resolveFrequencyWeeks(item: RecurringGroceryItem): number {
  if (item.frequencyWeeks) return item.frequencyWeeks
  // Legacy migration
  switch (item.frequency) {
    case 'weekly':
      return 1
    case 'biweekly':
      return 2
    case 'monthly':
      return 4
    default:
      return 1
  }
}

/**
 * Determines if a recurring item is due for the given week based on its frequencyWeeks.
 *
 * An item is due when the number of weeks since creation is a multiple of frequencyWeeks.
 * Edge case: if lastAddedWeek === currentWeekStart, item was already added this week (skip).
 */
export function isRecurringItemDue(item: RecurringGroceryItem, currentWeekStart: string): boolean {
  // Already added this week? Skip
  if (item.lastAddedWeek === currentWeekStart) {
    return false
  }

  const weeks = resolveFrequencyWeeks(item)

  // frequencyWeeks === 1 means every week — always due
  if (weeks === 1) {
    return true
  }

  const currentSaturday = getMostRecentSaturday(new Date(currentWeekStart))
  const createdSaturday = getMostRecentSaturday(new Date(item.createdAt))

  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const weeksDiff = Math.round((currentSaturday.getTime() - createdSaturday.getTime()) / msPerWeek)

  return weeksDiff >= 0 && weeksDiff % weeks === 0
}

/**
 * Converts a RecurringGroceryItem into a ShoppableIngredient.
 */
function recurringItemToShoppable(item: RecurringGroceryItem): ShoppableIngredient {
  return {
    name: item.name,
    purchaseAmount: item.purchaseAmount,
    purchaseUnit: item.purchaseUnit,
    category: item.category,
    isRecurring: true,
    recurringFrequencyWeeks: resolveFrequencyWeeks(item),
    sources: [], // Recurring items have no recipe sources
    ...(item.aisle !== undefined && { aisle: item.aisle }),
    ...(item.hebPrice !== undefined && { hebPrice: item.hebPrice }),
    ...(item.hebPriceUnit !== undefined && { hebPriceUnit: item.hebPriceUnit }),
  }
}

/**
 * Filters recurring items to those that are due, and returns:
 * - dueItems: ShoppableIngredient[] to merge into the grocery list
 * - itemsToUpdate: RecurringGroceryItem[] that need lastAddedWeek updated
 */
export function filterDueRecurringItems(
  recurringItems: RecurringGroceryItem[],
  currentWeekStart: string,
): {
  dueItems: ShoppableIngredient[]
  itemsToUpdate: RecurringGroceryItem[]
} {
  const dueItems: ShoppableIngredient[] = []
  const itemsToUpdate: RecurringGroceryItem[] = []

  for (const item of recurringItems) {
    if (isRecurringItemDue(item, currentWeekStart)) {
      dueItems.push(recurringItemToShoppable(item))
      itemsToUpdate.push(item)
    }
  }

  return { dueItems, itemsToUpdate }
}

/**
 * Merges recurring items into existing ingredients.
 * Uses the same deduplication logic as manual items:
 * - If name + unit match, add quantities
 * - Otherwise, add as new item
 */
export function mergeRecurringIntoIngredients(
  ingredients: ShoppableIngredient[],
  recurringItems: ShoppableIngredient[],
): ShoppableIngredient[] {
  const merged = [...ingredients]

  for (const recurring of recurringItems) {
    const normalizedName = recurring.name.toLowerCase().trim()
    const normalizedUnit = recurring.purchaseUnit.toLowerCase().trim()

    const existingIndex = merged.findIndex(
      (ing) =>
        ing.name.toLowerCase().trim() === normalizedName &&
        ing.purchaseUnit.toLowerCase().trim() === normalizedUnit,
    )

    if (existingIndex >= 0) {
      // Merge quantities
      merged[existingIndex].purchaseAmount += recurring.purchaseAmount
      // Mark as recurring if not already
      if (!merged[existingIndex].isRecurring) {
        merged[existingIndex].isRecurring = true
        merged[existingIndex].recurringFrequencyWeeks = recurring.recurringFrequencyWeeks
      }
      // Copy price info if not present
      if (recurring.hebPrice && !merged[existingIndex].hebPrice) {
        merged[existingIndex].hebPrice = recurring.hebPrice
        merged[existingIndex].hebPriceUnit = recurring.hebPriceUnit
      }
    } else {
      // Add as new item
      merged.push(recurring)
    }
  }

  return merged
}

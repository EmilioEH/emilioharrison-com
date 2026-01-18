import type { ShoppableIngredient } from './types'

interface ShoppableCategory {
  name: string
  items: ShoppableIngredient[]
}

/**
 * Merges shoppable ingredients by combining duplicates (same name + same purchaseUnit).
 * Preserves source attribution from all contributing recipes.
 */
export const mergeShoppableIngredients = (
  ingredients: ShoppableIngredient[],
): ShoppableIngredient[] => {
  const mergedMap = new Map<string, ShoppableIngredient>()

  for (const ing of ingredients) {
    const key = `${ing.name.toLowerCase().trim()}|${ing.purchaseUnit.toLowerCase().trim()}`

    if (mergedMap.has(key)) {
      const existing = mergedMap.get(key)!
      existing.purchaseAmount += ing.purchaseAmount

      // Merge sources, avoiding duplicates by recipeId
      for (const src of ing.sources) {
        if (!existing.sources.some((s) => s.recipeId === src.recipeId)) {
          existing.sources.push({ ...src })
        }
      }
    } else {
      // Clone the ingredient and its sources array
      mergedMap.set(key, {
        ...ing,
        sources: ing.sources.map((s) => ({ ...s })),
      })
    }
  }

  return Array.from(mergedMap.values())
}

/**
 * Groups shoppable ingredients by category for store-aisle organization.
 */
export const categorizeShoppableIngredients = (
  ingredients: ShoppableIngredient[],
): ShoppableCategory[] => {
  const categories = new Map<string, ShoppableIngredient[]>()

  const DESIRED_ORDER = [
    'Produce',
    'Meat',
    'Dairy',
    'Bakery',
    'Frozen',
    'Pantry',
    'Spices',
    'Other',
  ]

  // Initialize with empty arrays for desired order
  DESIRED_ORDER.forEach((cat) => categories.set(cat, []))

  for (const ing of ingredients) {
    const cat = ing.category || 'Other'
    let list = categories.get(cat)
    if (!list) {
      list = []
      categories.set(cat, list)
    }
    list.push(ing)
  }

  const result: ShoppableCategory[] = []

  // First, add known categories in order
  for (const catName of DESIRED_ORDER) {
    const items = categories.get(catName)
    if (items && items.length > 0) {
      result.push({ name: catName, items })
      categories.delete(catName)
    }
  }

  // Then add any remaining categories
  for (const [catName, items] of categories.entries()) {
    if (items.length > 0) {
      result.push({ name: catName, items })
    }
  }

  return result
}

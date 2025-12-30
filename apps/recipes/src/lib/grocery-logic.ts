import type { StructuredIngredient, ShoppableIngredient } from './types'

interface GroceryCategory {
  name: string
  items: StructuredIngredient[]
}

interface ShoppableCategory {
  name: string
  items: ShoppableIngredient[]
}

/**
 * Merges a list of structured ingredients by combining duplicates (same name + same unit).
 * @deprecated Use mergeShoppableIngredients for the new grocery list format
 */
export const mergeIngredients = (ingredients: StructuredIngredient[]): StructuredIngredient[] => {
  const mergedMap = new Map<string, StructuredIngredient>()

  for (const ing of ingredients) {
    // inclusive normalize
    const key = `${ing.name.toLowerCase().trim()}|${ing.unit.toLowerCase().trim()}`

    if (mergedMap.has(key)) {
      const existing = mergedMap.get(key)!
      existing.amount += ing.amount

      // Merge source IDs
      if (ing.sourceRecipeIds) {
        const existingIds = existing.sourceRecipeIds || []
        const newIds = ing.sourceRecipeIds.filter((id) => !existingIds.includes(id))
        existing.sourceRecipeIds = [...existingIds, ...newIds]
      }
    } else {
      // Clone and ensure sourceRecipeIds is a new array if present
      mergedMap.set(key, {
        ...ing,
        sourceRecipeIds: ing.sourceRecipeIds ? [...ing.sourceRecipeIds] : [],
      })
    }
  }

  return Array.from(mergedMap.values())
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
 * Groups ingredients by category.
 * @deprecated Use categorizeShoppableIngredients for the new grocery list format
 */
export const categorizeIngredients = (ingredients: StructuredIngredient[]): GroceryCategory[] => {
  const categories = new Map<string, StructuredIngredient[]>()

  // Predefine order if desired, or just dynamic
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
    // Normalize category name to title case if needed, but assuming API gives good data
    let list = categories.get(cat)
    if (!list) {
      list = []
      categories.set(cat, list)
    }
    list.push(ing)
  }

  // Convert to array in desired order, filtering out empty categories
  const result: GroceryCategory[] = []

  // First, add known categories in order
  for (const catName of DESIRED_ORDER) {
    const items = categories.get(catName)
    if (items && items.length > 0) {
      result.push({ name: catName, items })
      categories.delete(catName) // Remove so we don't duplicate
    }
  }

  // Then add any remaining categories (API might return new ones)
  for (const [catName, items] of categories.entries()) {
    if (items.length > 0) {
      result.push({ name: catName, items })
    }
  }

  return result
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

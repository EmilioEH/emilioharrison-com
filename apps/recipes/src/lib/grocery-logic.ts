import type { StructuredIngredient } from './types'

export interface GroceryCategory {
  name: string
  items: StructuredIngredient[]
}

/**
 * Merges a list of structured ingredients by combining duplicates (same name + same unit).
 */
export const mergeIngredients = (ingredients: StructuredIngredient[]): StructuredIngredient[] => {
  const mergedMap = new Map<string, StructuredIngredient>()

  for (const ing of ingredients) {
    // inclusive normalize
    const key = `${ing.name.toLowerCase().trim()}|${ing.unit.toLowerCase().trim()}`

    if (mergedMap.has(key)) {
      const existing = mergedMap.get(key)!
      existing.amount += ing.amount
      // Keep the category of the first occurrence (or could try to be smarter)
    } else {
      mergedMap.set(key, { ...ing }) // Clone to avoid mutation
    }
  }

  return Array.from(mergedMap.values())
}

/**
 * Groups ingredients by category.
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

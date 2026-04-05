import type { ShoppableIngredient, RecipeContribution } from './types'
import { HEB_CATEGORY_ORDER, mapLegacyCategory } from './heb-manor-aisles'

interface ShoppableCategory {
  name: string
  items: ShoppableIngredient[]
}

/**
 * Safely parse sources which may come back as a JSON string from Firestore.
 * Always returns an array (never undefined).
 */
function parseSources(sources: unknown): RecipeContribution[] {
  if (Array.isArray(sources)) {
    return sources
  }
  if (typeof sources === 'string' && sources.startsWith('[')) {
    try {
      const parsed = JSON.parse(sources)
      if (Array.isArray(parsed)) {
        return parsed
      }
    } catch {
      // Invalid JSON, return empty
    }
  }
  return []
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

    // Safe access to sources - handles both arrays and JSON strings from Firestore
    const sources = parseSources(ing.sources)

    if (mergedMap.has(key)) {
      const existing = mergedMap.get(key)!
      existing.purchaseAmount += ing.purchaseAmount

      // Merge sources, avoiding duplicates by recipeId
      const existingSources = existing.sources ?? []
      for (const src of sources) {
        if (!existingSources.some((s) => s.recipeId === src.recipeId)) {
          existingSources.push({ ...src })
        }
      }
      existing.sources = existingSources
    } else {
      // Clone the ingredient and its sources array
      mergedMap.set(key, {
        ...ing,
        sources: sources.map((s) => ({ ...s })),
      })
    }
  }

  return Array.from(mergedMap.values())
}

/**
 * Sorts items within a category by aisle number (ascending), then alphabetically.
 * Perimeter items (no aisle) are sorted alphabetically.
 */
function sortWithinCategory(items: ShoppableIngredient[]): ShoppableIngredient[] {
  return [...items].sort((a, b) => {
    // Items with aisle numbers come first, sorted by aisle
    if (a.aisle !== undefined && b.aisle !== undefined) {
      if (a.aisle !== b.aisle) return a.aisle - b.aisle
    } else if (a.aisle !== undefined) {
      return -1 // a has aisle, b doesn't → a comes first
    } else if (b.aisle !== undefined) {
      return 1 // b has aisle, a doesn't → b comes first
    }
    // Same aisle (or both undefined) → sort alphabetically
    return a.name.localeCompare(b.name)
  })
}

/**
 * Groups shoppable ingredients by category for store-aisle organization.
 * Uses H-E-B Manor walking-path order (19 categories).
 * Handles legacy 8-category data by mapping to new categories.
 */
export const categorizeShoppableIngredients = (
  ingredients: ShoppableIngredient[],
): ShoppableCategory[] => {
  const categories = new Map<string, ShoppableIngredient[]>()

  // Initialize with empty arrays for H-E-B walking-path order
  HEB_CATEGORY_ORDER.forEach((cat) => categories.set(cat, []))

  for (const ing of ingredients) {
    // Map legacy categories to new 19-category system
    const rawCat = ing.category || 'Other'
    const mappedCat = mapLegacyCategory(rawCat, ing.name)

    let list = categories.get(mappedCat)
    if (!list) {
      list = []
      categories.set(mappedCat, list)
    }
    list.push(ing)
  }

  const result: ShoppableCategory[] = []

  // Add categories in H-E-B walking-path order
  for (const catName of HEB_CATEGORY_ORDER) {
    const items = categories.get(catName)
    if (items && items.length > 0) {
      // Sort items within category by aisle, then alphabetically
      result.push({ name: catName, items: sortWithinCategory(items) })
      categories.delete(catName)
    }
  }

  // Add any remaining categories (shouldn't happen with proper mapping)
  for (const [catName, items] of categories.entries()) {
    if (items.length > 0) {
      result.push({ name: catName, items: sortWithinCategory(items) })
    }
  }

  return result
}

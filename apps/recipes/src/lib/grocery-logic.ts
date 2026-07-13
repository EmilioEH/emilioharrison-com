import type { ShoppableIngredient } from './types'
import { GROCERY_CATEGORY_ORDER } from './grocery-suggestions'
import { mapToHebCategory, getCategoryAisle } from './grocery-matcher'

export interface ShoppableCategory {
  name: string
  items: ShoppableIngredient[]
  aisleInfo?: string
}

/**
 * Safely parse sources which may come back as a JSON string from Firestore.
 */
function parseSources(sources: unknown): ShoppableIngredient['sources'] {
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
      for (const src of sources) {
        if (!existing.sources.some((s) => s.recipeId === src.recipeId)) {
          existing.sources.push({ ...src })
        }
      }
    } else {
      mergedMap.set(key, {
        ...ing,
        category: mapToHebCategory(ing.category),
        sources: sources.map((s) => ({ ...s })),
      })
    }
  }

  return Array.from(mergedMap.values())
}

/**
 * Groups shoppable ingredients by category for store-aisle organization.
 * Uses H-E-B Manor 19-category walking order.
 */
export const categorizeShoppableIngredients = (
  ingredients: ShoppableIngredient[],
): ShoppableCategory[] => {
  const categories = new Map<string, ShoppableIngredient[]>()

  for (const ing of ingredients) {
    const cat = mapToHebCategory(ing.category || 'Other')
    let list = categories.get(cat)
    if (!list) {
      list = []
      categories.set(cat, list)
    }
    list.push(ing)
  }

  const result: ShoppableCategory[] = []

  const sortedKeys = Array.from(categories.keys()).sort(
    (a, b) => (GROCERY_CATEGORY_ORDER[a] ?? 99) - (GROCERY_CATEGORY_ORDER[b] ?? 99),
  )

  for (const catName of sortedKeys) {
    const items = categories.get(catName)
    if (items && items.length > 0) {
      result.push({
        name: catName,
        items,
        aisleInfo: getCategoryAisle(catName),
      })
    }
  }

  return result
}

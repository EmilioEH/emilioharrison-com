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
 * Parse a storeLocation string into a structured form for sorting.
 * "Aisle 5" → { type: 'aisle', number: 5 }
 * "In Produce on the Front Wall" → { type: 'perimeter', location: '...' }
 */
export function parseStoreLocation(loc: string): { type: 'aisle'; number: number } | { type: 'perimeter'; location: string } {
  const aisleMatch = loc.match(/^Aisle\s+(\d+)$/i)
  if (aisleMatch) {
    return { type: 'aisle', number: parseInt(aisleMatch[1], 10) }
  }
  return { type: 'perimeter', location: loc }
}

/**
 * Sorts items within a category using storeLocation when available.
 *
 * Priority:
 * 1. Items with storeLocation (sorted by parsed location)
 * 2. Items without storeLocation (fallback to aisle → alphabetical)
 *
 * For numbered aisles: sort ascending, except Frozen Foods which sorts descending
 * (you approach frozen from the pharmacy side and walk back: 15→14→13).
 *
 * For perimeter locations: group by location string, then alphabetically within group.
 */
function sortWithinCategory(items: ShoppableIngredient[], categoryName: string): ShoppableIngredient[] {
  const isFrozen = categoryName === 'Frozen Foods'

  return [...items].sort((a, b) => {
    const hasLocA = !!a.storeLocation
    const hasLocB = !!b.storeLocation

    // Items with storeLocation come before items without
    if (hasLocA && !hasLocB) return -1
    if (!hasLocA && hasLocB) return 1

    // Both have storeLocation — sort by parsed location
    if (hasLocA && hasLocB) {
      const locA = parseStoreLocation(a.storeLocation!)
      const locB = parseStoreLocation(b.storeLocation!)

      // Both are numbered aisles
      if (locA.type === 'aisle' && locB.type === 'aisle') {
        if (locA.number !== locB.number) {
          return isFrozen ? locB.number - locA.number : locA.number - locB.number
        }
        return a.name.localeCompare(b.name)
      }

      // Perimeter locations come before numbered aisles within the same category
      if (locA.type === 'perimeter' && locB.type === 'aisle') return -1
      if (locA.type === 'aisle' && locB.type === 'perimeter') return 1

      // Both are perimeter — group by location string, then alpha
      if (locA.location !== locB.location) {
        return locA.location.localeCompare(locB.location)
      }
      return a.name.localeCompare(b.name)
    }

    // Neither has storeLocation — fall back to aisle number → alphabetical
    if (a.aisle !== undefined && b.aisle !== undefined) {
      if (a.aisle !== b.aisle) {
        return isFrozen ? b.aisle - a.aisle : a.aisle - b.aisle
      }
    } else if (a.aisle !== undefined) {
      return -1
    } else if (b.aisle !== undefined) {
      return 1
    }
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
      result.push({ name: catName, items: sortWithinCategory(items, catName) })
      categories.delete(catName)
    }
  }

  // Add any remaining categories (shouldn't happen with proper mapping)
  for (const [catName, items] of categories.entries()) {
    if (items.length > 0) {
      result.push({ name: catName, items: sortWithinCategory(items, catName) })
    }
  }

  return result
}

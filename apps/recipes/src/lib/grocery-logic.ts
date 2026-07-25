import type { ShoppableIngredient, RecipeContribution } from './types'
import { CATEGORY_ORDER } from './grocery-utils'

interface ShoppableCategory {
  name: string
  items: ShoppableIngredient[]
}

/**
 * Maps legacy category names (from the old 19-category store-layout taxonomy still present on
 * previously generated Firestore lists) onto the fixed 8-category order in `CATEGORY_ORDER`.
 * Unknown categories fall back to 'Other'.
 */
const LEGACY_CATEGORY_MAP: Record<string, string> = {
  Seafood: 'Meat',
  'Deli & Prepared': 'Meat',
  'Bakery & Bread': 'Bakery',
  'Beer & Wine': 'Other',
  'Pantry & Condiments': 'Pantry',
  'Canned & Dry Goods': 'Pantry',
  'Baking & Spices': 'Spices',
  'Breakfast & Cereal': 'Pantry',
  Snacks: 'Pantry',
  Beverages: 'Other',
  'Paper & Household': 'Other',
  Pet: 'Other',
  Baby: 'Other',
  'Personal Care': 'Other',
  'Health & Pharmacy': 'Other',
  'Dairy & Eggs': 'Dairy',
  'Frozen Foods': 'Frozen',

  // Categories the AI invents instead of using the eight canonical names. An audit of the live
  // library found 29 distinct category values across ~5,200 stored ingredients, with roughly a
  // fifth of them landing outside the canonical set and therefore silently filed under "Other" —
  // enough to make the grocery list look broken. Mapped here rather than only tightened in the
  // prompt, so every recipe already saved is corrected at read time without a data migration.
  Seasoning: 'Spices',
  Seasonings: 'Spices',
  Spice: 'Spices',
  Herb: 'Produce', // fresh herbs shop with produce; dried ones arrive as "Spices" already
  Herbs: 'Produce',
  Vegetable: 'Produce',
  Vegetables: 'Produce',
  Fruit: 'Produce',
  Fruits: 'Produce',
  Liquid: 'Pantry',
  Liquids: 'Pantry',
  Fat: 'Pantry',
  Fats: 'Pantry',
  Oil: 'Pantry',
  Oils: 'Pantry',
  Condiment: 'Pantry',
  Condiments: 'Pantry',
  Sauce: 'Pantry',
  Sauces: 'Pantry',
  Grain: 'Pantry',
  Grains: 'Pantry',
  Baking: 'Pantry',
  Canned: 'Pantry',
  Protein: 'Meat',
  Proteins: 'Meat',
  Poultry: 'Meat',
  Beef: 'Meat',
  Pork: 'Meat',
  Fish: 'Meat',
  Bread: 'Bakery',
  Cheese: 'Dairy',
  Garnish: 'Produce',
}

/** Case-insensitive lookup built once from both the canonical names and the alias map above.
 * Stored categories arrive in every casing the model felt like using — `produce`, `Seasoning`,
 * `spice` — and an exact-match lookup sent all of them to "Other" even when the name was
 * otherwise valid. */
const CATEGORY_LOOKUP: Record<string, string> = (() => {
  const lookup: Record<string, string> = {}
  for (const canonical of CATEGORY_ORDER) lookup[canonical.toLowerCase()] = canonical
  for (const [alias, canonical] of Object.entries(LEGACY_CATEGORY_MAP)) {
    lookup[alias.toLowerCase()] = canonical
  }
  return lookup
})()

export function normalizeCategory(rawCategory: string | undefined): string {
  if (typeof rawCategory !== 'string') return 'Other'
  const key = rawCategory.trim().toLowerCase()
  if (!key) return 'Other'
  return CATEGORY_LOOKUP[key] || 'Other'
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
 * Groups shoppable ingredients by category in the fixed `CATEGORY_ORDER`, mapping legacy
 * category names along the way. Items sort alphabetically within each category.
 */
export const categorizeShoppableIngredients = (
  ingredients: ShoppableIngredient[],
): ShoppableCategory[] => {
  const categories = new Map<string, ShoppableIngredient[]>()

  CATEGORY_ORDER.forEach((cat) => categories.set(cat, []))

  for (const ing of ingredients) {
    const mappedCat = normalizeCategory(ing.category)
    let list = categories.get(mappedCat)
    if (!list) {
      list = []
      categories.set(mappedCat, list)
    }
    list.push(ing)
  }

  const result: ShoppableCategory[] = []
  for (const [catName, items] of categories.entries()) {
    if (items.length > 0) {
      result.push({
        name: catName,
        items: [...items].sort((a, b) => a.name.localeCompare(b.name)),
      })
    }
  }

  return result
}

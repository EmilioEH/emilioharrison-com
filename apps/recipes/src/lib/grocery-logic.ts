import type { ShoppableIngredient, RecipeContribution } from './types'
import { CATEGORY_ORDER } from './grocery-utils'
import { normalizeUnit, convert, bestDisplayUnit, unitLabel } from './units'

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
let categoryLookup: Record<string, string> | null = null

/**
 * Built on first use rather than at module load.
 *
 * `grocery-utils` imports `normalizeCategory` from this module while this module imports
 * `CATEGORY_ORDER` from it — a cycle. Reading `CATEGORY_ORDER` during module initialisation
 * therefore touches a binding that may not exist yet, which surfaced in the browser as
 * "Cannot access 'X' before initialization" and took the page down. Deferring the read until the
 * first call means both modules have finished initialising by then.
 */
function getCategoryLookup(): Record<string, string> {
  if (categoryLookup) return categoryLookup
  const lookup: Record<string, string> = {}
  for (const canonical of CATEGORY_ORDER) lookup[canonical.toLowerCase()] = canonical
  for (const [alias, canonical] of Object.entries(LEGACY_CATEGORY_MAP)) {
    lookup[alias.toLowerCase()] = canonical
  }
  categoryLookup = lookup
  return lookup
}

export function normalizeCategory(rawCategory: string | undefined): string {
  if (typeof rawCategory !== 'string') return 'Other'
  const key = rawCategory.trim().toLowerCase()
  if (!key) return 'Other'
  return getCategoryLookup()[key] || 'Other'
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
 * How two lines for the same ingredient are combined.
 *
 * Volume and weight are exactly convertible within themselves, so two recipes wanting 2 tbsp and
 * ¼ cup of oil are asking for 6 tbsp of oil — one line, one number. Matching on the exact unit
 * spelling left those as two rows, which is a worse shopping list than the sum.
 *
 * Counts and imprecise amounts are combined only with their own unit: 2 cloves plus 1 head is not
 * a number anyone can add, and "a pinch" has nothing to add at all.
 */
function mergeGroupFor(ing: ShoppableIngredient): { key: string; unitId: string | null } {
  const name = ing.name.toLowerCase().trim()
  const { id, family } = normalizeUnit(ing.purchaseUnit)

  if (id && (family === 'volume' || family === 'weight')) {
    return { key: `${name}|${family}`, unitId: id }
  }
  return { key: `${name}|${ing.purchaseUnit.toLowerCase().trim()}`, unitId: null }
}

/**
 * Merges shoppable ingredients, combining anything that can be added exactly.
 * Preserves source attribution from all contributing recipes.
 */
export const mergeShoppableIngredients = (
  ingredients: ShoppableIngredient[],
): ShoppableIngredient[] => {
  const mergedMap = new Map<string, ShoppableIngredient>()

  for (const ing of ingredients) {
    const { key, unitId } = mergeGroupFor(ing)

    // Safe access to sources - handles both arrays and JSON strings from Firestore
    const sources = parseSources(ing.sources)

    if (mergedMap.has(key)) {
      const existing = mergedMap.get(key)!

      if (unitId) {
        // Convert into whatever unit this row is already carrying, then let the display unit be
        // reconsidered — 6 tsp of oil should read as 2 tbsp, not stay as 6 tsp.
        const existingUnit = normalizeUnit(existing.purchaseUnit).id ?? unitId
        const converted = convert(ing.purchaseAmount, unitId, existingUnit)
        if (converted === null) {
          existing.purchaseAmount += ing.purchaseAmount
        } else {
          const total = existing.purchaseAmount + converted
          const best = bestDisplayUnit(total, existingUnit)
          // Round before choosing the spelling: converting leaves 48 tsp as 1.0000000002 cups,
          // which would otherwise be labelled "cups".
          const rounded = Math.round(best.amount * 100) / 100
          existing.purchaseAmount = rounded
          existing.purchaseUnit = unitLabel(best.unit, rounded) || best.unit
        }
      } else {
        existing.purchaseAmount += ing.purchaseAmount
      }

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

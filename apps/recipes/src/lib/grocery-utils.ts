import type { Recipe, ShoppableIngredient } from './types'
import { normalizeCategory } from './grocery-logic'

/** Fixed grocery category display order (store-walk order). */
export const CATEGORY_ORDER = [
  'Produce',
  'Meat',
  'Dairy',
  'Bakery',
  'Frozen',
  'Pantry',
  'Spices',
  'Other',
]

/**
 * Maps recipes into `ShoppableIngredient` rows for the "Raw" grocery view — same shape
 * `GroceryList.tsx` already knows how to render (category header, checkbox row, source tag),
 * but with no cross-recipe combining: each ingredient line becomes its own row. Passed to
 * `<GroceryList mergeIngredients={false} .../>` so Raw shares Smart's exact visual/interactive
 * treatment, just uncombined (see WeekWorkspace.tsx).
 *
 * Uses each recipe's already-stored `structuredIngredients` fields (amount/unit/name/category —
 * computed once at import/enhancement time, not a live call) when present, since those are
 * already split the same way Smart's rows display (number + unit + name). Falls back to the
 * basic `ingredients` field — a free-text amount that can't be cleanly split into number+unit
 * without real parsing — shown in the unit slot as-is instead.
 */
export function buildRawShoppableIngredients(recipes: Recipe[]): ShoppableIngredient[] {
  const items: ShoppableIngredient[] = []

  for (const recipe of recipes) {
    if (Array.isArray(recipe.structuredIngredients) && recipe.structuredIngredients.length > 0) {
      for (const ing of recipe.structuredIngredients) {
        items.push({
          name: ing.name,
          purchaseAmount: ing.amount,
          purchaseUnit: ing.unit || 'unit',
          category: normalizeCategory(ing.category),
          sources: [
            {
              recipeId: recipe.id,
              recipeTitle: recipe.title,
              originalAmount: ing.original || `${ing.amount} ${ing.unit}`,
            },
          ],
        })
      }
    } else {
      for (const ing of recipe.ingredients || []) {
        items.push({
          name: ing.name?.toLowerCase() || 'unknown',
          purchaseAmount: 0,
          purchaseUnit: ing.amount || 'unit',
          category: normalizeCategory(undefined),
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

  return items
}

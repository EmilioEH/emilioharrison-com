import type { Recipe, ShoppableIngredient } from './types'

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

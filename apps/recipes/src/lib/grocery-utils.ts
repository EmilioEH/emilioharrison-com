import type { Recipe, ShoppableIngredient } from './types'

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
      if (!existing.sources.some((s) => s.recipeId === recipe.id)) {
        existing.sources.push({
          recipeId: recipe.id,
          recipeTitle: recipe.title,
          originalAmount: `${ing.amount} ${ing.unit}`,
        })
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
      if (!existing.sources.some((s) => s.recipeId === recipe.id)) {
        existing.sources.push({
          recipeId: recipe.id,
          recipeTitle: recipe.title,
          originalAmount: ing.amount ? `${ing.amount} ${ing.name}` : ing.name,
        })
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

/**
 * Aggregates cost estimates across a set of recipes.
 */
export function calculateCostEstimate(recipes: Recipe[]) {
  let total = 0
  let hasEstimate = 0
  let missingEstimate = 0

  for (const recipe of recipes) {
    if (typeof recipe.estimatedCost === 'number' && recipe.estimatedCost > 0) {
      total += recipe.estimatedCost
      hasEstimate++
    } else {
      missingEstimate++
    }
  }

  return {
    total,
    hasEstimate,
    missingEstimate,
    isComplete: missingEstimate === 0 && recipes.length > 0,
    hasAnyData: hasEstimate > 0,
  }
}

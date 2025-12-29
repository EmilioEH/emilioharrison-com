import type { Recipe } from './types'

/**
 * Runtime type guard for Recipe interface.
 * Validates essential fields to prevent runtime crashes.
 */
export function isRecipe(data: unknown): data is Recipe {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const recipe = data as Partial<Recipe>

  // Check required fields
  // Note: Firestore/KV might return these as different types if not careful,
  // but we enforce string/number here.
  const hasId = typeof recipe.id === 'string' && recipe.id.length > 0
  const hasTitle = typeof recipe.title === 'string' && recipe.title.length > 0
  const hasIngredients = Array.isArray(recipe.ingredients)
  const hasSteps = Array.isArray(recipe.steps)

  return hasId && hasTitle && hasIngredients && hasSteps
}

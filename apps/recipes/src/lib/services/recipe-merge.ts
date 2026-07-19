import type { Recipe } from '../types'

/**
 * Array fields an AI reparse (Refresh/Enhancement) can regenerate. A truncated or malformed
 * AI response must never be allowed to overwrite one of these with an empty array — that's
 * silent data loss, not a merge.
 */
const ARRAY_FIELDS_TO_GUARD = [
  'ingredients',
  'steps',
  'structuredSteps',
  'ingredientGroups',
  'stepGroups',
  'structuredIngredients',
] as const

/** Fields captured in a pre-overwrite snapshot (see snapshotRecipe). */
const SNAPSHOT_FIELDS = [
  'title',
  'description',
  'servings',
  'prepTime',
  'cookTime',
  'ingredients',
  'steps',
  'structuredIngredients',
  'structuredSteps',
  'ingredientGroups',
  'stepGroups',
  'stepIngredients',
  'protein',
  'mealType',
  'dishType',
  'equipment',
  'occasion',
  'dietary',
  'cuisine',
  'difficulty',
] as const

export interface RecipeSnapshot {
  savedAt: string
  reason: 'refresh' | 'enhance'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
}

/**
 * Captures the fields an AI reparse can overwrite, taken immediately before that overwrite,
 * so a bad result can be manually restored later.
 */
export function snapshotRecipe(recipe: Recipe, reason: 'refresh' | 'enhance'): RecipeSnapshot {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {}
  for (const field of SNAPSHOT_FIELDS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (recipe as any)[field]
    if (value !== undefined) data[field] = value
  }
  return { savedAt: new Date().toISOString(), reason, data }
}

/**
 * Thrown when an AI reparse result is too sparse to safely merge (see mergeAiRecipeUpdate).
 * Callers should surface this to the user rather than writing a corrupted document.
 */
export class UnusableAiResultError extends Error {}

/**
 * Merges an AI reparse result onto the original recipe for AI Refresh / background
 * Enhancement.
 *
 * - Refuses to merge at all if the result has no title AND no ingredients AND no steps — a
 *   result that sparse isn't a usable recipe, and merging it would only corrupt the original.
 * - Never lets a non-empty array field (ingredients/steps/structuredSteps/groups) be
 *   overwritten by an empty one from a truncated or malformed AI response.
 * - Never blanks out an existing title.
 */
export function mergeAiRecipeUpdate(
  original: Recipe,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aiResult: Record<string, any>,
): Recipe {
  const hasTitle = typeof aiResult.title === 'string' && aiResult.title.trim().length > 0
  const hasIngredients = Array.isArray(aiResult.ingredients) && aiResult.ingredients.length > 0
  const hasSteps = Array.isArray(aiResult.steps) && aiResult.steps.length > 0

  if (!hasTitle && !hasIngredients && !hasSteps) {
    throw new UnusableAiResultError(
      'The AI response was unusable (no title, ingredients, or steps found). The recipe was not changed.',
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const merged: any = {
    ...original,
    ...aiResult,
    updatedAt: new Date().toISOString(),
    title: hasTitle ? aiResult.title : original.title,
    sourceUrl: original.sourceUrl || aiResult.sourceUrl,
    sourceImage: original.sourceImage || aiResult.sourceImage,
    images: original.images || aiResult.images,
  }

  for (const field of ARRAY_FIELDS_TO_GUARD) {
    const newValue = aiResult[field]
    const hasNew = Array.isArray(newValue) && newValue.length > 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalValue = (original as any)[field]
    const hasOriginal = Array.isArray(originalValue) && originalValue.length > 0

    if (hasNew) {
      merged[field] = newValue
    } else if (hasOriginal) {
      merged[field] = originalValue
    }
  }

  return merged as Recipe
}

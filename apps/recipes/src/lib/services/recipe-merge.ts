import type { Recipe } from '../types'
import { normalizeCategory } from '../grocery-logic'

// Mirrors the exact option sets EditRecipeView.tsx's manual-edit dropdowns offer for these
// fields (protein also mirrors ai-parser.ts's PROTEIN_OPTIONS, used in the AI prompts). Kept as
// local copies rather than shared imports — small, stable lists, and it avoids this module
// picking up an unrelated dependency on ai-parser.ts's much heavier prompt-text exports.
const PROTEIN_OPTIONS = [
  'Chicken',
  'Beef',
  'Pork',
  'Fish',
  'Seafood',
  'Vegetarian',
  'Vegan',
  'Other',
]
const MEAL_TYPE_OPTIONS = ['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Snack', 'Dessert']
const DISH_TYPE_OPTIONS = ['Main', 'Side', 'Appetizer', 'Salad', 'Soup', 'Drink', 'Sauce']

/** Case-insensitively matches `value` against `options`, returning the canonically-cased option.
 * An unrecognized (or absent) value resolves to `fallback` — `undefined` for fields with no
 * catch-all option in their dropdown, so a hallucinated value clears rather than mislabels. */
function clampEnum(
  value: string | undefined,
  options: string[],
  fallback?: string,
): string | undefined {
  if (!value) return value
  const match = options.find((opt) => opt.toLowerCase() === value.trim().toLowerCase())
  return match ?? fallback
}

/**
 * Clamps AI-generated protein/mealType/dishType/ingredient-category values to the app's fixed
 * enum sets before a recipe is saved. Without this, a hallucinated value (e.g. "Turkey" instead
 * of one of PROTEIN_OPTIONS) doesn't match any filter pill on the library view, and shows as
 * unselected — not "Turkey" — the next time the recipe is opened in Edit, since the manual-edit
 * `<select>` only recognizes the canonical set. Applied at every AI write path: the initial
 * ai-parse creation (`POST /api/recipes`) and every AI Refresh/Enhancement merge (this file).
 */
export function clampRecipeEnums<T extends Partial<Recipe>>(recipe: T): T {
  return {
    ...recipe,
    protein: clampEnum(recipe.protein, PROTEIN_OPTIONS, 'Other'),
    mealType: clampEnum(recipe.mealType, MEAL_TYPE_OPTIONS),
    dishType: clampEnum(recipe.dishType, DISH_TYPE_OPTIONS),
    structuredIngredients: recipe.structuredIngredients?.map((ing) => ({
      ...ing,
      category: normalizeCategory(ing.category),
    })),
  }
}

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

  return clampRecipeEnums(merged as Recipe)
}

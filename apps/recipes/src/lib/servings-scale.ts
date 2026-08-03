import type { Ingredient, Recipe } from './types'

/**
 * Cooking a recipe for a different number of people.
 *
 * Deliberately narrow: this multiplies numbers and nothing else. Amounts written into instruction
 * prose ("add the 2 cups of stock") are plain text in `steps[]` and are **not** rewritten — a
 * find-and-replace over instructions would be guessing at which numbers are amounts, and getting
 * that wrong in a recipe is worse than leaving the prose alone.
 */

/** Below this the arithmetic is noise; a factor of 1 means there is nothing to do. */
const EPSILON = 1e-9

/**
 * How much to multiply a recipe's amounts by, or `null` when the answer is "leave it alone".
 *
 * `null` rather than `1` so callers can tell "cook it as written" from "cook it as written, but
 * we did the sums" — the UI only shows a rescaled badge for the former.
 */
export function servingsFactor(
  recipeServings: number | null | undefined,
  wanted: number | null | undefined,
): number | null {
  if (typeof recipeServings !== 'number' || !Number.isFinite(recipeServings)) return null
  if (typeof wanted !== 'number' || !Number.isFinite(wanted)) return null
  if (recipeServings <= 0 || wanted <= 0) return null

  const factor = wanted / recipeServings
  if (!Number.isFinite(factor) || factor <= 0) return null
  if (Math.abs(factor - 1) < EPSILON) return null
  return factor
}

/**
 * Round a scaled quantity to something a person would actually write down.
 *
 * `0.6666666666666666 cup` is arithmetically right and useless in a kitchen. Small amounts keep
 * more precision than large ones, because the difference between 1.5 and 2 teaspoons matters and
 * the difference between 1180 and 1200 grams does not.
 */
export function roundQuantity(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return value
  if (value < 1) return Math.round(value * 8) / 8 // eighths — the smallest measure in a kitchen
  if (value < 10) return Math.round(value * 4) / 4 // quarters
  if (value < 100) return Math.round(value * 2) / 2 // halves
  return Math.round(value)
}

/**
 * One ingredient at the new scale.
 *
 * A row with no numeric quantity — "to taste", "1 large lemon" written as prose, "a pinch" — passes
 * through untouched rather than being guessed at. Doubling "salt to taste" has no meaning, and
 * inventing a number for it would be a confident lie about the recipe.
 *
 * `amount` and `original` are the recipe's own printed words, so they are cleared rather than
 * rewritten when the number beneath them changes: leaving "1 pound" beside a scaled quantity of 2
 * is the one outcome worse than showing no free text at all. Consumers already prefer
 * `quantity`/`unit` and fall back to `amount` only when there is no number (see the Raw and Smart
 * grocery paths), so an absent `amount` on a scaled row is never read.
 */
export function scaleIngredient(ingredient: Ingredient, factor: number): Ingredient {
  if (typeof ingredient.quantity !== 'number' || !Number.isFinite(ingredient.quantity)) {
    return ingredient
  }

  const scaled = roundQuantity(ingredient.quantity * factor)
  return {
    ...ingredient,
    quantity: scaled,
    amount: `${formatQuantity(scaled)}${ingredient.unit ? ` ${ingredient.unit}` : ''}`.trim(),
  }
}

/** Every ingredient at the new scale. A factor of `null` returns the list unchanged. */
export function scaleIngredients(
  ingredients: readonly Ingredient[] | undefined,
  factor: number | null,
): Ingredient[] {
  const list = ingredients ?? []
  if (factor === null) return [...list]
  return list.map((ingredient) => scaleIngredient(ingredient, factor))
}

/**
 * A recipe as it would be cooked for `wanted` people.
 *
 * `servings` is updated so anything downstream reading it agrees with the amounts beside it. The
 * stored document is never touched — a serving count chosen for one week must not change the
 * recipe for everyone, forever.
 */
export function scaleRecipe(recipe: Recipe, wanted: number | null | undefined): Recipe {
  const factor = servingsFactor(recipe.servings, wanted)
  if (factor === null) return recipe
  return {
    ...recipe,
    servings: wanted as number,
    ingredients: scaleIngredients(recipe.ingredients, factor),
  }
}

/** "1½", "0.75", "2" — a quantity as a cook would write it. */
export function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) return ''
  if (Number.isInteger(value)) return String(value)

  const whole = Math.floor(value)
  const fraction = value - whole
  const VULGAR: Array<[number, string]> = [
    [0.125, '⅛'],
    [0.25, '¼'],
    [0.333, '⅓'],
    [0.375, '⅜'],
    [0.5, '½'],
    [0.625, '⅝'],
    [0.666, '⅔'],
    [0.75, '¾'],
    [0.875, '⅞'],
  ]
  for (const [amount, glyph] of VULGAR) {
    if (Math.abs(fraction - amount) < 0.01) return whole > 0 ? `${whole}${glyph}` : glyph
  }
  // Not a kitchen fraction: two decimals, trailing zeros dropped.
  return String(Math.round(value * 100) / 100)
}

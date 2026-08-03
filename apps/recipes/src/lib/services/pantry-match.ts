import { ingredientKey, groupIngredientNames } from '../ingredient-names'
import type { Recipe } from '../types'

/**
 * "I already have chicken thighs and spinach" — matching what the cook says they have against the
 * library.
 *
 * This is an exact test on a normalised name, so code does it rather than the model. The same rule
 * that sends the whole menu for "something comforting" (fuzzy, a matter of taste) sends a filtered
 * menu for "uses chicken thighs" (exact, a matter of fact). `ingredientKey` is what makes the test
 * exact without being brittle: it strips prep and size words and singularises, so "Garlic cloves"
 * and "baby spinach" find "garlic" and "spinach".
 *
 * It is not a synonym table, though — "extra virgin olive oil" stays distinct from "olive oil",
 * because the words it drops are prep and size, not adjectives in general. So the chips offered in
 * the UI are drawn from `groupIngredientNames` over the real library, which means what a cook taps
 * is by construction a key that exists. Free text is the path where a near-synonym can miss, and
 * the floor below is what stops that turning into "I found nothing".
 */

/**
 * Filtering hard on five ingredients can leave three recipes, which produces worse suggestions
 * than no filter at all and can trip the "I couldn't find anything" path. So: filter while enough
 * survive, and below this keep the whole library and mark the matches instead.
 */
export const PANTRY_FLOOR = 25

/**
 * A recipe one ingredient short is often the most useful suggestion of all — you are going to the
 * shop anyway. Near-misses stay in, flagged, rather than being filtered out.
 */
export const PANTRY_NEAR_MISS = 1

/** The normalised keys a cook's pantry list stands for. */
export function pantryKeys(pantry: readonly string[]): Set<string> {
  const keys = new Set<string>()
  for (const entry of pantry) {
    const key = ingredientKey(entry)
    if (key) keys.add(key)
  }
  return keys
}

/** How many of the cook's ingredients this recipe actually uses. */
export function pantryMatchCount(recipe: Recipe, keys: ReadonlySet<string>): number {
  if (keys.size === 0) return 0
  const used = new Set<string>()
  for (const ingredient of recipe.ingredients ?? []) {
    const key = ingredientKey(ingredient.name)
    if (key && keys.has(key)) used.add(key)
  }
  return used.size
}

export interface PantryScope {
  /** The recipes to offer. Either the matches, or the whole library when too few matched. */
  recipes: Recipe[]
  /** How many of the cook's ingredients each recipe uses — 0 is omitted. */
  matchesById: Record<string, number>
  /** True when the floor was hit: nothing was filtered out, the matches are only marked. */
  belowFloor: boolean
}

/**
 * Narrow the library to what uses the cook's ingredients — or, if that would leave too little to
 * choose from, leave it whole and simply mark the matches.
 *
 * The pantry must never on its own trigger the `exhausted` path. "You have nothing that uses
 * spinach" is a worse answer than "here are some ideas, two of them use your spinach", and the
 * cook asked for suggestions, not for an audit of their fridge.
 */
export function applyPantry(
  recipes: Recipe[],
  pantry: readonly string[],
  floor: number = PANTRY_FLOOR,
): PantryScope {
  const keys = pantryKeys(pantry)
  if (keys.size === 0) return { recipes, matchesById: {}, belowFloor: false }

  const matchesById: Record<string, number> = {}
  for (const recipe of recipes) {
    const count = pantryMatchCount(recipe, keys)
    if (count > 0) matchesById[recipe.id] = count
  }

  // A near-miss is a recipe that uses all but `PANTRY_NEAR_MISS` of what the cook named. With one
  // ingredient named there is nothing to be one short of, so the rule only bites from two up.
  const wanted = Math.max(1, keys.size - PANTRY_NEAR_MISS)
  const matching = recipes.filter((r) => (matchesById[r.id] ?? 0) >= wanted)

  if (matching.length < floor) {
    return { recipes, matchesById, belowFloor: true }
  }
  return { recipes: matching, matchesById, belowFloor: false }
}

/** "uses 2 of yours" — about four extra tokens on a menu line, and only where there is a match. */
export function pantryMenuMarker(count: number | undefined): string {
  if (!count || count <= 0) return ''
  return `uses ${count} of yours`
}

/**
 * Staples nobody thinks of as "what I have in": naming them narrows nothing, because almost every
 * recipe uses them. Offering them as chips would be offering the cook a way to waste a tap.
 */
const NOT_WORTH_OFFERING = new Set([
  'salt',
  'pepper',
  'black pepper',
  'water',
  'olive oil',
  'oil',
  'sugar',
  'flour',
  'butter',
])

/**
 * The ingredients worth offering as "I have this" chips, commonest first.
 *
 * Drawn from the library itself rather than a fixed list, so a tapped chip is by construction a
 * key that matches something — the same grounding rule the facet chips already follow. A chip that
 * matches nothing is worse than no chip: it reads as a promise the library can't keep, and the
 * cook finds out only after tapping.
 */
export function commonPantryOptions(
  recipes: readonly Recipe[],
  limit = 18,
): Array<{ label: string; value: string }> {
  const counts = new Map<string, number>()
  for (const recipe of recipes) {
    // Once per recipe, not once per line: an ingredient listed twice in one dish is not twice as
    // common across the library.
    const seen = new Set<string>()
    for (const ingredient of recipe.ingredients ?? []) {
      const name = String(ingredient.name ?? '').trim()
      const key = ingredientKey(name)
      if (!key || seen.has(key)) continue
      seen.add(key)
      counts.set(name, (counts.get(name) ?? 0) + 1)
    }
  }

  return groupIngredientNames([...counts].map(([name, count]) => ({ name, count })))
    .filter((group) => !NOT_WORTH_OFFERING.has(group.key) && group.count > 1)
    .slice(0, limit)
    .map((group) => ({ label: group.display, value: group.display }))
}

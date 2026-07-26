/**
 * Turns a volume measurement into a weight, using a fixed table.
 *
 * A cup of flour is 125g and a cup of sugar is 200g, so volume and weight cannot be converted
 * generically — the crossing needs a figure per ingredient. That figure comes from
 * `weight-table.generated.ts`, built once from USDA FoodData Central, reviewed, and committed.
 *
 * **Nothing here calls a model or the network.** The removed styling rule computed these inline
 * per recipe, which is why the same ingredient ended up with different weights in different
 * recipes. One table applied by code gives flour 125g per cup everywhere, and correcting an entry
 * corrects every recipe at once. See RECIPE-FIDELITY-AND-MEASURES-PLAN.md.
 *
 * **It stays silent rather than guessing.** No entry, no quantity, or a measurement that is
 * already a weight or a count all return null. A missing conversion is a small gap; a wrong one
 * looks authoritative and is worse than nothing.
 */

import { convert, normalizeUnit } from './units'
import { ingredientKey } from './ingredient-names'
import { GRAMS_PER_CUP } from './weight-table.generated'

/** Below this, a rounded gram figure is noise — "1/8 tsp of salt (1 g)" helps nobody. */
const MINIMUM_USEFUL_GRAMS = 5

/**
 * Grams for a measured ingredient, or null when that can't be known.
 *
 * Rounded the way a scale reads: whole grams under 100, then to the nearest 5.
 */
export function gramsForIngredient(
  name: string | null | undefined,
  quantity: number | null | undefined,
  unitId: string | null | undefined,
): number | null {
  if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0) return null
  if (!unitId) return null

  // Only volume needs the table. A weight is already the answer, and a count has no fixed volume.
  if (normalizeUnit(unitId).family !== 'volume') return null

  const gramsPerCup = GRAMS_PER_CUP[ingredientKey(name)]
  if (!gramsPerCup) return null

  const cups = convert(quantity, unitId, 'cup')
  if (cups === null) return null

  const grams = cups * gramsPerCup
  if (grams < MINIMUM_USEFUL_GRAMS) return null

  return grams < 100 ? Math.round(grams) : Math.round(grams / 5) * 5
}

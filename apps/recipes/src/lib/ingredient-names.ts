/**
 * Collapses the many ways one ingredient is written into a single key.
 *
 * The library holds **1,484 distinct ingredient names** across ~5,250 entries, but far fewer real
 * ingredients: `garlic` (107) and `garlic cloves` (84) are separate rows, as are `olive oil` and
 * `extra virgin olive oil`. Deduplicating them is what turns that list into something a weight
 * table can be built against — see RECIPE-FIDELITY-AND-MEASURES-PLAN.md.
 *
 * **The distinction that matters here:** preparation words are safe to strip because they don't
 * change what something weighs — chopped parsley weighs the same per cup as parsley. Variety words
 * are NOT safe to strip, because they do: kosher salt is roughly half the density of table salt,
 * and all-purpose flour differs from bread flour. Stripping those would merge genuinely different
 * ingredients and give the table one wrong weight for both.
 *
 * So this only does the mechanically safe part. Anything requiring judgment is left visible for
 * the review step rather than guessed at.
 */

/** Preparation and state — describes what was done to the ingredient, not which ingredient it is. */
const PREP_WORDS = [
  'chopped', 'minced', 'diced', 'sliced', 'grated', 'shredded', 'crushed', 'cubed', 'halved',
  'quartered', 'julienned', 'crumbled', 'torn', 'trimmed', 'peeled', 'rinsed', 'drained',
  'patted dry', 'melted', 'softened', 'chilled', 'room temperature', 'cooled', 'warmed',
  'thinly', 'finely', 'coarsely', 'roughly', 'lightly', 'well',
  'freshly', 'fresh', 'plus more', 'divided', 'packed', 'optional', 'to taste', 'as needed',
  'for serving', 'for garnish', 'for dusting', 'for greasing', 'cut into pieces', 'at room',
]

/** Size adjectives — describe the specimen, not the ingredient. */
const SIZE_WORDS = ['large', 'small', 'medium', 'extra large', 'jumbo', 'baby']

/**
 * Unit words that appear inside the ingredient name. "garlic cloves" is garlic; the clove is how
 * it was counted. Removing these merges the count-form and bare form of the same ingredient.
 */
const TRAILING_UNIT_WORDS = [
  'cloves', 'clove', 'sprigs', 'sprig', 'stalks', 'stalk', 'leaves', 'leaf',
  'heads', 'head', 'bunches', 'bunch', 'slices', 'slice', 'pieces', 'piece',
]

const RE_PREP = new RegExp(`\\b(${PREP_WORDS.join('|')})\\b`, 'gi')
const RE_SIZE = new RegExp(`\\b(${SIZE_WORDS.join('|')})\\b`, 'gi')
const RE_TRAILING_UNIT = new RegExp(`\\s+(${TRAILING_UNIT_WORDS.join('|')})\\s*$`, 'i')

/** Singular in form despite ending in s — stripping these produces nonsense. */
const ALREADY_SINGULAR = new Set([
  'molasses', 'hummus', 'asparagus', 'couscous', 'watercress', 'cress', 'swiss', 'bass',
  'greens', 'grits', 'oats', 'chives',
])

/** Very light singularisation — enough for ingredient names, not a general stemmer. */
function singularize(word: string): string {
  if (word.length <= 3) return word
  if (ALREADY_SINGULAR.has(word)) return word
  if (/(ss|us|is)$/.test(word)) return word
  if (/oes$/.test(word)) return word.slice(0, -2) // tomatoes -> tomato, potatoes -> potato
  if (/ies$/.test(word)) return word.slice(0, -3) + 'y' // berries -> berry
  if (/(ch|sh|x)es$/.test(word)) return word.slice(0, -2) // dishes -> dish
  if (/s$/.test(word)) return word.slice(0, -1)
  return word
}

/**
 * The key an ingredient is grouped under. Two names producing the same key are the same
 * ingredient *for weight purposes*.
 *
 * Note what is deliberately preserved: `kosher salt` and `table salt` stay distinct, as do
 * `all purpose flour` and `bread flour`, because they weigh different amounts per cup.
 */
export function ingredientKey(raw: string | null | undefined): string {
  let name = String(raw ?? '').toLowerCase()

  // Drop parentheticals wholesale — they're prep notes or conversions, never the ingredient.
  name = name.replace(/\([^)]*\)/g, ' ')

  // Anything after a comma is almost always preparation: "carrots, peeled and sliced".
  name = name.split(',')[0]

  name = name.replace(RE_PREP, ' ').replace(RE_SIZE, ' ')
  name = name.replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
  name = name.replace(RE_TRAILING_UNIT, '')

  name = name
    .split(' ')
    .filter(Boolean)
    .map(singularize)
    .join(' ')
    .trim()

  return name
}

export interface IngredientGroup {
  key: string
  /** The most common spelling, used as the human-facing label. */
  display: string
  /** Every raw name that collapsed into this key. */
  variants: string[]
  /** Total times this ingredient appears across the library. */
  count: number
}

/**
 * Groups raw ingredient names into one entry per key.
 *
 * `display` is the most frequent original spelling rather than the normalised key, so the manifest
 * reads like something a person wrote ("olive oil", not "olive oil" stripped of everything).
 */
export function groupIngredientNames(
  entries: Array<{ name: string; count: number }>,
): IngredientGroup[] {
  const groups = new Map<string, { variants: Map<string, number>; count: number }>()

  for (const { name, count } of entries) {
    const key = ingredientKey(name)
    if (!key) continue
    const g = groups.get(key) ?? { variants: new Map(), count: 0 }
    g.variants.set(name, (g.variants.get(name) ?? 0) + count)
    g.count += count
    groups.set(key, g)
  }

  return [...groups.entries()]
    .map(([key, g]) => {
      const variants = [...g.variants.entries()].sort((a, b) => b[1] - a[1])
      return {
        key,
        display: variants[0][0],
        variants: variants.map(([v]) => v),
        count: g.count,
      }
    })
    .sort((a, b) => b.count - a.count)
}

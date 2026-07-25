/**
 * The dish-type vocabulary, in one place.
 *
 * This list was previously written out separately in five files — the enum clamp in
 * recipe-merge, the library's sort order, the edit form's dropdown, and three AI prompts — so
 * adding a value meant finding all five. Everything imports from here now.
 *
 * Baking categories were missing entirely: the library's default grouping is by protein, which
 * bread and cookies have none of, and the alternate dish-type axis offered only
 * Main/Side/Appetizer/Salad/Soup/Drink/Sauce. There was no value in any taxonomy that would
 * surface a loaf of bread, so baked goods were unfindable by design.
 */
export const DISH_TYPE_OPTIONS = [
  'Main',
  'Side',
  'Appetizer',
  'Salad',
  'Soup',
  'Bread',
  'Baked Good',
  'Dessert',
  'Drink',
  'Sauce',
] as const

export type DishType = (typeof DISH_TYPE_OPTIONS)[number]

/** Guidance appended to the AI prompts so the three baking categories don't blur together. */
export const DISH_TYPE_PROMPT_GUIDANCE =
  'Use "Bread" for loaves, rolls and flatbreads; "Dessert" for sweet dishes served to finish a ' +
  'meal (cookies, cakes, pies); "Baked Good" for other baked items such as muffins, scones and ' +
  'savoury pastries.'

/**
 * Best-guess dish type from a recipe title, used only when nothing usable is stored.
 *
 * The ~400 recipes already in the library were categorised before the baking values existed, so
 * they carry "Main" or nothing at all — adding the options alone would leave every existing loaf
 * and cookie exactly as unfindable as before, until each was re-enhanced. Inferring at display
 * time makes them filterable immediately, costs nothing, and is superseded the moment a real
 * value is stored.
 *
 * Ordered most specific first: "banana bread" is a Baked Good, not a Bread.
 */
const TITLE_PATTERNS: Array<[RegExp, DishType]> = [
  [/\b(banana bread|zucchini bread|pumpkin bread|cornbread|corn bread)\b/i, 'Baked Good'],
  [
    /\b(cookie|cookies|brownie|brownies|cake|cupcake|pie|tart|cheesecake|pudding|ice cream|sorbet|mousse|cobbler|crumble)\b/i,
    'Dessert',
  ],
  [
    /\b(muffin|muffins|scone|scones|biscuit|biscuits|croissant|pastry|pastries|danish|donut|doughnut)\b/i,
    'Baked Good',
  ],
  [
    /\b(bread|sourdough|focaccia|baguette|brioche|challah|ciabatta|bagel|bagels|naan|pita|roll|rolls|loaf)\b/i,
    'Bread',
  ],
  [/\b(soup|stew|chowder|bisque|broth)\b/i, 'Soup'],
  [/\b(salad)\b/i, 'Salad'],
  [/\b(sauce|dressing|vinaigrette|marinade|salsa|pesto|aioli)\b/i, 'Sauce'],
  [/\b(smoothie|latte|cocktail|margarita|lemonade|punch|tea|coffee)\b/i, 'Drink'],
]

export function inferDishTypeFromTitle(title: string | undefined): DishType | null {
  if (!title) return null
  for (const [pattern, dishType] of TITLE_PATTERNS) {
    if (pattern.test(title)) return dishType
  }
  return null
}

/**
 * The dish type to group a recipe under. Prefers what's stored, but only when it's a value that
 * actually distinguishes the recipe — a generic "Main" on a cookie recipe is worth overriding,
 * since it predates the baking categories existing.
 */
export function resolveDishType(recipe: { dishType?: string; title?: string }): string {
  const stored = recipe.dishType
  const inferred = inferDishTypeFromTitle(recipe.title)

  if (stored && stored !== 'Main' && stored !== 'Other') return stored
  if (inferred) return inferred
  return stored || 'Other'
}

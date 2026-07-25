import type { Recipe, ShoppableIngredient } from './types'
import { normalizeCategory } from './grocery-logic'

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
 * Maps recipes into `ShoppableIngredient` rows for the "Raw" grocery view — same shape
 * `GroceryList.tsx` already knows how to render (category header, checkbox row, source tag),
 * but with no cross-recipe combining: each ingredient line becomes its own row. Passed to
 * `<GroceryList mergeIngredients={false} .../>` so Raw shares Smart's exact visual/interactive
 * treatment, just uncombined (see WeekWorkspace.tsx).
 *
 * Uses each recipe's already-stored `structuredIngredients` fields (amount/unit/name/category —
 * computed once at import/enhancement time, not a live call) when present, since those are
 * already split the same way Smart's rows display (number + unit + name). Falls back to the
 * basic `ingredients` field — a free-text amount that can't be cleanly split into number+unit
 * without real parsing — shown in the unit slot as-is instead.
 */
/** Verbs that mark a parenthetical as prep instructions rather than a shopping detail. Size and
 * weight parentheticals ("(15-ounce)", "(approx. 800g)") are what you actually shop by, so they
 * stay; "(rinsed, drained and patted dry)" is cooking, and only makes the row harder to scan. */
const PREP_PARENTHETICAL =
  /\((?=[^)]*\b(?:rinsed|drained|patted|chopped|minced|diced|sliced|trimmed|removed|softened|melted|divided|peeled|shredded|grated|cubed|halved|crushed|crosswise|lengthwise|thinly|finely|coarsely|roughly|for (?:serving|garnish|roasting|marinating|the)|to taste|plus more|optional)\b)[^)]*\)/gi

/** Leading quantity text ("1¾ pounds", "½ cup", "4 large") that belongs in the amount column. */
const LEADING_QUANTITY =
  /^[\d\s./¼½¾⅓⅔⅛⅜⅝⅞-]*\s*(?:pounds?|lbs?|ounces?|oz|grams?|g|kg|cups?|tbsps?|tablespoons?|tsps?|teaspoons?|ml|l|liters?|cloves?|cans?|large|medium|small|whole|bunch(?:es)?|heads?|sprigs?|slices?|sticks?|packages?|pinch(?:es)?)?\b\.?\s*/i

/**
 * Reduces a free-text display ingredient to something readable on a shopping list.
 *
 * Only used on the fallback path, where all that exists is a single prose line such as
 * `"1¾ pounds (approx. 800g) bone-in, skin-on chicken parts (any mix of thighs, drumsticks…)"`.
 * That whole sentence previously became the row label — while the amount was *also* rendered
 * beside it, so short entries came out doubled ("½ Tsp ½ Tsp Sea Salt"). Strips the leading
 * quantity when the amount column already carries it, drops prep-only parentheticals, and leaves
 * anything it can't confidently trim alone rather than risk destroying the ingredient.
 */
export function shoppingNameFromDisplayIngredient(rawName: string, amount: string): string {
  let name = String(rawName || '').trim()
  if (!name) return 'unknown'

  // Drop a leading copy of the amount so it isn't printed twice.
  const amt = String(amount || '').trim()
  if (amt && name.toLowerCase().startsWith(amt.toLowerCase())) {
    name = name.slice(amt.length).trim()
  } else if (amt) {
    const stripped = name.replace(LEADING_QUANTITY, '').trim()
    // Only accept the strip if something substantial survives — otherwise the "quantity" was
    // the ingredient (e.g. an entry that is literally just "2 lemons").
    if (stripped.length >= 3) name = stripped
  }

  name = name.replace(PREP_PARENTHETICAL, ' ').replace(/\s{2,}/g, ' ').trim()
  name = name.replace(/[,;:\s]+$/, '').replace(/^[,;:\s]+/, '')

  return name.toLowerCase() || String(rawName).trim().toLowerCase()
}

/** Keyword categoriser for the fallback path, where no stored category exists. Previously every
 * such ingredient was filed under "Other", which is what made a whole week's list look
 * uncategorised. Deliberately conservative: an unrecognised ingredient still lands in "Other". */
// Order is significant — the first match wins, so narrower phrases must be tested before the
// broad single words that would otherwise swallow them. Each rule below is placed to beat a
// specific real collision: "chicken broth" is pantry not meat; "corn tortillas" is bakery not
// produce (corn); "black pepper" and "onion powder" are spices, while "bell pepper" and "yellow
// onion" are produce.
const CATEGORY_KEYWORDS: Array<[RegExp, string]> = [
  [/\b(broth|stock|bouillon)\b/i, 'Pantry'],
  [/\b(chicken|beef|pork|steak|bacon|sausage|turkey|lamb|shrimp|salmon|cod|fish|tofu)\b/i, 'Meat'],
  [/\b(milk|cream|butter|cheese|yogurt|yoghurt|eggs?|buttermilk|parmesan|mozzarella)\b/i, 'Dairy'],
  [/\b(bread|tortillas?|buns?|rolls?|baguette|pita|naan)\b/i, 'Bakery'],
  [/\b(frozen|ice cream)\b/i, 'Frozen'],
  [
    /\b(salt|black pepper|white pepper|peppercorns?|paprika|cumin|coriander|cinnamon|oregano|chili powder|turmeric|nutmeg|cayenne|garlic powder|onion powder|seasoning|spices?)\b/i,
    'Spices',
  ],
  [
    /\b(onions?|garlic|ginger|peppers?|tomato(?:es)?|potato(?:es)?|carrots?|celery|lemons?|limes?|cilantro|parsley|basil|thyme|spinach|lettuce|cabbage|broccoli|cauliflower|mushrooms?|avocados?|apples?|scallions?|shallots?|herbs?|corn|cucumbers?|zucchini|peas)\b/i,
    'Produce',
  ],
  [
    /\b(oil|vinegar|flour|sugar|rice|pasta|beans?|chickpeas?|lentils?|sauce|paste|honey|syrup|canned|powder|extract|water)\b/i,
    'Pantry',
  ],
]

export function guessCategoryFromName(name: string): string {
  const text = String(name || '')
  for (const [pattern, category] of CATEGORY_KEYWORDS) {
    if (pattern.test(text)) return category
  }
  return 'Other'
}

export function buildRawShoppableIngredients(recipes: Recipe[]): ShoppableIngredient[] {
  const items: ShoppableIngredient[] = []

  for (const recipe of recipes) {
    if (Array.isArray(recipe.structuredIngredients) && recipe.structuredIngredients.length > 0) {
      for (const ing of recipe.structuredIngredients) {
        items.push({
          name: ing.name,
          purchaseAmount: ing.amount,
          purchaseUnit: ing.unit || 'unit',
          category: normalizeCategory(ing.category),
          sources: [
            {
              recipeId: recipe.id,
              recipeTitle: recipe.title,
              originalAmount: ing.original || `${ing.amount} ${ing.unit}`,
            },
          ],
        })
      }
    } else {
      for (const ing of recipe.ingredients || []) {
        const rawName = ing.name || ''
        const amount = ing.amount || ''
        items.push({
          name: shoppingNameFromDisplayIngredient(rawName, amount),
          purchaseAmount: 0,
          purchaseUnit: amount || 'unit',
          category: guessCategoryFromName(rawName),
          sources: [
            {
              recipeId: recipe.id,
              recipeTitle: recipe.title,
              originalAmount: amount ? `${amount} ${rawName}` : rawName,
            },
          ],
        })
      }
    }
  }

  return items
}

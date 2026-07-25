import { describe, it, expect } from 'vitest'
import { normalizeCategory } from './grocery-logic'
import {
  shoppingNameFromDisplayIngredient,
  guessCategoryFromName,
  buildRawShoppableIngredients,
} from './grocery-utils'
import type { Recipe } from './types'

describe('normalizeCategory', () => {
  it('passes canonical names through unchanged', () => {
    for (const c of ['Produce', 'Meat', 'Dairy', 'Bakery', 'Frozen', 'Pantry', 'Spices', 'Other']) {
      expect(normalizeCategory(c)).toBe(c)
    }
  })

  // An audit of the live library found these exact lowercase values stored on real recipes —
  // 'produce' (83), 'seasoning' (76), 'spice' (56), 'dairy' (44), 'vegetable' (42). Every one
  // used to fall through to "Other" purely because the lookup was case-sensitive.
  it('accepts canonical names in any casing (regression: whole list showed as "Other")', () => {
    expect(normalizeCategory('produce')).toBe('Produce')
    expect(normalizeCategory('dairy')).toBe('Dairy')
    expect(normalizeCategory('pantry')).toBe('Pantry')
    expect(normalizeCategory('MEAT')).toBe('Meat')
    expect(normalizeCategory('  Produce  ')).toBe('Produce')
  })

  it('maps the synonyms the AI actually emits onto canonical categories', () => {
    expect(normalizeCategory('Seasoning')).toBe('Spices')
    expect(normalizeCategory('seasoning')).toBe('Spices')
    expect(normalizeCategory('Spice')).toBe('Spices')
    expect(normalizeCategory('Vegetable')).toBe('Produce')
    expect(normalizeCategory('Herb')).toBe('Produce')
    expect(normalizeCategory('Liquid')).toBe('Pantry')
    expect(normalizeCategory('Fat')).toBe('Pantry')
    expect(normalizeCategory('Oil')).toBe('Pantry')
    expect(normalizeCategory('Condiment')).toBe('Pantry')
    expect(normalizeCategory('Protein')).toBe('Meat')
    expect(normalizeCategory('Seafood')).toBe('Meat')
  })

  it('still falls back to Other for genuinely unknown values', () => {
    expect(normalizeCategory('Sorcery')).toBe('Other')
    expect(normalizeCategory(undefined)).toBe('Other')
    expect(normalizeCategory('')).toBe('Other')
  })
})

describe('shoppingNameFromDisplayIngredient', () => {
  it('drops a leading copy of the amount (regression: "½ Tsp ½ Tsp Sea Salt")', () => {
    expect(shoppingNameFromDisplayIngredient('½ Tsp Sea Salt', '½ Tsp')).toBe('sea salt')
    expect(shoppingNameFromDisplayIngredient('2 Tbsp Lemon Juice', '2 Tbsp')).toBe('lemon juice')
  })

  it('strips prep-only parentheticals but keeps size and weight ones', () => {
    // Real entry from the library.
    const real =
      '1¾ pounds (approx. 800g) bone-in, skin-on chicken parts (any mix of thighs, drumsticks, or breasts; for breasts, skin removed and cut in half crosswise)'
    const out = shoppingNameFromDisplayIngredient(real, '')
    expect(out).toContain('chicken parts')
    expect(out).toContain('approx. 800g')
    expect(out).not.toContain('skin removed')
  })

  it('removes a leading quantity even when the amount column is separate', () => {
    expect(shoppingNameFromDisplayIngredient('4 large garlic cloves', '4 large')).toBe(
      'garlic cloves',
    )
  })

  it('never destroys an ingredient that is mostly quantity words', () => {
    // "2 lemons" — stripping the quantity would leave almost nothing, so keep it intact.
    expect(shoppingNameFromDisplayIngredient('2 lemons', '2')).toBe('lemons')
    expect(shoppingNameFromDisplayIngredient('salt', '')).toBe('salt')
  })

  it('falls back to a readable label rather than an empty string', () => {
    expect(shoppingNameFromDisplayIngredient('', '')).toBe('unknown')
  })
})

describe('guessCategoryFromName', () => {
  it('categorises common ingredients instead of dumping everything in Other', () => {
    expect(guessCategoryFromName('bone-in chicken thighs')).toBe('Meat')
    expect(guessCategoryFromName('nonfat plain Greek yogurt')).toBe('Dairy')
    expect(guessCategoryFromName('yellow onion')).toBe('Produce')
    expect(guessCategoryFromName('corn tortillas')).toBe('Bakery')
    expect(guessCategoryFromName('smoked paprika')).toBe('Spices')
    expect(guessCategoryFromName('extra virgin olive oil')).toBe('Pantry')
  })

  it('leaves genuinely unrecognisable items in Other', () => {
    expect(guessCategoryFromName('asafoetida')).toBe('Other')
    expect(guessCategoryFromName('')).toBe('Other')
  })

  // Each of these is a real collision between two keyword rules; the ordering of
  // CATEGORY_KEYWORDS is what resolves them, so they'd regress silently on a reorder.
  it('resolves ingredients that match more than one category rule', () => {
    expect(guessCategoryFromName('chicken broth')).toBe('Pantry') // not Meat
    expect(guessCategoryFromName('corn tortillas')).toBe('Bakery') // not Produce ("corn")
    expect(guessCategoryFromName('freshly ground black pepper')).toBe('Spices')
    expect(guessCategoryFromName('bell pepper')).toBe('Produce')
    expect(guessCategoryFromName('onion powder')).toBe('Spices')
    expect(guessCategoryFromName('yellow onion')).toBe('Produce')
    expect(guessCategoryFromName('garlic powder')).toBe('Spices')
    expect(guessCategoryFromName('garlic cloves')).toBe('Produce')
  })
})

describe('buildRawShoppableIngredients', () => {
  // Mirrors the real stored shape for "Sheet Pan Tandoori Chicken": clean structured data
  // alongside a verbose display line. The grocery list was reading the wrong one.
  const tandoori = {
    id: 'r1',
    title: 'Sheet Pan Tandoori Chicken',
    servings: 4,
    prepTime: 20,
    cookTime: 30,
    ingredients: [
      {
        name: '1¾ pounds (approx. 800g) bone-in, skin-on chicken parts (any mix of thighs, drumsticks, or breasts; for breasts, skin removed and cut in half crosswise)',
        amount: '',
      },
    ],
    structuredIngredients: [
      { original: '', name: 'chicken parts', amount: 1.75, unit: 'lb', category: 'Meat' },
    ],
    steps: ['Roast.'],
  } as unknown as Recipe

  it('uses the clean structured ingredients when they are present', () => {
    const [item] = buildRawShoppableIngredients([tandoori])

    expect(item.name).toBe('chicken parts')
    expect(item.purchaseAmount).toBe(1.75)
    expect(item.purchaseUnit).toBe('lb')
    expect(item.category).toBe('Meat')
  })

  it('normalises a non-canonical stored category instead of dropping it in Other', () => {
    const recipe = {
      ...tandoori,
      structuredIngredients: [
        { original: '', name: 'buttermilk', amount: 4, unit: 'cups', category: 'liquid' },
      ],
    } as unknown as Recipe

    expect(buildRawShoppableIngredients([recipe])[0].category).toBe('Pantry')
  })

  // The fallback path — hit whenever a recipe reaches the grocery list without its structured
  // ingredients. It used to file every row under "Other" and use the full verbose sentence as
  // the label; now it degrades to something shoppable.
  it('degrades gracefully when structured ingredients are missing', () => {
    const noStructured = {
      ...tandoori,
      structuredIngredients: undefined,
    } as unknown as Recipe

    const [item] = buildRawShoppableIngredients([noStructured])

    expect(item.category).toBe('Meat')
    expect(item.name).toContain('chicken parts')
    expect(item.name).not.toContain('skin removed')
  })

  it('does not print the amount twice on the fallback path', () => {
    const recipe = {
      ...tandoori,
      structuredIngredients: undefined,
      ingredients: [{ name: '½ Tsp Sea Salt', amount: '½ Tsp' }],
    } as unknown as Recipe

    const [item] = buildRawShoppableIngredients([recipe])

    expect(item.purchaseUnit).toBe('½ Tsp')
    expect(item.name).toBe('sea salt')
  })
})

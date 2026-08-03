import { describe, it, expect } from 'vitest'
import {
  servingsFactor,
  roundQuantity,
  scaleIngredient,
  scaleIngredients,
  scaleRecipe,
  formatQuantity,
} from './servings-scale'
import type { Ingredient, Recipe } from './types'

const ing = (over: Partial<Ingredient> = {}): Ingredient => ({
  name: 'flour',
  amount: '2 cups',
  quantity: 2,
  unit: 'cup',
  ...over,
})

describe('servingsFactor', () => {
  it('is the ratio of wanted to written', () => {
    expect(servingsFactor(4, 6)).toBe(1.5)
    expect(servingsFactor(4, 2)).toBe(0.5)
  })

  it('says there is nothing to do when the counts match', () => {
    expect(servingsFactor(4, 4)).toBeNull()
  })

  it('refuses nonsense rather than producing it', () => {
    expect(servingsFactor(0, 4)).toBeNull()
    expect(servingsFactor(4, 0)).toBeNull()
    expect(servingsFactor(4, -2)).toBeNull()
    expect(servingsFactor(undefined, 4)).toBeNull()
    expect(servingsFactor(4, undefined)).toBeNull()
    expect(servingsFactor(NaN, 4)).toBeNull()
  })
})

describe('roundQuantity', () => {
  it('keeps small amounts precise and large amounts round', () => {
    // ⅔ cup, not 0.6666666666666666 cup.
    expect(roundQuantity(0.6666666)).toBeCloseTo(0.625, 5)
    expect(roundQuantity(1.6)).toBe(1.5)
    expect(roundQuantity(37.3)).toBe(37.5)
    expect(roundQuantity(1183)).toBe(1183)
  })
})

describe('scaleIngredient', () => {
  it('multiplies the number and keeps the unit', () => {
    const out = scaleIngredient(ing(), 1.5)
    expect(out.quantity).toBe(3)
    expect(out.unit).toBe('cup')
  })

  it('leaves a row with no number completely alone', () => {
    // "Salt to taste" doubled is still "salt to taste". Inventing a number here would be a
    // confident lie about the recipe.
    const toTaste = ing({ name: 'salt', amount: 'to taste', quantity: undefined, unit: undefined })
    expect(scaleIngredient(toTaste, 2)).toEqual(toTaste)
  })

  it('never leaves the old printed amount beside a new number', () => {
    // The one outcome worse than losing the free text: "1 pound" sitting next to a quantity of 2.
    const out = scaleIngredient(ing({ amount: '2 cups' }), 2)
    expect(out.quantity).toBe(4)
    expect(out.amount).not.toContain('2 cups')
  })

  it('handles a fractional result a cook can read', () => {
    const out = scaleIngredient(ing({ quantity: 1, unit: 'tsp', amount: '1 tsp' }), 0.5)
    expect(out.quantity).toBe(0.5)
    expect(out.amount).toBe('½ tsp')
  })
})

describe('scaleIngredients', () => {
  it('returns the list unchanged when there is nothing to scale', () => {
    const list = [ing(), ing({ name: 'salt', quantity: undefined })]
    expect(scaleIngredients(list, null)).toEqual(list)
  })

  it('copes with no ingredients at all', () => {
    expect(scaleIngredients(undefined, 2)).toEqual([])
  })
})

describe('scaleRecipe', () => {
  const recipe = {
    id: 'r1',
    title: 'Stew',
    servings: 4,
    ingredients: [ing(), ing({ name: 'salt', amount: 'a pinch', quantity: undefined })],
    steps: ['Add the 2 cups of flour.'],
  } as unknown as Recipe

  it('scales the amounts and updates the serving count to match', () => {
    const out = scaleRecipe(recipe, 6)
    expect(out.servings).toBe(6)
    expect(out.ingredients?.[0].quantity).toBe(3)
    expect(out.ingredients?.[1].amount).toBe('a pinch')
  })

  it('never mutates the stored recipe', () => {
    // A serving count chosen for one week must not change the recipe for everyone forever.
    scaleRecipe(recipe, 8)
    expect(recipe.servings).toBe(4)
    expect(recipe.ingredients?.[0].quantity).toBe(2)
  })

  it('leaves amounts written into instruction prose alone', () => {
    // Documented and deliberate: rewriting numbers inside steps means guessing which are amounts.
    const out = scaleRecipe(recipe, 8)
    expect(out.steps?.[0]).toBe('Add the 2 cups of flour.')
  })

  it('returns the same recipe when no change is called for', () => {
    expect(scaleRecipe(recipe, 4)).toBe(recipe)
    expect(scaleRecipe(recipe, undefined)).toBe(recipe)
  })
})

describe('formatQuantity', () => {
  it('writes kitchen fractions the way a cook does', () => {
    expect(formatQuantity(0.5)).toBe('½')
    expect(formatQuantity(1.5)).toBe('1½')
    expect(formatQuantity(0.25)).toBe('¼')
    expect(formatQuantity(2.75)).toBe('2¾')
  })

  it('leaves whole numbers whole', () => {
    expect(formatQuantity(3)).toBe('3')
  })

  it('falls back to decimals for anything that is not a kitchen fraction', () => {
    expect(formatQuantity(1.1)).toBe('1.1')
  })
})

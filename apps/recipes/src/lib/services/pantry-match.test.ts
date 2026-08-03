import { describe, it, expect } from 'vitest'
import {
  pantryKeys,
  pantryMatchCount,
  applyPantry,
  pantryMenuMarker,
  PANTRY_FLOOR,
} from './pantry-match'
import type { Recipe } from '../types'

const recipe = (id: string, ingredients: string[]): Recipe =>
  ({
    id,
    title: `Recipe ${id}`,
    servings: 4,
    prepTime: 10,
    cookTime: 20,
    ingredients: ingredients.map((name) => ({ name, amount: '1' })),
    steps: [],
  }) as unknown as Recipe

/** Enough filler that the floor is not tripped unless a test means to trip it. */
const filler = (n: number) => Array.from({ length: n }, (_, i) => recipe(`f${i}`, ['water']))

describe('pantryKeys', () => {
  it('normalises what the cook typed', () => {
    // The whole reason this is exact-but-not-brittle: "Garlic cloves" and "garlic" are the same
    // thing to a cook, and `ingredientKey` already knows that.
    const keys = pantryKeys(['Garlic cloves', 'Baby Spinach'])
    expect(keys.has('garlic')).toBe(true)
    expect(keys.has('spinach')).toBe(true)
  })

  it('is not a synonym table', () => {
    // Documented limit, not an oversight: `ingredientKey` drops prep and size words, not
    // adjectives in general. This is why the UI offers chips drawn from the real library — a
    // tapped chip is a key that exists by construction — and why free text has the floor
    // underneath it.
    expect(pantryKeys(['extra virgin olive oil']).has('olive oil')).toBe(false)
  })

  it('drops anything that normalises to nothing', () => {
    expect(pantryKeys(['', '   ', '!!!']).size).toBe(0)
  })
})

describe('pantryMatchCount', () => {
  const keys = pantryKeys(['chicken thighs', 'spinach'])

  it('counts how many of the cook’s ingredients a recipe uses', () => {
    expect(pantryMatchCount(recipe('a', ['chicken thighs', 'spinach', 'rice']), keys)).toBe(2)
    expect(pantryMatchCount(recipe('b', ['spinach', 'feta']), keys)).toBe(1)
    expect(pantryMatchCount(recipe('c', ['beef', 'rice']), keys)).toBe(0)
  })

  it('counts each ingredient once however many times it appears', () => {
    expect(pantryMatchCount(recipe('d', ['spinach', 'baby spinach']), keys)).toBe(1)
  })

  it('is zero when the cook named nothing', () => {
    expect(pantryMatchCount(recipe('a', ['spinach']), pantryKeys([]))).toBe(0)
  })
})

describe('applyPantry', () => {
  it('does nothing at all when the cook named nothing', () => {
    const all = filler(3)
    const scope = applyPantry(all, [])
    expect(scope.recipes).toBe(all)
    expect(scope.belowFloor).toBe(false)
  })

  it('narrows to the matches when enough survive', () => {
    const matches = Array.from({ length: PANTRY_FLOOR }, (_, i) => recipe(`m${i}`, ['spinach']))
    const scope = applyPantry([...matches, ...filler(50)], ['spinach'])
    expect(scope.belowFloor).toBe(false)
    expect(scope.recipes).toHaveLength(PANTRY_FLOOR)
    expect(scope.recipes.every((r) => r.id.startsWith('m'))).toBe(true)
  })

  it('keeps the whole library rather than offering a handful', () => {
    // Filtering hard on a rare ingredient leaves three recipes, which is a worse answer than no
    // filter at all — and must never be mistaken for "there is nothing I can suggest".
    const all = [recipe('m1', ['saffron']), ...filler(40)]
    const scope = applyPantry(all, ['saffron'])
    expect(scope.belowFloor).toBe(true)
    expect(scope.recipes).toHaveLength(41)
    // The match is still marked, which is the whole point of not filtering.
    expect(scope.matchesById['m1']).toBe(1)
  })

  it('lets a recipe one ingredient short through the filter', () => {
    // Two named, so a recipe using either is a near-miss and worth offering: you are going to the
    // shop anyway, and "you have most of this already" is the useful suggestion.
    const near = Array.from({ length: PANTRY_FLOOR }, (_, i) => recipe(`n${i}`, ['spinach']))
    const scope = applyPantry([...near, ...filler(50)], ['spinach', 'feta'])
    expect(scope.belowFloor).toBe(false)
    expect(scope.recipes).toHaveLength(PANTRY_FLOOR)
    expect(scope.matchesById['n0']).toBe(1)
  })

  it('still requires a match when only one ingredient was named', () => {
    // With one named there is nothing to be one short of; otherwise everything would "qualify".
    const matches = Array.from({ length: PANTRY_FLOOR }, (_, i) => recipe(`m${i}`, ['spinach']))
    const scope = applyPantry([...matches, ...filler(50)], ['spinach'])
    expect(scope.recipes.every((r) => r.id.startsWith('m'))).toBe(true)
  })

  it('marks matches even in the library it did not narrow', () => {
    const all = [recipe('m1', ['spinach']), recipe('m2', ['beef']), ...filler(2)]
    const scope = applyPantry(all, ['spinach'])
    expect(scope.matchesById).toEqual({ m1: 1 })
  })
})

describe('pantryMenuMarker', () => {
  it('says how many, in about four tokens', () => {
    expect(pantryMenuMarker(2)).toBe('uses 2 of yours')
  })

  it('says nothing when there is no match', () => {
    expect(pantryMenuMarker(0)).toBe('')
    expect(pantryMenuMarker(undefined)).toBe('')
  })
})

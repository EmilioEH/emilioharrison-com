import { describe, it, expect } from 'vitest'
import {
  groceryListSignature,
  signaturesMatch,
  needsGroceryRegeneration,
  mergeGroceryIngredients,
} from './grocery-signature'
import type { ShoppableIngredient } from './types'

const item = (over: Partial<ShoppableIngredient> = {}): ShoppableIngredient => ({
  name: 'garlic',
  purchaseAmount: 1,
  purchaseUnit: 'head',
  category: 'Produce',
  ...over,
})

describe('groceryListSignature', () => {
  it('sorts and de-duplicates', () => {
    expect(groceryListSignature(['c', 'a', 'b', 'a'])).toEqual(['a', 'b', 'c'])
  })

  it('drops empty ids', () => {
    expect(groceryListSignature(['a', '', 'b'])).toEqual(['a', 'b'])
  })
})

describe('groceryListSignature with servings', () => {
  it('leaves a recipe at its own servings as a bare id', () => {
    // So lists signed before servings existed keep comparing equal, instead of every list in the
    // world regenerating once on deploy.
    expect(groceryListSignature([{ id: 'a' }, { id: 'b', servings: undefined }])).toEqual([
      'a',
      'b',
    ])
  })

  it('makes a chosen count part of the entry', () => {
    expect(groceryListSignature([{ id: 'a', servings: 6 }])).toEqual(['a@6'])
  })

  it('treats the same recipe at two counts as two requirements', () => {
    expect(signaturesMatch(['a'], [{ id: 'a', servings: 6 }])).toBe(false)
    expect(signaturesMatch(['a@6'], [{ id: 'a', servings: 8 }])).toBe(false)
    expect(signaturesMatch(['a@6'], [{ id: 'a', servings: 6 }])).toBe(true)
  })

  it('regenerates the list when only the servings changed', () => {
    expect(
      needsGroceryRegeneration({
        resolved: true,
        list: { sourceRecipeIds: ['a', 'b'] },
        currentRecipeIds: [{ id: 'a', servings: 6 }, { id: 'b' }],
      }),
    ).toBe(true)
  })
})

describe('signaturesMatch', () => {
  it('treats the same set in a different order as unchanged', () => {
    expect(signaturesMatch(['b', 'a'], ['a', 'b'])).toBe(true)
  })

  it('notices an added recipe', () => {
    expect(signaturesMatch(['a'], ['a', 'b'])).toBe(false)
  })

  it('notices a removed recipe', () => {
    expect(signaturesMatch(['a', 'b'], ['a'])).toBe(false)
  })

  it('notices a swap that keeps the count the same', () => {
    expect(signaturesMatch(['a', 'b'], ['a', 'c'])).toBe(false)
  })

  it('does not answer when there is no stored signature', () => {
    expect(signaturesMatch(undefined, ['a'])).toBeUndefined()
  })
})

describe('needsGroceryRegeneration', () => {
  const currentRecipeIds = ['a', 'b']

  it('never generates before the subscription has reported', () => {
    expect(needsGroceryRegeneration({ resolved: false, list: null, currentRecipeIds })).toBe(false)
  })

  it('generates when the subscription has reported no document', () => {
    expect(needsGroceryRegeneration({ resolved: true, list: null, currentRecipeIds })).toBe(true)
  })

  it('leaves a matching list alone', () => {
    expect(
      needsGroceryRegeneration({
        resolved: true,
        list: { sourceRecipeIds: ['b', 'a'] },
        currentRecipeIds,
      }),
    ).toBe(false)
  })

  it('regenerates when a recipe was removed from the week', () => {
    expect(
      needsGroceryRegeneration({
        resolved: true,
        list: { sourceRecipeIds: ['a', 'b', 'c'] },
        currentRecipeIds,
      }),
    ).toBe(true)
  })

  it('regenerates a pre-signature list exactly once', () => {
    expect(needsGroceryRegeneration({ resolved: true, list: {}, currentRecipeIds })).toBe(true)
    // ...and once it has been stamped, it settles.
    expect(
      needsGroceryRegeneration({
        resolved: true,
        list: { sourceRecipeIds: currentRecipeIds },
        currentRecipeIds,
      }),
    ).toBe(false)
  })

  it('does not generate a list for an empty week', () => {
    expect(needsGroceryRegeneration({ resolved: true, list: null, currentRecipeIds: [] })).toBe(
      false,
    )
  })
})

describe('mergeGroceryIngredients', () => {
  it('keeps a hand-added item that the AI knows nothing about', () => {
    const previous = [item({ name: 'batteries', purchaseUnit: 'pack', isManual: true })]
    const merged = mergeGroceryIngredients(previous, [item()])
    expect(merged.map((i) => i.name)).toEqual(['garlic', 'batteries'])
  })

  it('carries ticked-off and not-needed marks onto the regenerated item', () => {
    const previous = [item({ archivedAt: '2026-08-01T10:00:00.000Z', unneededThisWeek: true })]
    const merged = mergeGroceryIngredients(previous, [item({ purchaseAmount: 3 })])
    expect(merged).toHaveLength(1)
    expect(merged[0].purchaseAmount).toBe(3)
    expect(merged[0].archivedAt).toBe('2026-08-01T10:00:00.000Z')
    expect(merged[0].unneededThisWeek).toBe(true)
  })

  it('matches on name and unit case-insensitively', () => {
    const previous = [item({ name: 'Garlic', purchaseUnit: 'Head', archivedAt: 'x' })]
    const merged = mergeGroceryIngredients(previous, [item()])
    expect(merged).toHaveLength(1)
    expect(merged[0].archivedAt).toBe('x')
  })

  it('treats a different purchase unit as a different item', () => {
    const previous = [item({ purchaseUnit: 'clove', isManual: true, archivedAt: 'x' })]
    const merged = mergeGroceryIngredients(previous, [item({ purchaseUnit: 'head' })])
    expect(merged).toHaveLength(2)
    expect(merged[0].archivedAt).toBeUndefined()
  })

  it('drops a generated item whose recipe left the week', () => {
    const previous = [item({ name: 'saffron', purchaseUnit: 'g' })]
    const merged = mergeGroceryIngredients(previous, [item()])
    expect(merged.map((i) => i.name)).toEqual(['garlic'])
  })

  it('is a no-op when there was no previous list', () => {
    const generated = [item()]
    expect(mergeGroceryIngredients(undefined, generated)).toEqual(generated)
  })
})

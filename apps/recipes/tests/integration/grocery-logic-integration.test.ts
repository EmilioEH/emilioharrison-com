import { describe, it, expect } from 'vitest'
import { mergeShoppableIngredients } from '../../src/lib/grocery-logic'
import type { ShoppableIngredient } from '../../src/lib/types'

describe('Integration: Grocery Logic', () => {
  describe('mergeShoppableIngredients', () => {
    it('should merge duplicate ingredients and sum their amounts', () => {
      const input: ShoppableIngredient[] = [
        {
          name: 'flour',
          purchaseAmount: 2,
          purchaseUnit: 'bags',
          category: 'Pantry',
          sources: [{ recipeId: '1', recipeTitle: 'Cake', originalAmount: '2 cups' }],
        },
        {
          name: 'Flour', // Case insensitive check
          purchaseAmount: 1,
          purchaseUnit: 'bags',
          category: 'Pantry',
          sources: [{ recipeId: '2', recipeTitle: 'Bread', originalAmount: '1 cup' }],
        },
      ]

      const result = mergeShoppableIngredients(input)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('flour')
      expect(result[0].purchaseAmount).toBe(3)
      expect(result[0].sources).toHaveLength(2)
      expect(result[0].sources).toEqual([
        { recipeId: '1', recipeTitle: 'Cake', originalAmount: '2 cups' },
        { recipeId: '2', recipeTitle: 'Bread', originalAmount: '1 cup' },
      ])
    })

    it('merges units of the same family, and only those', () => {
      const input: ShoppableIngredient[] = [
        {
          name: 'milk',
          purchaseAmount: 1,
          purchaseUnit: 'gallon',
          category: 'Dairy',
          sources: [],
        },
        {
          name: 'milk',
          purchaseAmount: 1,
          purchaseUnit: 'cup', // Same family — a gallon and a cup of milk add up.
          category: 'Dairy',
          sources: [],
        },
        {
          name: 'milk',
          purchaseAmount: 1,
          purchaseUnit: 'lb', // A different family — cannot be added without a density.
          category: 'Dairy',
          sources: [],
        },
      ]

      const result = mergeShoppableIngredients(input)
      expect(result).toHaveLength(2)
      // 1 gallon + 1 cup = 17 cups. It reads in cups rather than gallons because `bestDisplayUnit`
      // only promotes into units recipes are actually written in — turning that into a
      // purchasable quantity is the Smart list's AI pass, further down the pipeline.
      const volume = result.find((r) => r.purchaseUnit !== 'lb')!
      expect(volume.purchaseAmount).toBeCloseTo(17, 1)
      expect(volume.purchaseUnit).toBe('cups')
    })

    it('should deduplicate sources from the same recipe', () => {
      const input: ShoppableIngredient[] = [
        {
          name: 'sugar',
          purchaseAmount: 1,
          purchaseUnit: 'bag',
          category: 'Pantry',
          sources: [{ recipeId: '1', recipeTitle: 'Cake', originalAmount: '1 cup' }],
        },
        {
          name: 'sugar',
          purchaseAmount: 1,
          purchaseUnit: 'bag',
          category: 'Pantry',
          sources: [{ recipeId: '1', recipeTitle: 'Cake', originalAmount: '1 cup' }], // Duplicate source
        },
      ]

      const result = mergeShoppableIngredients(input)
      expect(result[0].sources).toHaveLength(1)
      expect(result[0].sources?.[0].recipeId).toBe('1')
    })
  })
})

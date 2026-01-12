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

    it('should not merge if units differ', () => {
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
          purchaseUnit: 'cup', // Different unit
          category: 'Dairy',
          sources: [],
        },
      ]

      const result = mergeShoppableIngredients(input)
      expect(result).toHaveLength(2)
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
      expect(result[0].sources[0].recipeId).toBe('1')
    })
  })
})

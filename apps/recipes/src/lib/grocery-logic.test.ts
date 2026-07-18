import { describe, it, expect } from 'vitest'
import {
  categorizeShoppableIngredients,
  mergeShoppableIngredients,
  normalizeCategory,
} from './grocery-logic'
import { CATEGORY_ORDER } from './grocery-utils'
import type { ShoppableIngredient } from './types'

const item = (overrides: Partial<ShoppableIngredient>): ShoppableIngredient => ({
  name: 'thing',
  purchaseAmount: 1,
  purchaseUnit: 'each',
  category: 'Other',
  sources: [],
  ...overrides,
})

describe('grocery-logic', () => {
  describe('categorizeShoppableIngredients', () => {
    it('returns categories in the fixed CATEGORY_ORDER', () => {
      const ingredients = [
        item({ name: 'flour', category: 'Spices' }),
        item({ name: 'apples', category: 'Produce' }),
        item({ name: 'milk', category: 'Dairy' }),
        item({ name: 'chicken', category: 'Meat' }),
      ]

      const result = categorizeShoppableIngredients(ingredients)
      const names = result.map((c) => c.name)

      expect(names).toEqual(['Produce', 'Meat', 'Dairy', 'Spices'])
      // Sanity: that order matches CATEGORY_ORDER's relative order
      const indices = names.map((n) => CATEGORY_ORDER.indexOf(n))
      expect([...indices].sort((a, b) => a - b)).toEqual(indices)
    })

    it('sorts items alphabetically within a category', () => {
      const ingredients = [
        item({ name: 'zucchini', category: 'Produce' }),
        item({ name: 'apples', category: 'Produce' }),
        item({ name: 'mango', category: 'Produce' }),
      ]

      const result = categorizeShoppableIngredients(ingredients)
      expect(result[0].items.map((i) => i.name)).toEqual(['apples', 'mango', 'zucchini'])
    })

    it('maps legacy 19-category names onto the 8 fixed categories', () => {
      const ingredients = [
        item({ name: 'shrimp', category: 'Seafood' }),
        item({ name: 'bread', category: 'Bakery & Bread' }),
        item({ name: 'milk', category: 'Dairy & Eggs' }),
        item({ name: 'peas', category: 'Frozen Foods' }),
        item({ name: 'broth', category: 'Canned & Dry Goods' }),
        item({ name: 'flour', category: 'Baking & Spices' }),
        item({ name: 'soda', category: 'Beverages' }),
      ]

      const result = categorizeShoppableIngredients(ingredients)
      const byCategory = Object.fromEntries(result.map((c) => [c.name, c.items.map((i) => i.name)]))

      expect(byCategory.Meat).toEqual(['shrimp'])
      expect(byCategory.Bakery).toEqual(['bread'])
      expect(byCategory.Dairy).toEqual(['milk'])
      expect(byCategory.Frozen).toEqual(['peas'])
      expect(byCategory.Pantry).toEqual(['broth'])
      expect(byCategory.Spices).toEqual(['flour'])
      expect(byCategory.Other).toEqual(['soda'])
    })

    it('buckets unknown or missing categories into Other', () => {
      const ingredients = [
        item({ name: 'mystery', category: 'Not A Real Category' }),
        item({ name: 'blank', category: undefined as unknown as string }),
      ]

      const result = categorizeShoppableIngredients(ingredients)
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Other')
      expect(result[0].items).toHaveLength(2)
    })

    it('does not include empty categories in the result', () => {
      const result = categorizeShoppableIngredients([item({ name: 'apples', category: 'Produce' })])
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Produce')
    })
  })

  describe('normalizeCategory', () => {
    it('passes through canonical categories unchanged', () => {
      for (const cat of CATEGORY_ORDER) {
        expect(normalizeCategory(cat)).toBe(cat)
      }
    })

    it('maps legacy names and defaults unknowns to Other', () => {
      expect(normalizeCategory('Deli & Prepared')).toBe('Meat')
      expect(normalizeCategory('Pantry & Condiments')).toBe('Pantry')
      expect(normalizeCategory('Personal Care')).toBe('Other')
      expect(normalizeCategory(undefined)).toBe('Other')
    })
  })

  describe('mergeShoppableIngredients', () => {
    it('merges ingredients with same name and unit', () => {
      const ingredients = [
        item({
          name: 'Garlic',
          purchaseAmount: 1,
          purchaseUnit: 'head',
          sources: [{ recipeId: 'r1', recipeTitle: 'Pasta', originalAmount: '3 cloves' }],
        }),
        item({
          name: 'garlic',
          purchaseAmount: 2,
          purchaseUnit: 'Head',
          sources: [{ recipeId: 'r2', recipeTitle: 'Stir Fry', originalAmount: '5 cloves' }],
        }),
      ]

      const result = mergeShoppableIngredients(ingredients)

      expect(result).toHaveLength(1)
      expect(result[0].purchaseAmount).toBe(3)
      expect(result[0].sources).toHaveLength(2)
    })

    it('keeps ingredients with different units separate', () => {
      const ingredients = [
        item({ name: 'milk', purchaseUnit: 'quart' }),
        item({ name: 'milk', purchaseUnit: 'cup' }),
      ]

      expect(mergeShoppableIngredients(ingredients)).toHaveLength(2)
    })

    it('parses sources that come back as JSON strings from Firestore', () => {
      const ingredients = [
        item({
          name: 'onion',
          sources: JSON.stringify([
            { recipeId: 'r1', recipeTitle: 'Soup', originalAmount: '1 diced' },
          ]) as unknown as ShoppableIngredient['sources'],
        }),
      ]

      const result = mergeShoppableIngredients(ingredients)
      expect(result[0].sources).toEqual([
        { recipeId: 'r1', recipeTitle: 'Soup', originalAmount: '1 diced' },
      ])
    })
  })
})

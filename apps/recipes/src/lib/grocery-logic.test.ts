import { describe, it, expect } from 'vitest'
import { mergeIngredients, categorizeIngredients } from './grocery-logic'
import type { StructuredIngredient } from './types'

describe('grocery-logic', () => {
  const makeItem = (
    name: string,
    amount: number,
    unit: string,
    category: string,
  ): StructuredIngredient => ({
    original: '',
    name,
    amount,
    unit,
    category,
  })

  describe('mergeIngredients', () => {
    it('should sum amounts for same name and unit', () => {
      const input = [makeItem('flour', 1, 'cup', 'Pantry'), makeItem('flour', 2, 'cup', 'Pantry')]
      const result = mergeIngredients(input)
      expect(result).toHaveLength(1)
      expect(result[0].amount).toBe(3)
      expect(result[0].name).toBe('flour')
    })

    it('should NOT merge if units are different', () => {
      const input = [makeItem('sugar', 1, 'cup', 'Pantry'), makeItem('sugar', 2, 'tbsp', 'Pantry')]
      const result = mergeIngredients(input)
      expect(result).toHaveLength(2)
    })

    it('should handle empty list', () => {
      expect(mergeIngredients([])).toEqual([])
    })

    it('should merge sourceRecipeIds', () => {
      const input = [
        { ...makeItem('salt', 1, 'tsp', 'Pantry'), sourceRecipeIds: ['1'] },
        { ...makeItem('salt', 2, 'tsp', 'Pantry'), sourceRecipeIds: ['2'] },
      ]
      const result = mergeIngredients(input)
      expect(result).toHaveLength(1)
      expect(result[0].amount).toBe(3)
      expect(result[0].sourceRecipeIds).toEqual(expect.arrayContaining(['1', '2']))
    })
  })

  describe('categorizeIngredients', () => {
    it('should group items by category', () => {
      const input = [
        makeItem('carrot', 1, 'pc', 'Produce'),
        makeItem('beef', 1, 'lb', 'Meat'),
        makeItem('apple', 2, 'pc', 'Produce'),
      ]
      const result = categorizeIngredients(input)

      expect(result).toHaveLength(2)

      const produce = result.find((c) => c.name === 'Produce')
      expect(produce?.items).toHaveLength(2)
      expect(produce?.items.map((i) => i.name)).toContain('carrot')
      expect(produce?.items.map((i) => i.name)).toContain('apple')
    })

    it('should respect desired sort order', () => {
      const input = [makeItem('salt', 1, 'g', 'Spices'), makeItem('lettuce', 1, 'head', 'Produce')]
      const result = categorizeIngredients(input)
      // Produce should be before Spices in our logic
      expect(result[0].name).toBe('Produce')
      expect(result[1].name).toBe('Spices')
    })
  })
})

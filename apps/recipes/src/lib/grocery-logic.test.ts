import { describe, it, expect } from 'vitest'
import { categorizeShoppableIngredients, mergeShoppableIngredients } from './grocery-logic'
import { HEB_CATEGORY_ORDER, mapLegacyCategory, getItemAisle } from './heb-manor-aisles'
import type { ShoppableIngredient } from './types'

describe('grocery-logic', () => {
  describe('categorizeShoppableIngredients', () => {
    it('should return categories in H-E-B walking-path order', () => {
      const ingredients: ShoppableIngredient[] = [
        { name: 'milk', purchaseAmount: 1, purchaseUnit: 'gallon', category: 'Dairy & Eggs', sources: [] },
        { name: 'chicken', purchaseAmount: 2, purchaseUnit: 'lbs', category: 'Meat', sources: [] },
        { name: 'lettuce', purchaseAmount: 1, purchaseUnit: 'head', category: 'Produce', sources: [] },
        { name: 'ice cream', purchaseAmount: 1, purchaseUnit: 'pint', category: 'Frozen Foods', sources: [] },
        { name: 'pasta', purchaseAmount: 1, purchaseUnit: 'box', category: 'Pantry & Condiments', sources: [] },
      ]

      const result = categorizeShoppableIngredients(ingredients)
      const categoryOrder = result.map((c) => c.name)

      // Verify order matches H-E-B walking path
      expect(categoryOrder).toEqual(['Produce', 'Meat', 'Pantry & Condiments', 'Dairy & Eggs', 'Frozen Foods'])
    })

    it('should sort items within a category by aisle number, then alphabetically', () => {
      const ingredients: ShoppableIngredient[] = [
        { name: 'vinegar', purchaseAmount: 1, purchaseUnit: 'bottle', category: 'Pantry & Condiments', aisle: 5, sources: [] },
        { name: 'ketchup', purchaseAmount: 1, purchaseUnit: 'bottle', category: 'Pantry & Condiments', aisle: 4, sources: [] },
        { name: 'mustard', purchaseAmount: 1, purchaseUnit: 'bottle', category: 'Pantry & Condiments', aisle: 4, sources: [] },
        { name: 'soy sauce', purchaseAmount: 1, purchaseUnit: 'bottle', category: 'Pantry & Condiments', aisle: 5, sources: [] },
      ]

      const result = categorizeShoppableIngredients(ingredients)
      const pantryItems = result.find((c) => c.name === 'Pantry & Condiments')?.items || []
      const itemOrder = pantryItems.map((i) => i.name)

      // Aisle 4 items first (alphabetical), then aisle 5 items (alphabetical)
      expect(itemOrder).toEqual(['ketchup', 'mustard', 'soy sauce', 'vinegar'])
    })

    it('should sort perimeter items (no aisle) alphabetically', () => {
      const ingredients: ShoppableIngredient[] = [
        { name: 'tomatoes', purchaseAmount: 2, purchaseUnit: 'lbs', category: 'Produce', sources: [] },
        { name: 'apples', purchaseAmount: 6, purchaseUnit: 'whole', category: 'Produce', sources: [] },
        { name: 'lettuce', purchaseAmount: 1, purchaseUnit: 'head', category: 'Produce', sources: [] },
        { name: 'onions', purchaseAmount: 3, purchaseUnit: 'whole', category: 'Produce', sources: [] },
      ]

      const result = categorizeShoppableIngredients(ingredients)
      const produceItems = result.find((c) => c.name === 'Produce')?.items || []
      const itemOrder = produceItems.map((i) => i.name)

      expect(itemOrder).toEqual(['apples', 'lettuce', 'onions', 'tomatoes'])
    })

    it('should handle mixed items with and without aisle numbers', () => {
      const ingredients: ShoppableIngredient[] = [
        { name: 'bread', purchaseAmount: 1, purchaseUnit: 'loaf', category: 'Bakery & Bread', sources: [] },
        { name: 'tortillas', purchaseAmount: 1, purchaseUnit: 'pack', category: 'Bakery & Bread', aisle: 4, sources: [] },
        { name: 'baguette', purchaseAmount: 1, purchaseUnit: 'whole', category: 'Bakery & Bread', sources: [] },
      ]

      const result = categorizeShoppableIngredients(ingredients)
      const bakeryItems = result.find((c) => c.name === 'Bakery & Bread')?.items || []
      const itemOrder = bakeryItems.map((i) => i.name)

      // Items with aisle numbers come first, then items without (alphabetical)
      expect(itemOrder).toEqual(['tortillas', 'baguette', 'bread'])
    })

    it('should map legacy "Dairy" category to "Dairy & Eggs"', () => {
      const ingredients: ShoppableIngredient[] = [
        { name: 'milk', purchaseAmount: 1, purchaseUnit: 'gallon', category: 'Dairy', sources: [] },
        { name: 'eggs', purchaseAmount: 12, purchaseUnit: 'whole', category: 'Dairy', sources: [] },
      ]

      const result = categorizeShoppableIngredients(ingredients)
      const categoryNames = result.map((c) => c.name)

      expect(categoryNames).toContain('Dairy & Eggs')
      expect(categoryNames).not.toContain('Dairy')
    })

    it('should map legacy "Bakery" category to "Bakery & Bread"', () => {
      const ingredients: ShoppableIngredient[] = [
        { name: 'bread', purchaseAmount: 1, purchaseUnit: 'loaf', category: 'Bakery', sources: [] },
      ]

      const result = categorizeShoppableIngredients(ingredients)
      const categoryNames = result.map((c) => c.name)

      expect(categoryNames).toContain('Bakery & Bread')
      expect(categoryNames).not.toContain('Bakery')
    })

    it('should map legacy "Spices" category to "Baking & Spices"', () => {
      const ingredients: ShoppableIngredient[] = [
        { name: 'cumin', purchaseAmount: 1, purchaseUnit: 'jar', category: 'Spices', sources: [] },
      ]

      const result = categorizeShoppableIngredients(ingredients)
      const categoryNames = result.map((c) => c.name)

      expect(categoryNames).toContain('Baking & Spices')
      expect(categoryNames).not.toContain('Spices')
    })

    it('should map legacy "Frozen" category to "Frozen Foods"', () => {
      const ingredients: ShoppableIngredient[] = [
        { name: 'frozen peas', purchaseAmount: 1, purchaseUnit: 'bag', category: 'Frozen', sources: [] },
      ]

      const result = categorizeShoppableIngredients(ingredients)
      const categoryNames = result.map((c) => c.name)

      expect(categoryNames).toContain('Frozen Foods')
      expect(categoryNames).not.toContain('Frozen')
    })

    it('should intelligently map legacy "Pantry" items based on item name', () => {
      const ingredients: ShoppableIngredient[] = [
        { name: 'canned beans', purchaseAmount: 2, purchaseUnit: 'cans', category: 'Pantry', sources: [] },
        { name: 'flour', purchaseAmount: 1, purchaseUnit: 'bag', category: 'Pantry', sources: [] },
        { name: 'honey', purchaseAmount: 1, purchaseUnit: 'jar', category: 'Pantry', sources: [] },
        { name: 'pasta', purchaseAmount: 1, purchaseUnit: 'box', category: 'Pantry', sources: [] },
      ]

      const result = categorizeShoppableIngredients(ingredients)

      // Canned beans should go to Canned & Dry Goods
      expect(result.find((c) => c.name === 'Canned & Dry Goods')?.items.some((i) => i.name === 'canned beans')).toBe(true)
      // Flour should go to Baking & Spices
      expect(result.find((c) => c.name === 'Baking & Spices')?.items.some((i) => i.name === 'flour')).toBe(true)
      // Honey should go to Breakfast & Cereal
      expect(result.find((c) => c.name === 'Breakfast & Cereal')?.items.some((i) => i.name === 'honey')).toBe(true)
      // Pasta should fall back to Pantry & Condiments
      expect(result.find((c) => c.name === 'Pantry & Condiments')?.items.some((i) => i.name === 'pasta')).toBe(true)
    })

    it('should handle all 19 H-E-B categories', () => {
      // Verify all categories are in the expected order
      expect(HEB_CATEGORY_ORDER).toEqual([
        'Produce',
        'Seafood',
        'Meat',
        'Deli & Prepared',
        'Bakery & Bread',
        'Beer & Wine',
        'Pantry & Condiments',
        'Canned & Dry Goods',
        'Baking & Spices',
        'Breakfast & Cereal',
        'Snacks',
        'Beverages',
        'Paper & Household',
        'Pet',
        'Baby',
        'Personal Care',
        'Health & Pharmacy',
        'Dairy & Eggs',
        'Frozen Foods',
      ])
    })

    it('should not include empty categories in result', () => {
      const ingredients: ShoppableIngredient[] = [
        { name: 'milk', purchaseAmount: 1, purchaseUnit: 'gallon', category: 'Dairy & Eggs', sources: [] },
      ]

      const result = categorizeShoppableIngredients(ingredients)

      expect(result.length).toBe(1)
      expect(result[0].name).toBe('Dairy & Eggs')
    })
  })

  describe('mergeShoppableIngredients', () => {
    it('should merge ingredients with same name and unit', () => {
      const ingredients: ShoppableIngredient[] = [
        {
          name: 'onions',
          purchaseAmount: 2,
          purchaseUnit: 'whole',
          category: 'Produce',
          sources: [{ recipeId: '1', recipeTitle: 'Recipe 1', originalAmount: '2 onions' }],
        },
        {
          name: 'onions',
          purchaseAmount: 1,
          purchaseUnit: 'whole',
          category: 'Produce',
          sources: [{ recipeId: '2', recipeTitle: 'Recipe 2', originalAmount: '1 onion' }],
        },
      ]

      const result = mergeShoppableIngredients(ingredients)

      expect(result.length).toBe(1)
      expect(result[0].purchaseAmount).toBe(3)
      expect(result[0].sources?.length).toBe(2)
    })

    it('should preserve aisle information when merging', () => {
      const ingredients: ShoppableIngredient[] = [
        {
          name: 'pasta',
          purchaseAmount: 1,
          purchaseUnit: 'box',
          category: 'Pantry & Condiments',
          aisle: 5,
          sources: [],
        },
        {
          name: 'pasta',
          purchaseAmount: 2,
          purchaseUnit: 'box',
          category: 'Pantry & Condiments',
          aisle: 5,
          sources: [],
        },
      ]

      const result = mergeShoppableIngredients(ingredients)

      expect(result[0].aisle).toBe(5)
    })
  })

  describe('heb-manor-aisles', () => {
    describe('mapLegacyCategory', () => {
      it('should map Dairy to Dairy & Eggs', () => {
        expect(mapLegacyCategory('Dairy')).toBe('Dairy & Eggs')
      })

      it('should map Bakery to Bakery & Bread', () => {
        expect(mapLegacyCategory('Bakery')).toBe('Bakery & Bread')
      })

      it('should map Spices to Baking & Spices', () => {
        expect(mapLegacyCategory('Spices')).toBe('Baking & Spices')
      })

      it('should map Frozen to Frozen Foods', () => {
        expect(mapLegacyCategory('Frozen')).toBe('Frozen Foods')
      })

      it('should pass through Produce unchanged', () => {
        expect(mapLegacyCategory('Produce')).toBe('Produce')
      })

      it('should pass through Meat unchanged', () => {
        expect(mapLegacyCategory('Meat')).toBe('Meat')
      })

      it('should map Pantry with canned item to Canned & Dry Goods', () => {
        expect(mapLegacyCategory('Pantry', 'canned tomatoes')).toBe('Canned & Dry Goods')
        expect(mapLegacyCategory('Pantry', 'black beans')).toBe('Canned & Dry Goods')
        expect(mapLegacyCategory('Pantry', 'chicken broth')).toBe('Canned & Dry Goods')
      })

      it('should map Pantry with baking item to Baking & Spices', () => {
        expect(mapLegacyCategory('Pantry', 'all-purpose flour')).toBe('Baking & Spices')
        expect(mapLegacyCategory('Pantry', 'brown sugar')).toBe('Baking & Spices')
        expect(mapLegacyCategory('Pantry', 'vanilla extract')).toBe('Baking & Spices')
        expect(mapLegacyCategory('Pantry', 'cumin')).toBe('Baking & Spices')
      })

      it('should map Pantry with breakfast item to Breakfast & Cereal', () => {
        expect(mapLegacyCategory('Pantry', 'oatmeal')).toBe('Breakfast & Cereal')
        expect(mapLegacyCategory('Pantry', 'honey')).toBe('Breakfast & Cereal')
        expect(mapLegacyCategory('Pantry', 'peanut butter')).toBe('Breakfast & Cereal')
      })

      it('should map Pantry with snack item to Snacks', () => {
        expect(mapLegacyCategory('Pantry', 'tortilla chips')).toBe('Snacks')
        expect(mapLegacyCategory('Pantry', 'almonds')).toBe('Snacks')
      })

      it('should default Pantry to Pantry & Condiments for unmatched items', () => {
        expect(mapLegacyCategory('Pantry', 'pasta')).toBe('Pantry & Condiments')
        expect(mapLegacyCategory('Pantry', 'rice')).toBe('Pantry & Condiments')
      })

      it('should default Other to Pantry & Condiments', () => {
        expect(mapLegacyCategory('Other')).toBe('Pantry & Condiments')
        expect(mapLegacyCategory('Other', 'mystery item')).toBe('Pantry & Condiments')
      })
    })

    describe('getItemAisle', () => {
      it('should return aisle for known items', () => {
        expect(getItemAisle('ketchup')).toBe(4)
        expect(getItemAisle('soy sauce')).toBe(5)
        expect(getItemAisle('flour')).toBe(7)
        expect(getItemAisle('cereal')).toBe(8)
      })

      it('should return undefined for perimeter items', () => {
        expect(getItemAisle('lettuce')).toBeUndefined()
        expect(getItemAisle('chicken breast')).toBeUndefined()
      })

      it('should handle partial matches', () => {
        expect(getItemAisle('all-purpose flour')).toBe(7)
        expect(getItemAisle('hot dog buns')).toBe(4)
      })

      it('should be case-insensitive', () => {
        expect(getItemAisle('KETCHUP')).toBe(4)
        expect(getItemAisle('Soy Sauce')).toBe(5)
      })
    })
  })

  describe('Phase 3: Manual Items', () => {
    describe('optional sources', () => {
      it('should handle items with undefined sources', () => {
        const ingredients: ShoppableIngredient[] = [
          {
            name: 'paper towels',
            purchaseAmount: 1,
            purchaseUnit: 'pack',
            category: 'Paper & Household',
            isManual: true,
            // sources intentionally omitted
          },
        ]

        const result = categorizeShoppableIngredients(ingredients)
        expect(result.length).toBe(1)
        expect(result[0].items[0].name).toBe('paper towels')
        expect(result[0].items[0].isManual).toBe(true)
      })

      it('should handle merging items with no sources', () => {
        const ingredients: ShoppableIngredient[] = [
          {
            name: 'milk',
            purchaseAmount: 1,
            purchaseUnit: 'gallon',
            category: 'Dairy & Eggs',
            // No sources
          },
          {
            name: 'milk',
            purchaseAmount: 1,
            purchaseUnit: 'gallon',
            category: 'Dairy & Eggs',
            // No sources
          },
        ]

        const result = mergeShoppableIngredients(ingredients)
        expect(result.length).toBe(1)
        expect(result[0].purchaseAmount).toBe(2)
      })
    })

    describe('manual item deduplication', () => {
      it('should merge manual and AI-generated items by name+unit', () => {
        const ingredients: ShoppableIngredient[] = [
          // AI-generated item
          {
            name: 'chicken breast',
            purchaseAmount: 2,
            purchaseUnit: 'lbs',
            category: 'Meat',
            sources: [{ recipeId: '1', recipeTitle: 'Grilled Chicken', originalAmount: '2 lbs' }],
          },
          // Manual item with same name+unit
          {
            name: 'chicken breast',
            purchaseAmount: 1,
            purchaseUnit: 'lbs',
            category: 'Meat',
            isManual: true,
            sources: [],
          },
        ]

        const result = mergeShoppableIngredients(ingredients)
        expect(result.length).toBe(1)
        expect(result[0].purchaseAmount).toBe(3) // Quantities merged
        expect(result[0].sources?.length).toBe(1) // AI source preserved
      })

      it('should preserve price info when merging', () => {
        const ingredients: ShoppableIngredient[] = [
          {
            name: 'avocado',
            purchaseAmount: 2,
            purchaseUnit: 'each',
            category: 'Produce',
            hebPrice: 1.49,
            hebPriceUnit: 'each',
          },
          {
            name: 'avocado',
            purchaseAmount: 1,
            purchaseUnit: 'each',
            category: 'Produce',
          },
        ]

        const result = mergeShoppableIngredients(ingredients)
        expect(result.length).toBe(1)
        expect(result[0].purchaseAmount).toBe(3)
        expect(result[0].hebPrice).toBe(1.49)
      })
    })

    describe('isManual flag', () => {
      it('should preserve isManual flag during categorization', () => {
        const ingredients: ShoppableIngredient[] = [
          {
            name: 'dish soap',
            purchaseAmount: 1,
            purchaseUnit: 'bottle',
            category: 'Paper & Household',
            isManual: true,
            aisle: 28,
          },
        ]

        const result = categorizeShoppableIngredients(ingredients)
        const paperHousehold = result.find((c) => c.name === 'Paper & Household')
        expect(paperHousehold).toBeDefined()
        expect(paperHousehold?.items[0].isManual).toBe(true)
      })
    })

    describe('price fields', () => {
      it('should preserve hebPrice and hebPriceUnit during merging', () => {
        const ingredients: ShoppableIngredient[] = [
          {
            name: 'eggs',
            purchaseAmount: 12,
            purchaseUnit: 'count',
            category: 'Dairy & Eggs',
            hebPrice: 2.99,
            hebPriceUnit: 'dozen',
            sources: [],
          },
        ]

        const result = mergeShoppableIngredients(ingredients)
        expect(result[0].hebPrice).toBe(2.99)
        expect(result[0].hebPriceUnit).toBe('dozen')
      })
    })
  })
})

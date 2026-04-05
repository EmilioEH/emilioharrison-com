import { describe, it, expect } from 'vitest'
import {
  isRecurringItemDue,
  filterDueRecurringItems,
  mergeRecurringIntoIngredients,
} from './grocery-utils'
import type { RecurringGroceryItem, ShoppableIngredient } from './types'

describe('grocery-utils - Recurring Items', () => {
  // Helper to create a recurring item
  const createRecurringItem = (
    overrides: Partial<RecurringGroceryItem> = {},
  ): RecurringGroceryItem => ({
    id: 'test-item-1',
    name: 'Sparkling Water',
    purchaseAmount: 2,
    purchaseUnit: 'packs',
    category: 'Beverages',
    frequency: 'weekly',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  })

  describe('isRecurringItemDue', () => {
    describe('weekly frequency', () => {
      it('should return true for weekly items', () => {
        const item = createRecurringItem({ frequency: 'weekly' })
        expect(isRecurringItemDue(item, '2026-04-07')).toBe(true)
      })

      it('should return false if already added this week', () => {
        const item = createRecurringItem({
          frequency: 'weekly',
          lastAddedWeek: '2026-04-07',
        })
        expect(isRecurringItemDue(item, '2026-04-07')).toBe(false)
      })
    })

    describe('biweekly frequency', () => {
      it('should return true on even weeks from creation', () => {
        const item = createRecurringItem({
          frequency: 'biweekly',
          createdAt: '2026-01-06T00:00:00.000Z', // Week 2
        })
        // Week 4 - 2 weeks later (even)
        expect(isRecurringItemDue(item, '2026-01-20')).toBe(true)
        // Week 6 - 4 weeks later (even)
        expect(isRecurringItemDue(item, '2026-02-03')).toBe(true)
      })

      it('should return false on odd weeks from creation', () => {
        const item = createRecurringItem({
          frequency: 'biweekly',
          createdAt: '2026-01-06T00:00:00.000Z', // Week 2
        })
        // Week 3 - 1 week later (odd)
        expect(isRecurringItemDue(item, '2026-01-13')).toBe(false)
        // Week 5 - 3 weeks later (odd)
        expect(isRecurringItemDue(item, '2026-01-27')).toBe(false)
      })

      it('should return false if already added this week', () => {
        const item = createRecurringItem({
          frequency: 'biweekly',
          lastAddedWeek: '2026-01-20',
        })
        expect(isRecurringItemDue(item, '2026-01-20')).toBe(false)
      })
    })

    describe('monthly frequency', () => {
      it('should return true if never added before', () => {
        const item = createRecurringItem({
          frequency: 'monthly',
          lastAddedWeek: undefined,
        })
        expect(isRecurringItemDue(item, '2026-04-07')).toBe(true)
      })

      it('should return true if current month differs from lastAddedWeek month', () => {
        const item = createRecurringItem({
          frequency: 'monthly',
          lastAddedWeek: '2026-03-03', // March
        })
        expect(isRecurringItemDue(item, '2026-04-07')).toBe(true) // April
      })

      it('should return false if same month as lastAddedWeek', () => {
        const item = createRecurringItem({
          frequency: 'monthly',
          lastAddedWeek: '2026-04-01', // April
        })
        expect(isRecurringItemDue(item, '2026-04-07')).toBe(false) // Also April
      })

      it('should return true if same month but different year', () => {
        const item = createRecurringItem({
          frequency: 'monthly',
          lastAddedWeek: '2025-04-07', // April 2025
        })
        expect(isRecurringItemDue(item, '2026-04-07')).toBe(true) // April 2026
      })
    })
  })

  describe('filterDueRecurringItems', () => {
    it('should filter out items not due', () => {
      const items: RecurringGroceryItem[] = [
        createRecurringItem({
          id: 'item-1',
          name: 'Weekly Item',
          frequency: 'weekly',
        }),
        createRecurringItem({
          id: 'item-2',
          name: 'Already Added',
          frequency: 'weekly',
          lastAddedWeek: '2026-04-07',
        }),
      ]

      const { dueItems, itemsToUpdate } = filterDueRecurringItems(items, '2026-04-07')

      expect(dueItems).toHaveLength(1)
      expect(dueItems[0].name).toBe('Weekly Item')
      expect(itemsToUpdate).toHaveLength(1)
      expect(itemsToUpdate[0].id).toBe('item-1')
    })

    it('should convert RecurringGroceryItem to ShoppableIngredient', () => {
      const items: RecurringGroceryItem[] = [
        createRecurringItem({
          aisle: 12,
          hebPrice: 4.99,
          hebPriceUnit: 'each',
        }),
      ]

      const { dueItems } = filterDueRecurringItems(items, '2026-04-07')

      expect(dueItems[0]).toEqual({
        name: 'Sparkling Water',
        purchaseAmount: 2,
        purchaseUnit: 'packs',
        category: 'Beverages',
        isRecurring: true,
        recurringFrequency: 'weekly',
        sources: [],
        aisle: 12,
        hebPrice: 4.99,
        hebPriceUnit: 'each',
      })
    })
  })

  describe('mergeRecurringIntoIngredients', () => {
    it('should add recurring items not in ingredient list', () => {
      const ingredients: ShoppableIngredient[] = [
        {
          name: 'Milk',
          purchaseAmount: 1,
          purchaseUnit: 'gallon',
          category: 'Dairy & Eggs',
          sources: [],
        },
      ]

      const recurringItems: ShoppableIngredient[] = [
        {
          name: 'Sparkling Water',
          purchaseAmount: 2,
          purchaseUnit: 'packs',
          category: 'Beverages',
          isRecurring: true,
          recurringFrequency: 'weekly',
          sources: [],
        },
      ]

      const merged = mergeRecurringIntoIngredients(ingredients, recurringItems)

      expect(merged).toHaveLength(2)
      expect(merged.find((i) => i.name === 'Sparkling Water')).toBeDefined()
    })

    it('should merge quantities when item exists with same name and unit', () => {
      const ingredients: ShoppableIngredient[] = [
        {
          name: 'Eggs',
          purchaseAmount: 12,
          purchaseUnit: 'count',
          category: 'Dairy & Eggs',
          sources: [{ recipeId: '1', recipeTitle: 'Cake', originalAmount: '4 eggs' }],
        },
      ]

      const recurringItems: ShoppableIngredient[] = [
        {
          name: 'Eggs',
          purchaseAmount: 6,
          purchaseUnit: 'count',
          category: 'Dairy & Eggs',
          isRecurring: true,
          recurringFrequency: 'weekly',
          sources: [],
        },
      ]

      const merged = mergeRecurringIntoIngredients(ingredients, recurringItems)

      expect(merged).toHaveLength(1)
      expect(merged[0].purchaseAmount).toBe(18)
      expect(merged[0].isRecurring).toBe(true)
      expect(merged[0].sources).toHaveLength(1) // Original source preserved
    })

    it('should add price info from recurring item if not present', () => {
      const ingredients: ShoppableIngredient[] = [
        {
          name: 'Butter',
          purchaseAmount: 1,
          purchaseUnit: 'stick',
          category: 'Dairy & Eggs',
          sources: [],
        },
      ]

      const recurringItems: ShoppableIngredient[] = [
        {
          name: 'Butter',
          purchaseAmount: 1,
          purchaseUnit: 'stick',
          category: 'Dairy & Eggs',
          isRecurring: true,
          recurringFrequency: 'weekly',
          hebPrice: 3.99,
          hebPriceUnit: 'each',
          sources: [],
        },
      ]

      const merged = mergeRecurringIntoIngredients(ingredients, recurringItems)

      expect(merged[0].hebPrice).toBe(3.99)
      expect(merged[0].hebPriceUnit).toBe('each')
    })

    it('should handle case-insensitive name matching', () => {
      const ingredients: ShoppableIngredient[] = [
        {
          name: 'MILK',
          purchaseAmount: 1,
          purchaseUnit: 'gallon',
          category: 'Dairy & Eggs',
          sources: [],
        },
      ]

      const recurringItems: ShoppableIngredient[] = [
        {
          name: 'milk',
          purchaseAmount: 1,
          purchaseUnit: 'gallon',
          category: 'Dairy & Eggs',
          isRecurring: true,
          recurringFrequency: 'weekly',
          sources: [],
        },
      ]

      const merged = mergeRecurringIntoIngredients(ingredients, recurringItems)

      expect(merged).toHaveLength(1)
      expect(merged[0].purchaseAmount).toBe(2)
    })

    it('should not merge if units are different', () => {
      const ingredients: ShoppableIngredient[] = [
        {
          name: 'Milk',
          purchaseAmount: 1,
          purchaseUnit: 'gallon',
          category: 'Dairy & Eggs',
          sources: [],
        },
      ]

      const recurringItems: ShoppableIngredient[] = [
        {
          name: 'Milk',
          purchaseAmount: 2,
          purchaseUnit: 'pints',
          category: 'Dairy & Eggs',
          isRecurring: true,
          recurringFrequency: 'weekly',
          sources: [],
        },
      ]

      const merged = mergeRecurringIntoIngredients(ingredients, recurringItems)

      expect(merged).toHaveLength(2)
    })
  })
})

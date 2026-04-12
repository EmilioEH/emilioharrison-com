import { describe, it, expect } from 'vitest'
import {
  isRecurringItemDue,
  filterDueRecurringItems,
  mergeRecurringIntoIngredients,
  resolveFrequencyWeeks,
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
    frequencyWeeks: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  })

  describe('resolveFrequencyWeeks', () => {
    it('should return frequencyWeeks when set', () => {
      const item = createRecurringItem({ frequencyWeeks: 3 })
      expect(resolveFrequencyWeeks(item)).toBe(3)
    })

    it('should map legacy weekly to 1', () => {
      const item = createRecurringItem({ frequencyWeeks: 0, frequency: 'weekly' })
      expect(resolveFrequencyWeeks(item)).toBe(1)
    })

    it('should map legacy biweekly to 2', () => {
      const item = createRecurringItem({ frequencyWeeks: 0, frequency: 'biweekly' })
      expect(resolveFrequencyWeeks(item)).toBe(2)
    })

    it('should map legacy monthly to 4', () => {
      const item = createRecurringItem({ frequencyWeeks: 0, frequency: 'monthly' })
      expect(resolveFrequencyWeeks(item)).toBe(4)
    })
  })

  describe('isRecurringItemDue', () => {
    describe('every week (frequencyWeeks: 1)', () => {
      it('should return true for weekly items', () => {
        const item = createRecurringItem({ frequencyWeeks: 1 })
        expect(isRecurringItemDue(item, '2026-04-07')).toBe(true)
      })

      it('should return false if already added this week', () => {
        const item = createRecurringItem({
          frequencyWeeks: 1,
          lastAddedWeek: '2026-04-07',
        })
        expect(isRecurringItemDue(item, '2026-04-07')).toBe(false)
      })
    })

    describe('every 2 weeks (frequencyWeeks: 2)', () => {
      it('should return true on weeks that are a multiple of 2 Saturdays from creation', () => {
        const item = createRecurringItem({
          frequencyWeeks: 2,
          createdAt: '2026-01-06T00:00:00.000Z', // Week 2
        })
        // Week 4 - 2 weeks later (even)
        expect(isRecurringItemDue(item, '2026-01-20')).toBe(true)
        // Week 6 - 4 weeks later (even)
        expect(isRecurringItemDue(item, '2026-02-03')).toBe(true)
      })

      it('should return false on weeks that are not a multiple of 2 Saturdays from creation', () => {
        const item = createRecurringItem({
          frequencyWeeks: 2,
          createdAt: '2026-01-06T00:00:00.000Z', // Week 2
        })
        // Week 3 - 1 week later (odd)
        expect(isRecurringItemDue(item, '2026-01-13')).toBe(false)
        // Week 5 - 3 weeks later (odd)
        expect(isRecurringItemDue(item, '2026-01-27')).toBe(false)
      })

      it('should return false if already added this week', () => {
        const item = createRecurringItem({
          frequencyWeeks: 2,
          lastAddedWeek: '2026-01-20',
        })
        expect(isRecurringItemDue(item, '2026-01-20')).toBe(false)
      })
    })

    describe('custom weeks (frequencyWeeks: 3)', () => {
      it('should return true every 3 Saturdays from creation', () => {
        const item = createRecurringItem({
          frequencyWeeks: 3,
          createdAt: '2026-01-06T00:00:00.000Z', // Week 2
        })
        // Week 5 - 3 weeks later
        expect(isRecurringItemDue(item, '2026-01-27')).toBe(true)
        // Week 8 - 6 weeks later
        expect(isRecurringItemDue(item, '2026-02-17')).toBe(true)
      })

      it('should return false on non-multiple Saturdays from creation', () => {
        const item = createRecurringItem({
          frequencyWeeks: 3,
          createdAt: '2026-01-06T00:00:00.000Z', // Week 2
        })
        // Week 3 - 1 week later (not multiple of 3)
        expect(isRecurringItemDue(item, '2026-01-13')).toBe(false)
        // Week 4 - 2 weeks later (not multiple of 3)
        expect(isRecurringItemDue(item, '2026-01-20')).toBe(false)
      })
    })
  })

  describe('filterDueRecurringItems', () => {
    it('should filter out items not due', () => {
      const items: RecurringGroceryItem[] = [
        createRecurringItem({
          id: 'item-1',
          name: 'Weekly Item',
          frequencyWeeks: 1,
        }),
        createRecurringItem({
          id: 'item-2',
          name: 'Already Added',
          frequencyWeeks: 1,
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
          frequencyWeeks: 1,
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
        recurringFrequencyWeeks: 1,
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
          recurringFrequencyWeeks: 1,
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
          recurringFrequencyWeeks: 1,
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
          recurringFrequencyWeeks: 1,
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
          recurringFrequencyWeeks: 1,
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
          recurringFrequencyWeeks: 1,
          sources: [],
        },
      ]

      const merged = mergeRecurringIntoIngredients(ingredients, recurringItems)

      expect(merged).toHaveLength(2)
    })
  })
})

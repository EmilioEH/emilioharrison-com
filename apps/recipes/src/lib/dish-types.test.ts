import { describe, it, expect } from 'vitest'
import { DISH_TYPE_OPTIONS, inferDishTypeFromTitle, resolveDishType } from './dish-types'

describe('DISH_TYPE_OPTIONS', () => {
  it('includes the baking categories that made baked goods unfindable by their absence', () => {
    expect(DISH_TYPE_OPTIONS).toContain('Bread')
    expect(DISH_TYPE_OPTIONS).toContain('Baked Good')
    expect(DISH_TYPE_OPTIONS).toContain('Dessert')
  })

  it('keeps the original savoury categories', () => {
    for (const t of ['Main', 'Side', 'Appetizer', 'Salad', 'Soup', 'Drink', 'Sauce']) {
      expect(DISH_TYPE_OPTIONS).toContain(t)
    }
  })
})

describe('inferDishTypeFromTitle', () => {
  it('recognises breads', () => {
    expect(inferDishTypeFromTitle('No-Knead Sourdough Bread')).toBe('Bread')
    expect(inferDishTypeFromTitle('Rosemary Focaccia')).toBe('Bread')
    expect(inferDishTypeFromTitle('Everything Bagels')).toBe('Bread')
  })

  it('recognises desserts', () => {
    expect(inferDishTypeFromTitle('Salted Caramel Chocolate Chip Cookies')).toBe('Dessert')
    expect(inferDishTypeFromTitle('Dulce de Leche Cookies')).toBe('Dessert')
    expect(inferDishTypeFromTitle('Classic Apple Pie')).toBe('Dessert')
  })

  it('recognises other baked goods', () => {
    expect(inferDishTypeFromTitle('Blueberry Muffins')).toBe('Baked Good')
    expect(inferDishTypeFromTitle('Cheddar Scones')).toBe('Baked Good')
  })

  // "banana bread" contains "bread" but is a sweet quick bread, so the more specific rule has to
  // win — this is why pattern order matters and would regress silently on a reorder.
  it('classifies quick breads as baked goods, not breads', () => {
    expect(inferDishTypeFromTitle('Banana Bread')).toBe('Baked Good')
    expect(inferDishTypeFromTitle('Pumpkin Bread')).toBe('Baked Good')
  })

  it('still recognises the savoury categories', () => {
    expect(inferDishTypeFromTitle('Chicken Tortilla Soup')).toBe('Soup')
    expect(inferDishTypeFromTitle('Asian Cucumber Salad')).toBe('Salad')
    expect(inferDishTypeFromTitle('Basil Pesto')).toBe('Sauce')
  })

  it('returns null when nothing matches', () => {
    expect(inferDishTypeFromTitle('Sheet Pan Tandoori Chicken')).toBeNull()
    expect(inferDishTypeFromTitle('')).toBeNull()
    expect(inferDishTypeFromTitle(undefined)).toBeNull()
  })
})

describe('resolveDishType', () => {
  it('trusts a specific stored value over inference', () => {
    expect(resolveDishType({ dishType: 'Side', title: 'Cornbread' })).toBe('Side')
  })

  // The ~400 existing recipes were categorised before the baking values existed, so a cookie
  // recipe carries "Main". Overriding that generic value is what makes them filterable now.
  it('overrides a generic stored value when the title says otherwise', () => {
    expect(resolveDishType({ dishType: 'Main', title: 'Chocolate Chip Cookies' })).toBe('Dessert')
    expect(resolveDishType({ dishType: 'Other', title: 'Sourdough Bread' })).toBe('Bread')
  })

  it('keeps a generic stored value when the title gives no signal', () => {
    expect(resolveDishType({ dishType: 'Main', title: 'Sheet Pan Tandoori Chicken' })).toBe('Main')
  })

  it('falls back to Other when there is nothing to go on', () => {
    expect(resolveDishType({ title: 'Mystery Dish' })).toBe('Other')
    expect(resolveDishType({})).toBe('Other')
  })
})

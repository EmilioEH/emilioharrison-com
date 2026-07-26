import { describe, it, expect } from 'vitest'
import { ingredientKey, groupIngredientNames } from './ingredient-names'

describe('ingredientKey', () => {
  it('merges the count form with the bare form', () => {
    // Real: `garlic` (107 uses) and `garlic cloves` (84) were separate entries.
    expect(ingredientKey('garlic cloves')).toBe(ingredientKey('garlic'))
  })

  it('strips preparation words, which never change what something weighs', () => {
    const base = ingredientKey('parsley')
    for (const v of [
      'chopped parsley',
      'finely chopped parsley',
      'fresh parsley',
      'freshly chopped parsley',
      'parsley, roughly chopped',
    ]) {
      expect(ingredientKey(v)).toBe(base)
    }
  })

  it('strips size adjectives', () => {
    expect(ingredientKey('large yellow onion')).toBe(ingredientKey('yellow onion'))
  })

  it('drops parentheticals and everything after a comma', () => {
    expect(ingredientKey('carrots (about 4-5 medium), peeled and sliced')).toBe(
      ingredientKey('carrot'),
    )
  })

  it('handles plurals', () => {
    expect(ingredientKey('eggs')).toBe(ingredientKey('egg'))
    expect(ingredientKey('tomatoes')).toBe(ingredientKey('tomato'))
    expect(ingredientKey('berries')).toBe('berry')
  })

  it('does not over-singularise words that end in s', () => {
    expect(ingredientKey('molasses')).toBe('molasses')
    expect(ingredientKey('hummus')).toBe('hummus')
  })

  // The distinction the weight table depends on. Merging these would give one wrong number
  // for two genuinely different ingredients.
  it('KEEPS variety words that change density', () => {
    expect(ingredientKey('kosher salt')).not.toBe(ingredientKey('table salt'))
    expect(ingredientKey('kosher salt')).not.toBe(ingredientKey('fine sea salt'))
    expect(ingredientKey('all purpose flour')).not.toBe(ingredientKey('bread flour'))
    expect(ingredientKey('granulated sugar')).not.toBe(ingredientKey('brown sugar'))
    expect(ingredientKey('powdered sugar')).not.toBe(ingredientKey('granulated sugar'))
  })

  it('handles empty input', () => {
    expect(ingredientKey('')).toBe('')
    expect(ingredientKey(undefined)).toBe('')
    expect(ingredientKey(null)).toBe('')
  })
})

describe('groupIngredientNames', () => {
  it('collapses variants and keeps the most common spelling as the label', () => {
    const groups = groupIngredientNames([
      { name: 'garlic', count: 107 },
      { name: 'garlic cloves', count: 84 },
      { name: 'minced garlic', count: 12 },
      { name: 'kosher salt', count: 217 },
    ])

    const garlic = groups.find((g) => g.key === ingredientKey('garlic'))!
    expect(garlic.count).toBe(203)
    expect(garlic.display).toBe('garlic') // the most-used spelling, not the normalised key
    expect(garlic.variants).toContain('garlic cloves')

    // Salt stays its own entry — different ingredient, different weight.
    expect(groups.find((g) => g.display === 'kosher salt')).toBeDefined()
  })

  it('orders by how often the ingredient appears', () => {
    const groups = groupIngredientNames([
      { name: 'saffron', count: 1 },
      { name: 'black pepper', count: 223 },
      { name: 'butter', count: 50 },
    ])
    expect(groups.map((g) => g.display)).toEqual(['black pepper', 'butter', 'saffron'])
  })

  it('ignores entries that normalise to nothing', () => {
    expect(groupIngredientNames([{ name: '(optional)', count: 3 }])).toHaveLength(0)
  })
})

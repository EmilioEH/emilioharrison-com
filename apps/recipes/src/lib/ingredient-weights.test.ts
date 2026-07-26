import { describe, it, expect, vi } from 'vitest'

// The real table is generated, so it's mocked here — these tests are about the lookup rules, not
// about which ingredients happen to be in the current build.
vi.mock('./weight-table.generated', () => ({
  GRAMS_PER_CUP: {
    'all purpose flour': 125,
    'granulated sugar': 200,
    'kosher salt': 292,
    garlic: 136,
  },
}))

const { gramsForIngredient } = await import('./ingredient-weights')

describe('gramsForIngredient', () => {
  it('converts a volume measurement using the table', () => {
    expect(gramsForIngredient('all-purpose flour', 1, 'cup')).toBe(125)
    expect(gramsForIngredient('granulated sugar', 2, 'cup')).toBe(400)
  })

  it('converts within the volume family before looking up the weight', () => {
    // 8 tbsp is half a cup, so half of flour's 125g.
    expect(gramsForIngredient('all-purpose flour', 8, 'tbsp')).toBe(63)
  })

  it('finds an ingredient through its spelling variants', () => {
    // "garlic cloves" and "garlic" share an ingredient key.
    expect(gramsForIngredient('garlic cloves', 1, 'cup')).toBe(135)
  })

  it('stays silent for an ingredient that is not in the table', () => {
    // A missing conversion is a gap; a guessed one looks authoritative and is worse than nothing.
    expect(gramsForIngredient('dragon fruit', 1, 'cup')).toBeNull()
  })

  it('stays silent when the measurement is already a weight', () => {
    expect(gramsForIngredient('all-purpose flour', 200, 'g')).toBeNull()
    expect(gramsForIngredient('all-purpose flour', 1, 'lb')).toBeNull()
  })

  it('stays silent for counts and imprecise amounts', () => {
    expect(gramsForIngredient('garlic', 2, 'clove')).toBeNull()
    expect(gramsForIngredient('kosher salt', 1, 'pinch')).toBeNull()
    expect(gramsForIngredient('kosher salt', undefined, 'to_taste')).toBeNull()
  })

  it('stays silent without a usable quantity', () => {
    expect(gramsForIngredient('all-purpose flour', undefined, 'cup')).toBeNull()
    expect(gramsForIngredient('all-purpose flour', 0, 'cup')).toBeNull()
    expect(gramsForIngredient('all-purpose flour', Number.NaN, 'cup')).toBeNull()
  })

  it('stays silent when the result would round to a meaningless figure', () => {
    // "⅛ tsp kosher salt (1 g)" is noise, not information.
    expect(gramsForIngredient('kosher salt', 0.125, 'tsp')).toBeNull()
  })

  it('rounds the way a kitchen scale reads', () => {
    expect(gramsForIngredient('kosher salt', 1, 'tbsp')).toBe(18)
    expect(gramsForIngredient('granulated sugar', 3, 'cup')).toBe(600)
  })
})

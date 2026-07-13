import { describe, it, expect } from 'vitest'
import {
  findSuggestion,
  searchSuggestions,
  mapToHebCategory,
  getCategoryAisle,
  getCategoryOrder,
  getPriceForItem,
} from './grocery-matcher'

describe('findSuggestion', () => {
  it('finds exact match by name', () => {
    const result = findSuggestion('Bananas')
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Bananas')
    expect(result!.category).toBe('Produce')
  })

  it('finds case-insensitive match', () => {
    const result = findSuggestion('bananas')
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Bananas')
  })

  it('finds partial match - ingredient name is subset', () => {
    const result = findSuggestion('chicken breast')
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Chicken Breast Boneless Skinless')
  })

  it('finds partial match - suggestion name is subset', () => {
    const result = findSuggestion('spaghetti pasta noodles')
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Spaghetti')
  })

  it('returns null for unrecognized items', () => {
    const result = findSuggestion('xyznonexistent')
    expect(result).toBeNull()
  })

  it('handles empty string', () => {
    const result = findSuggestion('')
    expect(result).toBeNull()
  })

  it('finds token-based match', () => {
    const result = findSuggestion('ground beef')
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Ground Beef 80/20')
  })

  it('finds match for common recipe ingredients', () => {
    expect(findSuggestion('garlic')).not.toBeNull()
    expect(findSuggestion('onion')).not.toBeNull()
    expect(findSuggestion('olive oil')).not.toBeNull()
    expect(findSuggestion('butter')).not.toBeNull()
    expect(findSuggestion('eggs')).not.toBeNull()
  })
})

describe('searchSuggestions', () => {
  it('returns matching suggestions', () => {
    const results = searchSuggestions('chicken')
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((r) => r.name.toLowerCase().includes('chicken'))).toBe(true)
  })

  it('respects limit parameter', () => {
    const results = searchSuggestions('h-e-b', 3)
    expect(results.length).toBeLessThanOrEqual(3)
  })

  it('returns empty array for empty query', () => {
    expect(searchSuggestions('')).toEqual([])
  })

  it('returns empty array for short query', () => {
    expect(searchSuggestions('a')).toEqual([])
  })

  it('ranks exact matches highest', () => {
    const results = searchSuggestions('Bananas')
    expect(results[0].name).toBe('Bananas')
  })

  it('ranks prefix matches before substring', () => {
    const results = searchSuggestions('tom')
    const names = results.map((r) => r.name)
    const tomIndex = names.findIndex((n) => n.toLowerCase().startsWith('tom'))
    expect(tomIndex).toBe(0)
  })
})

describe('mapToHebCategory', () => {
  it('maps old Dairy to Dairy & Eggs', () => {
    expect(mapToHebCategory('Dairy')).toBe('Dairy & Eggs')
  })

  it('maps old Bakery to Bakery & Bread', () => {
    expect(mapToHebCategory('Bakery')).toBe('Bakery & Bread')
  })

  it('maps old Frozen to Frozen Foods', () => {
    expect(mapToHebCategory('Frozen')).toBe('Frozen Foods')
  })

  it('maps old Spices to Baking & Spices', () => {
    expect(mapToHebCategory('Spices')).toBe('Baking & Spices')
  })

  it('maps old Pantry to Pantry & Condiments', () => {
    expect(mapToHebCategory('Pantry')).toBe('Pantry & Condiments')
  })

  it('passes through already-new categories', () => {
    expect(mapToHebCategory('Produce')).toBe('Produce')
    expect(mapToHebCategory('Meat')).toBe('Meat')
  })

  it('passes through unknown categories', () => {
    expect(mapToHebCategory('Seafood')).toBe('Seafood')
    expect(mapToHebCategory('Pet')).toBe('Pet')
  })
})

describe('getCategoryAisle', () => {
  it('returns aisle info for known categories', () => {
    expect(getCategoryAisle('Produce')).toBe('Perimeter')
    expect(getCategoryAisle('Baking & Spices')).toBe('Aisle 7')
    expect(getCategoryAisle('Paper & Household')).toBe('Aisles 25–28')
  })

  it('returns undefined for unknown categories', () => {
    expect(getCategoryAisle('Other')).toBeUndefined()
  })
})

describe('getCategoryOrder', () => {
  it('returns correct order for known categories', () => {
    expect(getCategoryOrder('Produce')).toBe(1)
    expect(getCategoryOrder('Frozen Foods')).toBe(19)
  })

  it('returns 99 for unknown categories', () => {
    expect(getCategoryOrder('Other')).toBe(99)
  })
})

describe('getPriceForItem', () => {
  it('returns price for matched items', () => {
    const result = getPriceForItem('bananas')
    expect(result).not.toBeNull()
    expect(result!.price).toBe(0.62)
    expect(result!.unit).toBe('lb')
  })

  it('returns null for unmatched items', () => {
    expect(getPriceForItem('xyznonexistent')).toBeNull()
  })
})

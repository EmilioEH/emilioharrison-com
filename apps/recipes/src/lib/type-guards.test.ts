import { describe, it, expect } from 'vitest'
import { isRecipe } from './type-guards'

describe('type-guards', () => {
  describe('isRecipe', () => {
    it('should return true for a valid recipe object', () => {
      const validRecipe = {
        id: '123',
        title: 'Delicious Pasta',
        ingredients: [],
        steps: [],
      }
      expect(isRecipe(validRecipe)).toBe(true)
    })

    it('should return false for null or non-object', () => {
      expect(isRecipe(null)).toBe(false)
      expect(isRecipe(undefined)).toBe(false)
      expect(isRecipe('string')).toBe(false)
      expect(isRecipe(123)).toBe(false)
    })

    it('should return false if id is missing or empty', () => {
      expect(isRecipe({ title: 'No ID', ingredients: [], steps: [] })).toBe(false)
      expect(isRecipe({ id: '', title: 'Empty ID', ingredients: [], steps: [] })).toBe(false)
      expect(isRecipe({ id: 123, title: 'Number ID', ingredients: [], steps: [] })).toBe(false)
    })

    it('should return false if title is missing or empty', () => {
      // Note: Current implementation allows empty title string? Let's check the code.
      // The code says: title.length > 0.
      expect(isRecipe({ id: '123', ingredients: [], steps: [] })).toBe(false)
      expect(isRecipe({ id: '123', title: '', ingredients: [], steps: [] })).toBe(false)
    })

    it('should return false if ingredients is not an array', () => {
      expect(isRecipe({ id: '123', title: 'Test', ingredients: null, steps: [] })).toBe(false)
      expect(isRecipe({ id: '123', title: 'Test', ingredients: 'flour', steps: [] })).toBe(false)
    })

    it('should return false if steps is not an array', () => {
      expect(isRecipe({ id: '123', title: 'Test', ingredients: [], steps: null })).toBe(false)
      expect(isRecipe({ id: '123', title: 'Test', ingredients: [], steps: 'cook' })).toBe(false)
    })
  })
})

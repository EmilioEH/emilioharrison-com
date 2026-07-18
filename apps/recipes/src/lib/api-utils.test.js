import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { cleanGeminiResponse, formatRecipesForPrompt, closeBalanced } from './api-utils'

describe('api-utils', () => {
  describe('cleanGeminiResponse', () => {
    it('should remove markdown json blocks', () => {
      const input = '```json\n{"title": "Test"}\n```'
      expect(cleanGeminiResponse(input)).toBe('{"title": "Test"}')
    })

    it('should remove markdown blocks without json tag', () => {
      const input = '```\n{"title": "Test"}\n```'
      expect(cleanGeminiResponse(input)).toBe('{"title": "Test"}')
    })

    it('should handle raw json strings', () => {
      const input = '{"title": "Test"}'
      expect(cleanGeminiResponse(input)).toBe('{"title": "Test"}')
    })

    it('should handle empty input', () => {
      expect(cleanGeminiResponse('')).toBe('')
      expect(cleanGeminiResponse(null)).toBe('')
    })
  })

  describe('closeBalanced', () => {
    it('should close unclosed objects and arrays in correct LIFO order', () => {
      // Objects inside array: should close ] then } not } then ]
      const input = '{"ingredients": [{"name": "Chicken"'
      const result = closeBalanced(input)
      expect(result).toBe('{"ingredients": [{"name": "Chicken"}]}')
      expect(() => JSON.parse(result)).not.toThrow()
    })

    it('should handle deeply nested structures', () => {
      const input = '{"a": {"b": {"c": [1,2,3'
      const result = closeBalanced(input)
      expect(result).toBe('{"a": {"b": {"c": [1,2,3]}}}')
      expect(() => JSON.parse(result)).not.toThrow()
    })

    it('should handle multiple objects in an array', () => {
      const input = '{"ingredients": [{"name": "Flour"},{"name": "Yeast"},{"name": "Water"'
      const result = closeBalanced(input)
      expect(result).toBe(
        '{"ingredients": [{"name": "Flour"},{"name": "Yeast"},{"name": "Water"}]}',
      )
      expect(() => JSON.parse(result)).not.toThrow()
    })

    it('should handle empty object', () => {
      expect(closeBalanced('{')).toBe('{}')
      expect(closeBalanced('')).toBe('')
    })

    it('should skip string content including escaped quotes', () => {
      const input = '{"title": "hello \\"world\\" test"'
      const result = closeBalanced(input)
      expect(result).toBe('{"title": "hello \\"world\\" test"}')
      expect(() => JSON.parse(result)).not.toThrow()
    })

    it('should not modify already valid JSON', () => {
      const input = '{"a": 1, "b": [1, 2, 3]}'
      expect(closeBalanced(input)).toBe(input)
    })

    it('should close arrays with objects inside in correct order', () => {
      const input = '{"recipe": {"steps": ["step1", {"name": "sub"}'
      const result = closeBalanced(input)
      expect(result).toBe('{"recipe": {"steps": ["step1", {"name": "sub"}]}}')
      expect(() => JSON.parse(result)).not.toThrow()
    })
  })

  describe('formatRecipesForPrompt (Property-Based Testing)', () => {
    it('should always include the recipe title and every ingredient name in the output', () => {
      const result = fc.check(
        fc.property(
          fc.array(
            fc.record({
              title: fc.string({ minLength: 1 }),
              ingredients: fc.array(
                fc.record({
                  name: fc.string({ minLength: 1 }),
                  amount: fc.string(),
                }),
                { minLength: 1 },
              ),
            }),
            { minLength: 1, maxLength: 5 },
          ),
          (recipes) => {
            const prompt = formatRecipesForPrompt(recipes)

            // Check every recipe title is present
            for (const recipe of recipes) {
              if (!prompt.includes(recipe.title)) return false

              // Check every ingredient name is present
              for (const ingredient of recipe.ingredients) {
                if (!prompt.includes(ingredient.name)) return false
              }
            }

            // Ensure we have double newlines between recipes if multiple
            if (recipes.length > 1) {
              if (!prompt.includes('\n\n')) return false
            }

            return true
          },
        ),
      )
      expect(result.failed).toBe(false)
    })

    it('should return empty string for invalid inputs', () => {
      // @ts-expect-error - testing invalid input
      expect(formatRecipesForPrompt(null)).toBe('')
      // @ts-expect-error - testing invalid input
      expect(formatRecipesForPrompt({})).toBe('')
      expect(formatRecipesForPrompt([])).toBe('')
    })
  })
})

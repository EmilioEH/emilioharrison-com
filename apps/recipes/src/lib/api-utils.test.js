import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { cleanGeminiResponse, formatRecipesForPrompt } from './api-utils'

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

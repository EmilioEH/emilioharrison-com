import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST as parseRecipe } from '../../src/pages/api/parse-recipe'
import { POST as generateGroceryList } from '../../src/pages/api/generate-grocery-list'

// Mock dependencies
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: vi.fn(() => ({
          text: JSON.stringify({
            title: 'Mock Recipe',
            ingredients: [{ name: 'Test Ingredient', amount: '1 cup' }],
            steps: ['Step 1', 'Step 2'],
            protein: 'Chicken',
            prepTime: 10,
            cookTime: 20,
            servings: 4,
          }),
        })),
      }
    },
    Type: {
      STRING: 'STRING',
      NUMBER: 'NUMBER',
      OBJECT: 'OBJECT',
      ARRAY: 'ARRAY',
    },
  }
})

// Helper to mock fetch for generate-grocery-list
const originalFetch = global.fetch

describe('API Tests', () => {
  beforeEach(() => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [{ content: { parts: [{ text: JSON.stringify([]) }] } }],
          }),
        text: () => Promise.resolve(''),
      } as any),
    )
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  describe('parse-recipe', () => {
    it('should return 400 if no query provided', async () => {
      const request = new Request('http://localhost/api/parse-recipe', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const locals = { runtime: { env: { GEMINI_API_KEY: 'mock-key' } } }
      const response = await parseRecipe({ request, locals } as any)
      expect(response.status).toBe(400)
    })

    it('should call Gemini and return structured data on valid query', async () => {
      const request = new Request('http://localhost/api/parse-recipe', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com' }),
      })
      const locals = { runtime: { env: { GEMINI_API_KEY: 'mock-key' } } }
      const response = await parseRecipe({ request, locals } as any)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.title).toBe('Mock Recipe')
    })
  })

  describe('generate-grocery-list', () => {
    it('should return 200 if recipes list is empty', async () => {
      const request = new Request('http://localhost/api/generate-grocery-list', {
        method: 'POST',
        body: JSON.stringify({}), // Missing recipes
      })
      const locals = { runtime: { env: { GEMINI_API_KEY: 'mock-key' } } }
      const response = await generateGroceryList({ request, locals } as any)
      // Current implementation returns 200 for missing recipes
      expect(response.status).toBe(200)
    })
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST as parseRecipe } from '../../src/pages/api/parse-recipe'
import { POST as generateGroceryList } from '../../src/pages/api/generate-grocery-list'

// Mock dependencies
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContentStream: vi.fn(() => {
          return (async function* () {
            yield {
              get text() {
                return JSON.stringify({
                  title: 'Mock Recipe',
                  ingredients: [{ name: 'Test Ingredient', amount: '1 cup' }],
                  steps: ['Step 1', 'Step 2'],
                  protein: 'Chicken',
                  prepTime: 10,
                  cookTime: 20,
                  servings: 4,
                  // Add required fields
                  structuredIngredients: [],
                  ingredientGroups: [{ header: 'Main', startIndex: 0, endIndex: 1 }],
                  stepGroups: [{ header: 'Cook', startIndex: 0, endIndex: 2 }],
                  structuredSteps: [
                    {
                      text: 'Step 1',
                      highlightedText: 'Step 1',
                    },
                    {
                      text: 'Step 2',
                      highlightedText: 'Step 2',
                    },
                  ],
                  description: 'A mock recipe.',
                })
              },
            }
          })()
        }),
        generateContent: vi.fn(() => ({
          get text() {
            return JSON.stringify({
              ingredients: [
                {
                  name: 'Test Ingredient',
                  purchaseAmount: 1,
                  purchaseUnit: 'unit',
                  category: 'Produce',
                  sources: [{ recipeId: '1', recipeTitle: 'T', originalAmount: '1' }],
                },
              ],
            })
          },
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
      } as unknown as Response),
    )
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  describe('parse-recipe', () => {
    it('should return 400 if no query provided', async () => {
      const request = new Request('http://localhost/api/parse-recipe', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const locals = { runtime: { env: { GEMINI_API_KEY: 'mock-key' } } }
      const response = await parseRecipe({ request, locals } as unknown as Parameters<
        typeof parseRecipe
      >[0])
      expect(response.status).toBe(400)
    })

    it('should call Gemini and return structured data on valid query', async () => {
      const request = new Request('http://localhost/api/parse-recipe', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com' }),
      })
      const locals = { runtime: { env: { GEMINI_API_KEY: 'mock-key' } } }
      const response = await parseRecipe({ request, locals } as unknown as Parameters<
        typeof parseRecipe
      >[0])
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
      const response = await generateGroceryList({ request, locals } as unknown as Parameters<
        typeof generateGroceryList
      >[0])
      // Current implementation returns 200 for missing recipes
      expect(response.status).toBe(200)
    })

    it('should batch process recipes when >5 provided', async () => {
      // Create 6 dummy recipes
      const recipes = Array(6)
        .fill(null)
        .map((_, i) => ({
          id: `r${i}`,
          title: `Recipe ${i}`,
          ingredients: ['1 item'],
          instructions: [],
        }))

      const request = new Request('http://localhost/api/generate-grocery-list', {
        method: 'POST',
        body: JSON.stringify({ recipes }),
      })
      const locals = { runtime: { env: { GEMINI_API_KEY: 'mock-key' } } }

      const response = await generateGroceryList({ request, locals } as unknown as Parameters<
        typeof generateGroceryList
      >[0])

      expect(response.status).toBe(200)
      const data = await response.json()

      // Verification:
      // 6 recipes split into 2 batches (size 5).
      // Mock returns 1 'Test Ingredient' per call.
      // Merge logic aggregates them.
      // Expected: 1 ingredient with purchaseAmount = 2 (1+1).
      expect(data.ingredients).toHaveLength(1)
      expect(data.ingredients[0].name).toBe('Test Ingredient')
      expect(data.ingredients[0].purchaseAmount).toBe(2)
      expect(data.ingredients[0].sources).toHaveLength(2)
    })
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST as parseRecipe } from '../../src/pages/api/parse-recipe'
import { POST as generateGroceryList } from '../../src/pages/api/generate-grocery-list'

// Mock for parse-recipe (OpenRouter via openai)
function determineContent(messages: Array<{ role: string; content: string }>) {
  const allContent = messages.map((m) => m.content ?? '').join(' ')
  if (allContent.includes('Grocery') || allContent.includes('shopping list')) {
    return JSON.stringify({
      ingredients: [
        {
          name: 'Test Ingredient',
          purchaseAmount: 2,
          purchaseUnit: 'unit',
          category: 'Produce',
          sources: [
            { recipeId: 'r0', recipeTitle: 'Recipe 0', originalAmount: '1 item' },
            { recipeId: 'r1', recipeTitle: 'Recipe 1', originalAmount: '1 item' },
          ],
        },
      ],
    })
  }
  return JSON.stringify({
    title: 'Mock Recipe',
    ingredients: [{ name: 'Test Ingredient', amount: '1 cup' }],
    steps: ['Step 1', 'Step 2'],
    protein: 'Chicken',
    prepTime: 10,
    cookTime: 20,
    servings: 4,
    structuredIngredients: [],
    ingredientGroups: [{ header: 'Main', startIndex: 0, endIndex: 1 }],
    stepGroups: [{ header: 'Cook', startIndex: 0, endIndex: 2 }],
    structuredSteps: [
      { text: 'Step 1', highlightedText: 'Step 1' },
      { text: 'Step 2', highlightedText: 'Step 2' },
    ],
    description: 'A mock recipe.',
  })
}

async function* createStream(content: string) {
  yield { choices: [{ delta: { content } }] }
}

vi.mock('openai', () => {
  return {
    default: class {
      chat = {
        completions: {
          create: vi.fn(
            ({
              messages,
              stream,
            }: {
              messages: Array<{ role: string; content: string }>
              stream?: boolean
            }) => {
              const content = determineContent(messages)
              if (stream) {
                return createStream(content)
              }
              return Promise.resolve({
                choices: [{ message: { content } }],
              })
            },
          ),
        },
      }
    },
  }
})

// Mock for generate-grocery-list (Gemini via @google/genai)
vi.mock('@google/genai', () => {
  let streamYields = 0
  return {
    GoogleGenAI: class {
      models = {
        generateContentStream: vi.fn(() => {
          streamYields = 0
          return (async function* () {
            if (streamYields === 0) {
              streamYields++
              yield {
                candidates: [
                  {
                    content: {
                      parts: [
                        {
                          text: JSON.stringify({
                            ingredients: [
                              {
                                name: 'Test Ingredient',
                                purchaseAmount: 2,
                                purchaseUnit: 'unit',
                                category: 'Produce',
                                sources: [
                                  { recipeId: 'r0', recipeTitle: 'Recipe 0', originalAmount: '1 item' },
                                  { recipeId: 'r1', recipeTitle: 'Recipe 1', originalAmount: '1 item' },
                                ],
                              },
                            ],
                          }),
                        },
                      ],
                    },
                  },
                ],
              }
            }
          })()
        }),
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

describe('API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('parse-recipe', () => {
    it('should return 400 if no query provided', async () => {
      const request = new Request('http://localhost/api/parse-recipe', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const locals = { runtime: { env: { OPENROUTER_API_KEY: 'mock-key', GEMINI_API_KEY: 'mock-key' } } }
      const response = await parseRecipe({ request, locals } as unknown as Parameters<
        typeof parseRecipe
      >[0])
      expect(response.status).toBe(400)
    })

    it('should call OpenAI and return structured data on valid query', async () => {
      const request = new Request('http://localhost/api/parse-recipe', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com' }),
      })
      const locals = { runtime: { env: { OPENROUTER_API_KEY: 'mock-key', GEMINI_API_KEY: 'mock-key' } } }
      const response = await parseRecipe({ request, locals } as unknown as Parameters<
        typeof parseRecipe
      >[0])
      expect(response.status).toBe(200)

      const text = await response.text()
      const lines = text.trim().split('\n')
      expect(lines.length).toBeGreaterThanOrEqual(1)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: Record<string, any> = {}
      for (const line of lines) {
        const parsed = JSON.parse(line)
        delete parsed._p
        Object.assign(data, parsed)
      }

      expect(data.title).toBe('Mock Recipe')
      expect(Array.isArray(data.ingredients)).toBe(true)
      expect(data.ingredients.length).toBeGreaterThan(0)
    })
  })

  describe('generate-grocery-list', () => {
    it('should return 200 if recipes list is empty', async () => {
      const request = new Request('http://localhost/api/generate-grocery-list', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const locals = { runtime: { env: { OPENROUTER_API_KEY: 'mock-key', GEMINI_API_KEY: 'mock-key' } } }
      const response = await generateGroceryList({ request, locals } as unknown as Parameters<
        typeof generateGroceryList
      >[0])
      expect(response.status).toBe(200)
    })

    it('should process multiple recipes in a single stream', async () => {
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
      const locals = { runtime: { env: { OPENROUTER_API_KEY: 'mock-key', GEMINI_API_KEY: 'mock-key' } } }

      const response = await generateGroceryList({ request, locals } as unknown as Parameters<
        typeof generateGroceryList
      >[0])

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.ingredients).toHaveLength(1)
      expect(data.ingredients[0].name).toBe('Test Ingredient')
      expect(data.ingredients[0].purchaseAmount).toBe(2)
      expect(data.ingredients[0].sources).toHaveLength(2)
    })
  })
})

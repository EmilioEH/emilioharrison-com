import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest'
import type { AstroCookies } from 'astro'

const { getDocument, setDocument, updateDocument } = vi.hoisted(() => ({
  getDocument: vi.fn(),
  setDocument: vi.fn(),
  updateDocument: vi.fn(),
}))

vi.mock('../../src/lib/firebase-server', () => ({
  db: { getDocument, setDocument, updateDocument },
}))

import { POST as parseRecipe } from '../../src/pages/api/parse-recipe'
import { POST as generateGroceryList } from '../../src/pages/api/generate-grocery-list'
import { createSessionToken, SESSION_COOKIE_NAME } from '../../src/lib/session'

const TEST_SECRET = 'api-test-secret'
vi.stubEnv('SESSION_SECRET', TEST_SECRET)
afterAll(() => vi.unstubAllEnvs())

/** Both endpoints now resolve identity from the signed session cookie (see lib/session.ts)
 * and, for the grocery endpoint, a `users/{uid}` Firestore lookup for family scoping. */
function fakeCookies(userId = 'test-user'): AstroCookies {
  const token = createSessionToken(TEST_SECRET, { uid: userId })
  return {
    get: (name: string) => (name === SESSION_COOKIE_NAME ? { value: token } : undefined),
  } as unknown as AstroCookies
}

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
                                  {
                                    recipeId: 'r0',
                                    recipeTitle: 'Recipe 0',
                                    originalAmount: '1 item',
                                  },
                                  {
                                    recipeId: 'r1',
                                    recipeTitle: 'Recipe 1',
                                    originalAmount: '1 item',
                                  },
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
    getDocument.mockResolvedValue(null) // no family by default
    setDocument.mockResolvedValue({})
    updateDocument.mockResolvedValue({})
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
      const locals = {
        runtime: { env: { OPENROUTER_API_KEY: 'mock-key', GEMINI_API_KEY: 'mock-key' } },
      }
      const response = await parseRecipe({
        request,
        locals,
        cookies: fakeCookies(),
      } as unknown as Parameters<typeof parseRecipe>[0])
      expect(response.status).toBe(400)
    })

    it('should call OpenAI and return structured data on valid query', async () => {
      const request = new Request('http://localhost/api/parse-recipe', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com' }),
      })
      const locals = {
        runtime: { env: { OPENROUTER_API_KEY: 'mock-key', GEMINI_API_KEY: 'mock-key' } },
      }
      const response = await parseRecipe({
        request,
        locals,
        cookies: fakeCookies(),
      } as unknown as Parameters<typeof parseRecipe>[0])
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
      const locals = {
        runtime: { env: { OPENROUTER_API_KEY: 'mock-key', GEMINI_API_KEY: 'mock-key' } },
      }
      const response = await generateGroceryList({
        request,
        locals,
        cookies: fakeCookies(),
      } as unknown as Parameters<typeof generateGroceryList>[0])
      expect(response.status).toBe(200)
    })

    it('should generate and persist the list to Firestore (no live Workers ctx to waitUntil, so the job runs to completion before the response returns)', async () => {
      const recipes = Array(6)
        .fill(null)
        .map((_, i) => ({
          id: `r${i}`,
          title: `Recipe ${i}`,
          ingredients: [{ name: 'item', amount: '1' }],
          steps: [],
        }))

      // The endpoint now re-fetches each recipe server-side by id rather than trusting the
      // client-supplied payload — so the fake `getDocument` needs to actually return them.
      getDocument.mockImplementation((collection: string, id: string) => {
        if (collection === 'recipes') return Promise.resolve(recipes.find((r) => r.id === id) ?? null)
        return Promise.resolve(null) // no family for users/families lookups
      })

      const request = new Request('http://localhost/api/generate-grocery-list', {
        method: 'POST',
        body: JSON.stringify({ recipeIds: recipes.map((r) => r.id), weekStartDate: '2024-01-01' }),
      })
      const locals = {
        runtime: { env: { OPENROUTER_API_KEY: 'mock-key', GEMINI_API_KEY: 'mock-key' } },
      }

      const response = await generateGroceryList({
        request,
        locals,
        cookies: fakeCookies(),
      } as unknown as Parameters<typeof generateGroceryList>[0])

      // The endpoint acknowledges immediately — the result lands in Firestore, not the response.
      expect(response.status).toBe(202)
      const ack = await response.json()
      expect(ack.success).toBe(true)
      expect(ack.status).toBe('processing')

      // Initial write marks the list as processing before generation starts.
      expect(setDocument).toHaveBeenCalledWith(
        'grocery_lists',
        ack.listId,
        expect.objectContaining({ status: 'processing' }),
      )

      // Final write (awaited directly since no ctx.waitUntil is available in this test) persists
      // the generated list.
      const finalCall = updateDocument.mock.calls.find(
        (call) => call[0] === 'grocery_lists' && call[2]?.status === 'complete',
      )
      expect(finalCall).toBeDefined()
      const persisted = finalCall![2]
      expect(persisted.ingredients).toHaveLength(1)
      expect(persisted.ingredients[0].name).toBe('Test Ingredient')
      expect(persisted.ingredients[0].purchaseAmount).toBe(2)
      expect(persisted.ingredients[0].sources).toHaveLength(2)
    })
  })
})

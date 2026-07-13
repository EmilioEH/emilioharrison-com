import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AstroCookies } from 'astro'

const { getDocument, runQuery, getCollection } = vi.hoisted(() => ({
  getDocument: vi.fn(),
  runQuery: vi.fn(),
  getCollection: vi.fn(),
}))

vi.mock('../../../lib/firebase-server', () => ({
  db: { getDocument, runQuery, getCollection },
}))

import { GET, chunkArray, dedupeById, toListRecipe } from './index'
import type { Recipe } from '../../../lib/types'

function fakeCookies(userId: string | null): AstroCookies {
  return {
    get: (name: string) => (name === 'site_user' && userId ? { value: userId } : undefined),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

function makeRecipe(overrides: Partial<Recipe> & { id: string }): Recipe {
  return {
    title: 'Untitled',
    servings: 4,
    prepTime: 10,
    cookTime: 20,
    ingredients: [{ name: 'salt', amount: '1 tsp' }],
    steps: ['Do the thing'],
    ...overrides,
  } as Recipe
}

describe('GET /api/recipes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getDocument.mockResolvedValue(null)
    runQuery.mockResolvedValue([])
    getCollection.mockResolvedValue([])
  })

  it('uses runQuery (scoped createdBy filters) and never calls getCollection for recipes', async () => {
    getDocument.mockImplementation(async (collection: string, id: string) => {
      if (collection === 'users' && id === 'user-1') return { familyId: null }
      return null
    })

    await GET({ cookies: fakeCookies('user-1') } as never)

    // Legacy (createdBy == null) query + the IN-chunk query for the current user.
    expect(runQuery).toHaveBeenCalledWith('recipes', {
      field: 'createdBy',
      op: 'EQUAL',
      value: null,
    })
    expect(runQuery).toHaveBeenCalledWith('recipes', {
      field: 'createdBy',
      op: 'IN',
      value: ['user-1'],
    })

    // getCollection should only ever be called for the favorites subcollection, never 'recipes'.
    const recipeCollectionCalls = getCollection.mock.calls.filter(([col]) => col === 'recipes')
    expect(recipeCollectionCalls).toHaveLength(0)
  })

  it("returns the caller's own recipes", async () => {
    getDocument.mockImplementation(async (collection: string, id: string) => {
      if (collection === 'users' && id === 'user-1') return { familyId: null }
      return null
    })
    runQuery.mockImplementation(async (_col: string, filter: { op: string; value: unknown }) => {
      if (filter.op === 'IN' && (filter.value as string[]).includes('user-1')) {
        return [makeRecipe({ id: 'r1', title: 'My Recipe', createdBy: 'user-1' })]
      }
      return []
    })

    const res = await GET({ cookies: fakeCookies('user-1') } as never)
    const data = (await res.json()) as { recipes: Array<{ id: string }> }

    expect(data.recipes.map((r) => r.id)).toEqual(['r1'])
  })

  it("returns family members' recipes", async () => {
    getDocument.mockImplementation(async (collection: string, id: string) => {
      if (collection === 'users' && id === 'user-1') return { familyId: 'fam-1' }
      if (collection === 'families' && id === 'fam-1') {
        return { members: ['user-1', 'user-2'] }
      }
      return null
    })
    runQuery.mockImplementation(async (_col: string, filter: { op: string; value: unknown }) => {
      if (filter.op === 'IN') {
        const ids = filter.value as string[]
        expect(ids.sort()).toEqual(['user-1', 'user-2'])
        return [makeRecipe({ id: 'r2', title: "Family Member's Recipe", createdBy: 'user-2' })]
      }
      return []
    })

    const res = await GET({ cookies: fakeCookies('user-1') } as never)
    const data = (await res.json()) as { recipes: Array<{ id: string }> }

    expect(data.recipes.map((r) => r.id)).toEqual(['r2'])
  })

  it('returns legacy recipes with no createdBy (backfilled to createdBy: null)', async () => {
    getDocument.mockImplementation(async (collection: string, id: string) => {
      if (collection === 'users' && id === 'user-1') return { familyId: null }
      return null
    })
    runQuery.mockImplementation(async (_col: string, filter: { op: string }) => {
      if (filter.op === 'EQUAL') {
        return [makeRecipe({ id: 'legacy-1', title: 'Legacy Recipe' })]
      }
      return []
    })

    const res = await GET({ cookies: fakeCookies('user-1') } as never)
    const data = (await res.json()) as { recipes: Array<{ id: string }> }

    expect(data.recipes.map((r) => r.id)).toEqual(['legacy-1'])
  })

  it("does not leak another user's recipes", async () => {
    getDocument.mockImplementation(async (collection: string, id: string) => {
      if (collection === 'users' && id === 'user-1') return { familyId: null }
      return null
    })
    runQuery.mockImplementation(async (_col: string, filter: { op: string; value: unknown }) => {
      if (filter.op === 'IN') {
        // Only 'user-1' should ever be requested — a stranger's recipe never matches.
        expect(filter.value).toEqual(['user-1'])
        return []
      }
      return []
    })

    const res = await GET({ cookies: fakeCookies('user-1') } as never)
    const data = (await res.json()) as { recipes: Array<{ id: string }> }

    expect(data.recipes).toEqual([])
  })

  it('chunks the createdBy IN filter when the family exceeds the Firestore 30-value cap', async () => {
    const members = Array.from({ length: 45 }, (_, i) => `member-${i}`)
    getDocument.mockImplementation(async (collection: string, id: string) => {
      if (collection === 'users' && id === 'user-1') return { familyId: 'fam-1' }
      if (collection === 'families' && id === 'fam-1') return { members }
      return null
    })

    await GET({ cookies: fakeCookies('user-1') } as never)

    const inCalls = runQuery.mock.calls.filter(([, filter]) => filter.op === 'IN')
    expect(inCalls).toHaveLength(2)
    expect((inCalls[0][1].value as string[]).length).toBe(30)
    expect((inCalls[1][1].value as string[]).length).toBe(16) // 45 members + self, deduped by Set
  })

  it('populates isFavorite from the favorites subcollection', async () => {
    getDocument.mockImplementation(async (collection: string, id: string) => {
      if (collection === 'users' && id === 'user-1') return { familyId: null }
      return null
    })
    runQuery.mockImplementation(async (_col: string, filter: { op: string }) => {
      if (filter.op === 'IN') {
        return [
          makeRecipe({ id: 'r1', createdBy: 'user-1' }),
          makeRecipe({ id: 'r2', createdBy: 'user-1' }),
        ]
      }
      return []
    })
    getCollection.mockImplementation(async (path: string) => {
      if (path === 'users/user-1/favorites') return [{ id: 'r2' }]
      return []
    })

    const res = await GET({ cookies: fakeCookies('user-1') } as never)
    const data = (await res.json()) as { recipes: Array<{ id: string; isFavorite: boolean }> }

    const byId = Object.fromEntries(data.recipes.map((r) => [r.id, r.isFavorite]))
    expect(byId.r1).toBe(false)
    expect(byId.r2).toBe(true)
  })

  it('runs the recipe queries and favorites lookup in parallel (not sequential)', async () => {
    const events: string[] = []
    getDocument.mockImplementation(async (collection: string, id: string) => {
      if (collection === 'users' && id === 'user-1') return { familyId: null }
      return null
    })
    runQuery.mockImplementation(async () => {
      events.push('runQuery:start')
      await new Promise((r) => setTimeout(r, 10))
      events.push('runQuery:end')
      return []
    })
    getCollection.mockImplementation(async () => {
      events.push('favorites:start')
      await new Promise((r) => setTimeout(r, 10))
      events.push('favorites:end')
      return []
    })

    await GET({ cookies: fakeCookies('user-1') } as never)

    // If these ran sequentially, both `runQuery:end` calls would appear before `favorites:start`.
    // Running in parallel means favorites starts before the first runQuery call resolves.
    const favoritesStartIdx = events.indexOf('favorites:start')
    const lastRunQueryEndIdx = events.lastIndexOf('runQuery:end')
    expect(favoritesStartIdx).toBeLessThan(lastRunQueryEndIdx)
  })

  it('list response contains no instructions/steps or structured grocery fields', async () => {
    getDocument.mockImplementation(async (collection: string, id: string) => {
      if (collection === 'users' && id === 'user-1') return { familyId: null }
      return null
    })
    runQuery.mockImplementation(async (_col: string, filter: { op: string }) => {
      if (filter.op === 'IN') {
        return [
          makeRecipe({
            id: 'r1',
            createdBy: 'user-1',
            steps: ['Step one', 'Step two'],
            structuredSteps: [{ text: 'Step one' }],
            structuredIngredients: [
              { original: '1 tsp salt', name: 'salt', amount: 1, unit: 'tsp', category: 'Spices' },
            ],
            stepIngredients: [{ indices: [0] }],
            notes: 'secret notes',
            ingredients: [{ name: 'salt', amount: '1 tsp' }],
          }),
        ]
      }
      return []
    })

    const res = await GET({ cookies: fakeCookies('user-1') } as never)
    const data = (await res.json()) as { recipes: Array<Record<string, unknown>> }
    const recipe = data.recipes[0]

    expect(recipe.steps).toBeUndefined()
    expect(recipe.structuredSteps).toBeUndefined()
    expect(recipe.structuredIngredients).toBeUndefined()
    expect(recipe.stepIngredients).toBeUndefined()
    expect(recipe.notes).toBeUndefined()
    // Ingredient names must remain for Fuse.js search (useFilteredRecipes.ts searches
    // `ingredients.name`).
    expect(recipe.ingredients).toEqual([{ name: 'salt', amount: '1 tsp' }])
  })

  it('never leaves a console.log in the request path', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    getDocument.mockImplementation(async (collection: string, id: string) => {
      if (collection === 'users' && id === 'user-1') return { familyId: null }
      return null
    })

    await GET({ cookies: fakeCookies('user-1') } as never)

    expect(logSpy).not.toHaveBeenCalled()
    logSpy.mockRestore()
  })
})

describe('chunkArray', () => {
  it('splits arrays into chunks of the given size', () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  it('returns an empty array for empty input', () => {
    expect(chunkArray([], 30)).toEqual([])
  })
})

describe('dedupeById', () => {
  it('keeps the first occurrence of each id', () => {
    expect(
      dedupeById([
        { id: 'a', v: 1 },
        { id: 'b', v: 2 },
        { id: 'a', v: 3 },
      ]),
    ).toEqual([
      { id: 'a', v: 1 },
      { id: 'b', v: 2 },
    ])
  })
})

describe('toListRecipe', () => {
  it('excludes steps/structured fields and keeps list-view fields', () => {
    const recipe = makeRecipe({
      id: 'r1',
      structuredSteps: [{ text: 'x' }],
      notes: 'secret',
    })

    const slim = toListRecipe(recipe, true)

    expect(slim).not.toHaveProperty('steps')
    expect(slim).not.toHaveProperty('structuredSteps')
    expect(slim).not.toHaveProperty('notes')
    expect(slim.id).toBe('r1')
    expect(slim.isFavorite).toBe(true)
    expect(slim.ingredients).toEqual(recipe.ingredients)
  })
})

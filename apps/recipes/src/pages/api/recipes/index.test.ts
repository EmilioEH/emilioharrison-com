import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import type { AstroCookies } from 'astro'

const { getDocument, runQuery, getCollection, createDocument, updateDocument } = vi.hoisted(() => ({
  getDocument: vi.fn(),
  runQuery: vi.fn(),
  getCollection: vi.fn(),
  createDocument: vi.fn(),
  updateDocument: vi.fn(),
}))

vi.mock('../../../lib/firebase-server', () => ({
  db: { getDocument, runQuery, getCollection, createDocument, updateDocument },
}))

const { runEnhancementJob } = vi.hoisted(() => ({ runEnhancementJob: vi.fn() }))
vi.mock('../../../lib/services/recipe-enhancement-job', () => ({ runEnhancementJob }))

const { rateLimit } = vi.hoisted(() => ({ rateLimit: vi.fn() }))
vi.mock('../../../lib/rate-limit', () => ({ rateLimit }))

import {
  GET,
  POST,
  triggerBackgroundEnhancement,
  chunkArray,
  dedupeById,
  toListRecipe,
} from './index'
import { createSessionToken, SESSION_COOKIE_NAME } from '../../../lib/session'
import type { Recipe } from '../../../lib/types'
import type { APIContext } from 'astro'

const TEST_SECRET = 'recipes-index-test-secret'
vi.stubEnv('SESSION_SECRET', TEST_SECRET)
afterAll(() => vi.unstubAllEnvs())

// Build cookies carrying a real signed session, so these tests exercise the production
// identity path in lib/session.ts rather than a forgeable raw cookie.
function fakeCookies(userId: string | null): AstroCookies {
  const token = userId ? createSessionToken(TEST_SECRET, { uid: userId }) : null
  return {
    get: (name: string) => (name === SESSION_COOKIE_NAME && token ? { value: token } : undefined),
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

    // getCollection should never be called for 'recipes' — visibility uses scoped queries only.
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

function fakePostContext(
  body: Record<string, unknown>,
  userId: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  localsOverrides: Record<string, any> = {},
): APIContext {
  return {
    request: {
      json: async () => body,
      url: 'http://localhost/protected/recipes/api/recipes',
    },
    cookies: fakeCookies(userId),
    locals: localsOverrides,
  } as unknown as APIContext
}

describe('POST /api/recipes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getDocument.mockResolvedValue(null)
    createDocument.mockResolvedValue({})
    updateDocument.mockResolvedValue({})
    rateLimit.mockResolvedValue({ limited: false, remaining: 10 })
    runEnhancementJob.mockResolvedValue({ success: true })
  })

  it('does not set enhancementStatus or trigger enhancement for a manually-created recipe', async () => {
    const res = await POST(
      fakePostContext({ title: 'Manual Recipe', creationMethod: 'manual' }, 'user-1'),
    )
    expect(res.status).toBe(201)

    const created = createDocument.mock.calls[0][2]
    expect(created).not.toHaveProperty('enhancementStatus')

    // Give any fire-and-forget microtasks a chance to run before asserting absence.
    await new Promise((r) => setTimeout(r, 0))
    expect(runEnhancementJob).not.toHaveBeenCalled()
  })

  it('sets enhancementStatus: pending on creation for a titled AI-parsed recipe', async () => {
    const res = await POST(
      fakePostContext({ title: 'AI Recipe', creationMethod: 'ai-parse' }, 'user-1'),
    )
    expect(res.status).toBe(201)

    const created = createDocument.mock.calls[0][2]
    expect(created.enhancementStatus).toBe('pending')
  })

  it('does not qualify an AI-parsed recipe with no title', async () => {
    await POST(fakePostContext({ creationMethod: 'ai-parse' }, 'user-1'))
    const created = createDocument.mock.calls[0][2]
    expect(created).not.toHaveProperty('enhancementStatus')
  })

  it('clamps a hallucinated protein value to "Other" instead of saving it as-is', async () => {
    await POST(
      fakePostContext(
        { title: 'AI Recipe', creationMethod: 'ai-parse', protein: 'Turkey' },
        'user-1',
      ),
    )
    const created = createDocument.mock.calls[0][2]
    expect(created.protein).toBe('Other')
  })
})

describe('triggerBackgroundEnhancement', () => {
  const recipe: Recipe = {
    id: 'r1',
    title: 'AI Recipe',
    servings: 4,
    prepTime: 10,
    cookTime: 20,
    ingredients: [{ name: 'salt', amount: '1 tsp' }],
    steps: ['Do the thing'],
    creationMethod: 'ai-parse',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    updateDocument.mockResolvedValue({})
    rateLimit.mockResolvedValue({ limited: false, remaining: 10 })
    runEnhancementJob.mockResolvedValue({ success: true })
  })

  it('does nothing for a recipe that does not qualify (not ai-parse / no title)', async () => {
    await triggerBackgroundEnhancement(
      fakePostContext({}, 'user-1'),
      { ...recipe, creationMethod: 'manual' },
      'user-1',
    )
    expect(rateLimit).not.toHaveBeenCalled()
    expect(runEnhancementJob).not.toHaveBeenCalled()
  })

  it('hands the job to ctx.waitUntil when a Workers context is available', async () => {
    const waitUntil = vi.fn()
    await triggerBackgroundEnhancement(
      fakePostContext({}, 'user-1', { runtime: { ctx: { waitUntil } } }),
      recipe,
      'user-1',
    )
    expect(waitUntil).toHaveBeenCalledTimes(1)
    expect(runEnhancementJob).toHaveBeenCalledWith(expect.anything(), recipe, 'http://localhost')
  })

  it('awaits the job directly when no Workers ctx is available (local dev fallback)', async () => {
    await triggerBackgroundEnhancement(fakePostContext({}, 'user-1'), recipe, 'user-1')
    expect(runEnhancementJob).toHaveBeenCalledWith(expect.anything(), recipe, 'http://localhost')
  })

  it('skips the job and records an error status when rate-limited', async () => {
    rateLimit.mockResolvedValue({ limited: true, remaining: 0 })

    await triggerBackgroundEnhancement(fakePostContext({}, 'user-1'), recipe, 'user-1')

    expect(runEnhancementJob).not.toHaveBeenCalled()
    expect(updateDocument).toHaveBeenCalledWith(
      'recipes',
      'r1',
      expect.objectContaining({ enhancementStatus: 'error' }),
    )
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

    const slim = toListRecipe(recipe)

    expect(slim).not.toHaveProperty('steps')
    expect(slim).not.toHaveProperty('structuredSteps')
    expect(slim).not.toHaveProperty('notes')
    expect(slim.id).toBe('r1')
    expect(slim.ingredients).toEqual(recipe.ingredients)
  })

  it('carries thumbUrl through so library cards can request the small variant (P5)', () => {
    const recipe = makeRecipe({
      id: 'r2',
      images: ['https://example.com/full.jpg'],
      thumbUrl: 'https://example.com/full-thumb.jpg',
    })

    const slim = toListRecipe(recipe)

    expect(slim.thumbUrl).toBe('https://example.com/full-thumb.jpg')
  })

  it('leaves thumbUrl undefined for recipes that predate it (no backfill)', () => {
    const recipe = makeRecipe({ id: 'r3', images: ['https://example.com/full.jpg'] })
    delete (recipe as { thumbUrl?: string }).thumbUrl

    const slim = toListRecipe(recipe)

    expect(slim.thumbUrl).toBeUndefined()
  })
})

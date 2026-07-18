import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import type { AstroCookies } from 'astro'

const { getDocument, runQuery, getCollection } = vi.hoisted(() => ({
  getDocument: vi.fn(),
  runQuery: vi.fn(),
  getCollection: vi.fn(),
}))

vi.mock('../../lib/firebase-server', () => ({
  db: { getDocument, runQuery, getCollection },
}))

import { GET } from './bootstrap'
import { createSessionToken, SESSION_COOKIE_NAME } from '../../lib/session'
import type { Recipe } from '../../lib/types'

const TEST_SECRET = 'bootstrap-test-secret'
vi.stubEnv('SESSION_SECRET', TEST_SECRET)
afterAll(() => vi.unstubAllEnvs())

// `userId`/`email` are carried in a real signed session cookie so identity resolves through
// the production path (lib/session.ts); `extra` still allows other raw cookies for a test.
function fakeContext(userId: string | null, extra: Record<string, string> = {}, email?: string) {
  const cookieValues: Record<string, string> = { ...extra }
  if (userId) {
    cookieValues[SESSION_COOKIE_NAME] = createSessionToken(TEST_SECRET, { uid: userId, email })
  }
  const cookies = {
    get: (name: string) =>
      cookieValues[name] !== undefined ? { value: cookieValues[name] } : undefined,
  } as unknown as AstroCookies
  return { cookies, locals: {}, url: new URL('http://localhost/api/bootstrap') } as never
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

describe('GET /api/bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getDocument.mockResolvedValue(null)
    runQuery.mockResolvedValue([])
    getCollection.mockResolvedValue([])
  })

  it('returns 401 when there is no session', async () => {
    const res = await GET(fakeContext(null))
    expect(res.status).toBe(401)
  })

  it('bundles user, recipes, planned, and family into a single response', async () => {
    getDocument.mockImplementation(async (collection: string, id: string) => {
      if (collection === 'users' && id === 'user-1') {
        return {
          id: 'user-1',
          familyId: 'fam-1',
          email: 'user1@example.com',
          displayName: 'User One',
        }
      }
      if (collection === 'families' && id === 'fam-1') {
        return {
          id: 'fam-1',
          name: 'The Ones',
          members: ['user-1', 'user-2'],
          createdBy: 'user-1',
          createdAt: '2026-01-01',
        }
      }
      if (collection === 'users' && id === 'user-2') {
        return { id: 'user-2', email: 'user2@example.com', displayName: 'User Two' }
      }
      return null
    })
    runQuery.mockImplementation(async (_col: string, filter: { op: string; value: unknown }) => {
      if (filter.op === 'IN') {
        return [makeRecipe({ id: 'r1', createdBy: 'user-1' })]
      }
      return [] // legacy (createdBy == null)
    })
    getCollection.mockImplementation(async (path: string) => {
      if (path === 'families/fam-1/recipeData') {
        return [
          { id: 'r1', weekPlan: { isPlanned: true }, notes: [], ratings: [], cookingHistory: [] },
        ]
      }
      if (path === 'pending_invites') return []
      return []
    })

    const res = await GET(fakeContext('user-1', { site_email: 'user1@example.com' }))
    expect(res.status).toBe(200)
    const data = (await res.json()) as {
      user: { displayName: string; isAdmin: boolean }
      recipes: Array<{ id: string }>
      planned: Array<{ id: string }>
      family: {
        family: { id: string } | null
        members: Array<{ id: string }>
        currentUserId: string
      }
    }

    expect(data.user).toEqual({ displayName: 'User One', isAdmin: false })
    expect(data.recipes.map((r) => r.id)).toEqual(['r1'])
    expect(data.planned.map((p) => p.id)).toEqual(['r1'])
    expect(data.family.family?.id).toBe('fam-1')
    expect(data.family.members.map((m) => m.id).sort()).toEqual(['user-1', 'user-2'])
    expect(data.family.currentUserId).toBe('user-1')
  })

  it('list recipes contain no steps/structured fields (matches GET /api/recipes slimming)', async () => {
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
            steps: ['a', 'b'],
            structuredSteps: [{ text: 'a' }],
          }),
        ]
      }
      return []
    })

    const res = await GET(fakeContext('user-1'))
    const data = (await res.json()) as { recipes: Array<Record<string, unknown>> }

    expect(data.recipes[0].steps).toBeUndefined()
    expect(data.recipes[0].structuredSteps).toBeUndefined()
  })

  it('handles a user with no family gracefully (no family doc / no planned data)', async () => {
    getDocument.mockImplementation(async (collection: string, id: string) => {
      if (collection === 'users' && id === 'user-1') return { familyId: null }
      return null
    })

    const res = await GET(fakeContext('user-1'))
    const data = (await res.json()) as {
      planned: unknown[]
      family: { family: unknown; members: unknown[] }
    }

    expect(data.planned).toEqual([])
    expect(data.family.family).toBeNull()
    expect(data.family.members).toEqual([])
    // No family doc means no family-scoped Firestore calls should ever run.
    expect(getCollection).not.toHaveBeenCalledWith('families/null/recipeData')
  })

  it('runs the family-independent Firestore reads in parallel, not sequentially', async () => {
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
    getCollection.mockImplementation(async (path: string) => {
      events.push(`getCollection:${path}:start`)
      await new Promise((r) => setTimeout(r, 10))
      events.push(`getCollection:${path}:end`)
      return []
    })

    await GET(fakeContext('user-1'))

    const invitesStartIdx = events.indexOf('getCollection:pending_invites:start')
    const lastRunQueryEndIdx = events.lastIndexOf('runQuery:end')
    expect(invitesStartIdx).toBeLessThan(lastRunQueryEndIdx)
  })

  it('marks a user as admin when their email is in ADMIN_EMAILS', async () => {
    const originalEnv = process.env.ADMIN_EMAILS
    process.env.ADMIN_EMAILS = 'admin@example.com'
    try {
      getDocument.mockImplementation(async (collection: string, id: string) => {
        if (collection === 'users' && id === 'admin-1') {
          return { familyId: null, email: 'admin@example.com' }
        }
        return null
      })

      const res = await GET(fakeContext('admin-1'))
      const data = (await res.json()) as { user: { isAdmin: boolean } }
      expect(data.user.isAdmin).toBe(true)
    } finally {
      process.env.ADMIN_EMAILS = originalEnv
    }
  })

  it('never leaves a console.log in the request path', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    getDocument.mockImplementation(async (collection: string, id: string) => {
      if (collection === 'users' && id === 'user-1') return { familyId: null }
      return null
    })

    await GET(fakeContext('user-1'))

    expect(logSpy).not.toHaveBeenCalled()
    logSpy.mockRestore()
  })
})

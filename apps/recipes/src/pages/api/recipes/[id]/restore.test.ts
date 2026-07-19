import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import type { AstroCookies } from 'astro'

const { getDocument, updateDocument } = vi.hoisted(() => ({
  getDocument: vi.fn(),
  updateDocument: vi.fn(),
}))

vi.mock('../../../../lib/firebase-server', () => ({
  db: { getDocument, updateDocument },
}))

import { POST as restoreRecipe } from './restore'
import { createSessionToken, SESSION_COOKIE_NAME } from '../../../../lib/session'

const TEST_SECRET = 'restore-test-secret'
vi.stubEnv('SESSION_SECRET', TEST_SECRET)
afterAll(() => vi.unstubAllEnvs())

function fakeCookies(userId = 'test-user'): AstroCookies {
  const token = createSessionToken(TEST_SECRET, { uid: userId })
  return {
    get: (name: string) => (name === SESSION_COOKIE_NAME ? { value: token } : undefined),
  } as unknown as AstroCookies
}

function fakeContext(recipeId: string, userId = 'test-user') {
  return {
    request: new Request(`http://localhost/api/recipes/${recipeId}/restore`, { method: 'POST' }),
    params: { id: recipeId },
    cookies: fakeCookies(userId),
    locals: {},
  } as unknown as Parameters<typeof restoreRecipe>[0]
}

describe('POST /api/recipes/[id]/restore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    updateDocument.mockResolvedValue({})
  })

  it('restores the snapshot and clears previousVersion', async () => {
    getDocument.mockResolvedValue({
      id: 'r1',
      createdBy: 'test-user',
      title: 'Corrupted Title',
      ingredients: [{ name: 'Chicken', amount: '1 lb' }],
      steps: ['Step A'],
      previousVersion: {
        savedAt: '2024-01-01T00:00:00.000Z',
        reason: 'refresh',
        data: {
          title: 'Original Title',
          ingredients: [{ name: 'Beef', amount: '2 lb' }],
          steps: ['Original Step'],
        },
      },
    })

    const response = await restoreRecipe(fakeContext('r1'))
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.recipe.title).toBe('Original Title')
    expect(body.recipe.ingredients).toEqual([{ name: 'Beef', amount: '2 lb' }])
    expect(body.recipe.previousVersion).toBeNull()

    expect(updateDocument).toHaveBeenCalledWith(
      'recipes',
      'r1',
      expect.objectContaining({ title: 'Original Title', previousVersion: null }),
    )
  })

  it('returns 400 when there is no previous version to restore', async () => {
    getDocument.mockResolvedValue({
      id: 'r1',
      createdBy: 'test-user',
      title: 'Current Title',
    })

    const response = await restoreRecipe(fakeContext('r1'))
    expect(response.status).toBe(400)
    expect(updateDocument).not.toHaveBeenCalled()
  })

  it('returns 404 for a recipe the caller cannot access', async () => {
    getDocument.mockResolvedValue({
      id: 'r1',
      createdBy: 'someone-else',
      previousVersion: { savedAt: '2024-01-01', reason: 'refresh', data: {} },
    })

    const response = await restoreRecipe(fakeContext('r1'))
    expect(response.status).toBe(404)
    expect(updateDocument).not.toHaveBeenCalled()
  })
})

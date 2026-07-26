import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AstroCookies } from 'astro'

const { getDocument, runQuery } = vi.hoisted(() => ({ getDocument: vi.fn(), runQuery: vi.fn() }))
vi.mock('./firebase-server', () => ({ db: { getDocument, runQuery } }))

// getAuthUser reads the signed session; drive it directly by mocking api-helpers.
const { getAuthUser } = vi.hoisted(() => ({ getAuthUser: vi.fn() }))
vi.mock('./api-helpers', () => ({ getAuthUser }))

import {
  getAllowedCreatorIds,
  isRecipeAccessible,
  listAccessibleRecipes,
  loadAccessibleRecipe,
} from './recipe-access'

const cookies = {} as AstroCookies

beforeEach(() => {
  vi.clearAllMocks()
})

describe('isRecipeAccessible', () => {
  const allowed = new Set(['me', 'family-mate'])

  it('allows legacy recipes with no createdBy', () => {
    expect(isRecipeAccessible({ createdBy: undefined }, allowed)).toBe(true)
    expect(isRecipeAccessible({ createdBy: null as unknown as undefined }, allowed)).toBe(true)
  })

  it('allows the owner and family members', () => {
    expect(isRecipeAccessible({ createdBy: 'me' }, allowed)).toBe(true)
    expect(isRecipeAccessible({ createdBy: 'family-mate' }, allowed)).toBe(true)
  })

  it('denies a recipe created by an outsider', () => {
    expect(isRecipeAccessible({ createdBy: 'stranger' }, allowed)).toBe(false)
  })
})

describe('getAllowedCreatorIds', () => {
  it('returns just the user when they have no family', async () => {
    getDocument.mockResolvedValueOnce({ familyId: null })
    const ids = await getAllowedCreatorIds('me')
    expect([...ids]).toEqual(['me'])
  })

  it('includes all family members', async () => {
    getDocument
      .mockResolvedValueOnce({ familyId: 'fam-1' }) // users/me
      .mockResolvedValueOnce({ members: ['me', 'mate-1', 'mate-2'] }) // families/fam-1
    const ids = await getAllowedCreatorIds('me')
    expect([...ids].sort()).toEqual(['mate-1', 'mate-2', 'me'])
  })
})

describe('loadAccessibleRecipe', () => {
  it('401s when unauthenticated', async () => {
    getAuthUser.mockReturnValue(null)
    const res = await loadAccessibleRecipe(cookies, 'r1')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.response.status).toBe(401)
  })

  it('404s when the recipe does not exist', async () => {
    getAuthUser.mockReturnValue('me')
    getDocument.mockResolvedValueOnce(null) // recipes/r1
    const res = await loadAccessibleRecipe(cookies, 'r1')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.response.status).toBe(404)
  })

  it('404s (masking existence) when the recipe belongs to another family', async () => {
    getAuthUser.mockReturnValue('me')
    getDocument
      .mockResolvedValueOnce({ id: 'r1', createdBy: 'stranger' }) // recipes/r1
      .mockResolvedValueOnce({ familyId: 'fam-1' }) // users/me
      .mockResolvedValueOnce({ members: ['me'] }) // families/fam-1
    const res = await loadAccessibleRecipe(cookies, 'r1')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.response.status).toBe(404)
  })

  it('returns the recipe for the owner', async () => {
    getAuthUser.mockReturnValue('me')
    getDocument
      .mockResolvedValueOnce({ id: 'r1', createdBy: 'me' }) // recipes/r1
      .mockResolvedValueOnce({ familyId: null }) // users/me
    const res = await loadAccessibleRecipe(cookies, 'r1')
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.userId).toBe('me')
      expect(res.recipe.id).toBe('r1')
    }
  })

  it('returns a legacy (createdBy-less) recipe for any user', async () => {
    getAuthUser.mockReturnValue('me')
    getDocument
      .mockResolvedValueOnce({ id: 'r1' }) // recipes/r1 — no createdBy
      .mockResolvedValueOnce({ familyId: null }) // users/me
    const res = await loadAccessibleRecipe(cookies, 'r1')
    expect(res.ok).toBe(true)
  })
})

describe('listAccessibleRecipes', () => {
  /** Answers the legacy (`createdBy == null`) query first, then one per creator chunk. */
  const respondWith = (legacy: unknown[], byCreator: unknown[]) => {
    runQuery.mockImplementation((_collection: string, filter: { value: unknown }) =>
      Promise.resolve(filter.value === null ? legacy : byCreator),
    )
  }

  it('asks for legacy-public recipes plus the family as creators', async () => {
    getDocument.mockImplementation((collection: string) =>
      collection === 'users'
        ? Promise.resolve({ familyId: 'fam-1' })
        : Promise.resolve({ members: ['me', 'partner'] }),
    )
    respondWith([{ id: 'legacy' }], [{ id: 'mine' }])

    const recipes = await listAccessibleRecipes('me')

    expect(recipes.map((r) => r.id).sort()).toEqual(['legacy', 'mine'])
    const inFilter = runQuery.mock.calls.find(([, f]) => f.op === 'IN')![1]
    expect(new Set(inFilter.value)).toEqual(new Set(['me', 'partner']))
  })

  it('never widens to the whole collection for a family member', async () => {
    // The bug this replaces: `!createdBy || createdBy === userId || familyId` — the trailing
    // `|| familyId` was truthy for anyone in a family, so every recipe in the database passed.
    getDocument.mockImplementation((collection: string) =>
      collection === 'users'
        ? Promise.resolve({ familyId: 'fam-1' })
        : Promise.resolve({ members: ['me'] }),
    )
    respondWith([], [])

    await listAccessibleRecipes('me')

    for (const [collection, filter] of runQuery.mock.calls) {
      expect(collection).toBe('recipes')
      expect(filter.field).toBe('createdBy')
    }
    expect(getDocument).not.toHaveBeenCalledWith('recipes', expect.anything())
  })

  it('de-dupes a recipe returned by more than one query', async () => {
    getDocument.mockResolvedValue(null)
    respondWith([{ id: 'shared' }], [{ id: 'shared' }])

    expect(await listAccessibleRecipes('me')).toEqual([{ id: 'shared' }])
  })

  it('shows an unauthenticated caller only the legacy-public recipes', async () => {
    respondWith([{ id: 'legacy' }], [{ id: 'mine' }])

    expect(await listAccessibleRecipes(null)).toEqual([{ id: 'legacy' }])
    expect(runQuery).toHaveBeenCalledTimes(1)
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AstroCookies } from 'astro'

const { getDocument } = vi.hoisted(() => ({ getDocument: vi.fn() }))
vi.mock('./firebase-server', () => ({ db: { getDocument } }))

// getAuthUser reads the signed session; drive it directly by mocking api-helpers.
const { getAuthUser } = vi.hoisted(() => ({ getAuthUser: vi.fn() }))
vi.mock('./api-helpers', () => ({ getAuthUser }))

import { getAllowedCreatorIds, isRecipeAccessible, loadAccessibleRecipe } from './recipe-access'

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

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useBootstrap } from './useBootstrap'
import {
  $recipes,
  $recipesLoading,
  $recipesInitialized,
  $recipesError,
} from '../../../lib/recipeStore'
import { $currentFamily, $familyMembers, $recipeFamilyData } from '../../../lib/familyStore'

function resetStores() {
  $recipes.set([])
  $recipesLoading.set(true)
  $recipesInitialized.set(false)
  $recipesError.set(null)
  $currentFamily.set(null)
  $familyMembers.set([])
  $recipeFamilyData.set({})
}

describe('useBootstrap', () => {
  beforeEach(() => {
    resetStores()
  })

  afterEach(() => {
    resetStores()
    vi.restoreAllMocks()
  })

  it('fetches /api/bootstrap exactly once and feeds recipeStore/familyStore', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        user: { displayName: 'Emilio', isAdmin: true, hasOnboarded: true },
        recipes: [{ id: 'r1', title: 'Tacos' }],
        planned: [{ id: 'r1', weekPlan: { isPlanned: true } }],
        family: {
          family: {
            id: 'fam-1',
            name: 'The Ones',
            members: ['u1'],
            createdBy: 'u1',
            createdAt: '2026-01-01',
          },
          members: [],
          currentUserId: 'u1',
          incomingInvites: [],
          outgoingInvites: [],
        },
      }),
    })
    global.fetch = fetchMock

    const { result } = renderHook(() => useBootstrap())

    await waitFor(() => expect(result.current.bootstrapped).toBe(true))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toContain('api/bootstrap')
    expect(result.current.user).toEqual({
      displayName: 'Emilio',
      isAdmin: true,
      hasOnboarded: true,
    })
    expect($recipes.get()).toEqual([{ id: 'r1', title: 'Tacos' }])
    expect($recipesInitialized.get()).toBe(true)
    expect($currentFamily.get()?.id).toBe('fam-1')
    expect($recipeFamilyData.get()['r1'].weekPlan?.isPlanned).toBe(true)
  })

  it('treats a 401 as "no session" without falling back to the individual endpoints', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401 })
    global.fetch = fetchMock

    const { result } = renderHook(() => useBootstrap())

    await waitFor(() => expect(result.current.bootstrapped).toBe(true))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('falls back to the individual endpoints when /api/bootstrap fails', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('api/bootstrap')) {
        return Promise.resolve({ ok: false, status: 500 })
      }
      if (url.includes('api/recipes')) {
        return Promise.resolve({ ok: true, json: async () => ({ recipes: [{ id: 'r2' }] }) })
      }
      if (url.includes('week/planned')) {
        return Promise.resolve({ ok: true, json: async () => ({ success: true, planned: [] }) })
      }
      if (url.includes('families/current')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, family: null, members: [], currentUserId: 'u1' }),
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
    })
    global.fetch = fetchMock

    const { result } = renderHook(() => useBootstrap())

    await waitFor(() => expect(result.current.bootstrapped).toBe(true))
    await waitFor(() => expect($recipesInitialized.get()).toBe(true))

    expect($recipes.get()).toEqual([{ id: 'r2' }])
    // Bootstrap + 3 fallback calls.
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('a network failure on both bootstrap and the fallback still resolves loading (no permanent spinner)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'))

    const { result } = renderHook(() => useBootstrap())

    await waitFor(() => expect(result.current.bootstrapped).toBe(true))
    await waitFor(() => expect($recipesError.get()).not.toBeNull())
    expect($recipesLoading.get()).toBe(false)
  })
})

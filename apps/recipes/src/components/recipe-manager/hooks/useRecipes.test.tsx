import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useRecipes } from './useRecipes'
import {
  $recipes,
  $recipesLoading,
  $recipesInitialized,
  $recipesError,
} from '../../../lib/recipeStore'
import type { Recipe } from '../../../lib/types'

function mockRecipe(id: string, overrides: Partial<Recipe> = {}): Recipe {
  return {
    id,
    title: `Recipe ${id}`,
    servings: 2,
    prepTime: 5,
    cookTime: 10,
    ingredients: [],
    steps: [],
    ...overrides,
  }
}

function setUserCookie(userId: string | null) {
  document.cookie = 'site_user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/'
  if (userId) {
    document.cookie = `site_user=${userId}; path=/`
  }
}

/**
 * Resets the shared recipeStore atoms to a known baseline before each test. The module-level
 * cache-hydration side effect in recipeStore.ts (which decides these initial values on a real
 * page load) already has its own dedicated coverage in recipeStore.test.ts — here we drive the
 * atoms directly so each test can start from an explicit "cold" or "warm" state without needing
 * `vi.resetModules()` (which would create a second React module instance mid-test-file and break
 * `renderHook`).
 */
function resetStoreToCold() {
  $recipes.set([])
  $recipesLoading.set(true)
  $recipesInitialized.set(false)
  $recipesError.set(null)
}

function resetStoreToWarm(recipes: Recipe[]) {
  $recipes.set(recipes)
  $recipesLoading.set(false)
  $recipesInitialized.set(true)
  $recipesError.set(null)
}

describe('useRecipes — stale-while-revalidate mount behavior', () => {
  beforeEach(() => {
    localStorage.clear()
    setUserCookie('user-a')
    resetStoreToCold()
  })

  afterEach(() => {
    setUserCookie(null)
    localStorage.clear()
    resetStoreToCold()
    vi.restoreAllMocks()
  })

  it('cold launch: shows loading until the network fetch resolves (baseline unchanged)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ recipes: [mockRecipe('r1')] }),
    })

    const { result } = renderHook(() => useRecipes())

    expect(result.current.loading).toBe(true)
    expect(result.current.initialized).toBe(false)

    await waitFor(() => expect(result.current.initialized).toBe(true))

    expect(result.current.loading).toBe(false)
    expect(result.current.recipes).toEqual([mockRecipe('r1')])
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('warm launch: renders cached recipes immediately with no loading indicator', async () => {
    resetStoreToWarm([mockRecipe('r1', { title: 'Stale Title' })])

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ recipes: [mockRecipe('r1', { title: 'Fresh Title' })] }),
    })

    const { result } = renderHook(() => useRecipes())

    // First render already reflects the pre-hydrated store — no spinner, no waiting.
    expect(result.current.loading).toBe(false)
    expect(result.current.initialized).toBe(true)
    expect(result.current.recipes[0].title).toBe('Stale Title')
  })

  it('warm launch: still kicks off a background refresh and reconciles when it resolves', async () => {
    resetStoreToWarm([mockRecipe('r1', { title: 'Stale Title' })])

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ recipes: [mockRecipe('r1', { title: 'Fresh Title' })] }),
    })

    const { result } = renderHook(() => useRecipes())

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(result.current.recipes[0].title).toBe('Fresh Title'))

    // Loading must never have flipped true for a warm/background refresh.
    expect(result.current.loading).toBe(false)
  })

  it('warm launch: a failed background refresh keeps showing cached data instead of an error screen', async () => {
    resetStoreToWarm([mockRecipe('r1')])

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      json: async () => ({}),
    })

    const { result } = renderHook(() => useRecipes())

    expect(result.current.loading).toBe(false)
    expect(result.current.recipes).toEqual([mockRecipe('r1')])

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))
    // Let the rejected fetch's .catch handler run.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(result.current.error).toBeNull()
    expect(result.current.recipes).toEqual([mockRecipe('r1')])
  })

  it('cold launch: a failed fetch still surfaces the error screen (baseline unchanged)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      json: async () => ({}),
    })

    const { result } = renderHook(() => useRecipes())

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.loading).toBe(false)
  })
})

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Recipe } from './types'

const CACHE_KEY = (userId: string) => `chefboard:recipesCache:${userId}`

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
  // Clear any existing site_user cookie first (jsdom accumulates cookies across sets otherwise).
  document.cookie = 'site_user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/'
  if (userId) {
    document.cookie = `site_user=${userId}; path=/`
  }
}

describe('recipeStore persistence (P2 — stale-while-revalidate)', () => {
  beforeEach(() => {
    localStorage.clear()
    setUserCookie('user-a')
    vi.resetModules()
  })

  afterEach(() => {
    setUserCookie(null)
    localStorage.clear()
  })

  it('getCurrentUserId reads the non-httpOnly site_user cookie', async () => {
    const { getCurrentUserId } = await import('./recipeStore')
    expect(getCurrentUserId()).toBe('user-a')
  })

  it('getCurrentUserId returns null when there is no session', async () => {
    setUserCookie(null)
    const { getCurrentUserId } = await import('./recipeStore')
    expect(getCurrentUserId()).toBeNull()
  })

  it('readPersistedRecipes returns null when there is no cache entry', async () => {
    const { readPersistedRecipes } = await import('./recipeStore')
    expect(readPersistedRecipes()).toBeNull()
  })

  it('readPersistedRecipes returns null when there is no logged-in user', async () => {
    localStorage.setItem(CACHE_KEY('user-a'), JSON.stringify([mockRecipe('r1')]))
    setUserCookie(null)
    const { readPersistedRecipes } = await import('./recipeStore')
    expect(readPersistedRecipes()).toBeNull()
  })

  describe('write-through on mutation', () => {
    it('setRecipes persists the full payload under the current user key', async () => {
      const { recipeActions } = await import('./recipeStore')
      const recipes = [mockRecipe('r1')]

      recipeActions.setRecipes(recipes)

      const raw = localStorage.getItem(CACHE_KEY('user-a'))
      expect(raw).not.toBeNull()
      expect(JSON.parse(raw as string)).toEqual(recipes)
    })

    it('addRecipe/updateRecipe/deleteRecipe each write through to the persisted cache', async () => {
      const { recipeActions } = await import('./recipeStore')

      recipeActions.setRecipes([mockRecipe('r1')])
      recipeActions.addRecipe(mockRecipe('r2'))
      let stored = JSON.parse(localStorage.getItem(CACHE_KEY('user-a')) as string) as Recipe[]
      expect(stored.map((r) => r.id)).toEqual(['r1', 'r2'])

      recipeActions.updateRecipe(mockRecipe('r2', { title: 'Updated Title' }))
      stored = JSON.parse(localStorage.getItem(CACHE_KEY('user-a')) as string) as Recipe[]
      expect(stored.find((r) => r.id === 'r2')?.title).toBe('Updated Title')

      recipeActions.deleteRecipe('r1')
      stored = JSON.parse(localStorage.getItem(CACHE_KEY('user-a')) as string) as Recipe[]
      expect(stored.map((r) => r.id)).toEqual(['r2'])
    })

    it('a mutation persisted via recipeActions survives a simulated reload (fresh module import)', async () => {
      const store1 = await import('./recipeStore')
      store1.recipeActions.setRecipes([mockRecipe('r1')])
      store1.recipeActions.updateRecipe(mockRecipe('r1', { title: 'Edited After Save' }))

      vi.resetModules()
      const store2 = await import('./recipeStore') // simulates a page reload / fresh app launch
      expect(store2.$recipesInitialized.get()).toBe(true)
      expect(store2.$recipesLoading.get()).toBe(false)
      expect(store2.$recipes.get()[0]?.title).toBe('Edited After Save')
    })

    it('setError does not write to the persisted cache', async () => {
      const { recipeActions } = await import('./recipeStore')
      recipeActions.setRecipes([mockRecipe('r1')])
      const before = localStorage.getItem(CACHE_KEY('user-a'))

      recipeActions.setError('network blew up')

      expect(localStorage.getItem(CACHE_KEY('user-a'))).toBe(before)
    })
  })

  describe('corrupt / oversized cache resilience', () => {
    it('malformed JSON falls back to network (returns null) without throwing', async () => {
      localStorage.setItem(CACHE_KEY('user-a'), '{not valid json::')
      const { readPersistedRecipes } = await import('./recipeStore')

      expect(() => readPersistedRecipes()).not.toThrow()
      expect(readPersistedRecipes()).toBeNull()
    })

    it('valid JSON with the wrong shape falls back to network', async () => {
      localStorage.setItem(CACHE_KEY('user-a'), JSON.stringify({ not: 'an array' }))
      const { readPersistedRecipes } = await import('./recipeStore')
      expect(readPersistedRecipes()).toBeNull()
    })

    it('an array of non-recipe objects falls back to network', async () => {
      localStorage.setItem(CACHE_KEY('user-a'), JSON.stringify([{ foo: 'bar' }]))
      const { readPersistedRecipes } = await import('./recipeStore')
      expect(readPersistedRecipes()).toBeNull()
    })

    it('an oversized cache entry falls back to network without crashing', async () => {
      // Must exceed MAX_CACHE_BYTES (4 MB) but stay under jsdom's own ~5,000,000 code-unit
      // localStorage quota simulation, or `setItem` itself throws before we even get to exercise
      // the code under test.
      const huge = JSON.stringify([mockRecipe('r1', { notes: 'x'.repeat(4.3 * 1024 * 1024) })])
      localStorage.setItem(CACHE_KEY('user-a'), huge)
      const { readPersistedRecipes } = await import('./recipeStore')

      expect(() => readPersistedRecipes()).not.toThrow()
      expect(readPersistedRecipes()).toBeNull()
    })

    it('module-load hydration ignores a corrupt cache entry and starts cold', async () => {
      localStorage.setItem(CACHE_KEY('user-a'), 'garbage-not-json')
      const { $recipes, $recipesLoading, $recipesInitialized } = await import('./recipeStore')

      expect($recipes.get()).toEqual([])
      expect($recipesLoading.get()).toBe(true)
      expect($recipesInitialized.get()).toBe(false)
    })

    it('a quota-exceeded style write error does not throw', async () => {
      const { recipeActions } = await import('./recipeStore')
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('The quota has been exceeded', 'QuotaExceededError')
      })

      expect(() => recipeActions.setRecipes([mockRecipe('r1')])).not.toThrow()

      setItemSpy.mockRestore()
    })
  })

  describe('module-load hydration (stale-while-revalidate)', () => {
    it('warm launch: hydrates loading=false/initialized=true synchronously from cache', async () => {
      localStorage.setItem(CACHE_KEY('user-a'), JSON.stringify([mockRecipe('r1')]))
      const { $recipes, $recipesLoading, $recipesInitialized } = await import('./recipeStore')

      expect($recipesLoading.get()).toBe(false)
      expect($recipesInitialized.get()).toBe(true)
      expect($recipes.get()).toEqual([mockRecipe('r1')])
    })

    it('cold launch: no cache leaves loading=true/initialized=false, exactly like before', async () => {
      const { $recipes, $recipesLoading, $recipesInitialized } = await import('./recipeStore')

      expect($recipesLoading.get()).toBe(true)
      expect($recipesInitialized.get()).toBe(false)
      expect($recipes.get()).toEqual([])
    })
  })

  describe('per-user scoping / logout isolation', () => {
    it("a second user never sees the first user's cached recipes", async () => {
      setUserCookie('user-a')
      const storeA = await import('./recipeStore')
      storeA.recipeActions.setRecipes([mockRecipe('secret-a')])

      setUserCookie('user-b')
      vi.resetModules()
      const storeB = await import('./recipeStore')

      expect(storeB.readPersistedRecipes()).toBeNull()
      expect(storeB.$recipes.get()).toEqual([])
      expect(storeB.$recipesInitialized.get()).toBe(false)
    })

    it("clearPersistedRecipes only removes the specified user's entry", async () => {
      const { recipeActions, clearPersistedRecipes } = await import('./recipeStore')
      recipeActions.setRecipes([mockRecipe('r1')])
      localStorage.setItem(CACHE_KEY('user-b'), JSON.stringify([mockRecipe('other')]))

      clearPersistedRecipes('user-a')

      expect(localStorage.getItem(CACHE_KEY('user-a'))).toBeNull()
      expect(localStorage.getItem(CACHE_KEY('user-b'))).not.toBeNull()
    })

    it("logout (clearPersistedRecipes with no args) clears the current session user's cache", async () => {
      const { recipeActions, clearPersistedRecipes } = await import('./recipeStore')
      recipeActions.setRecipes([mockRecipe('r1')])
      expect(localStorage.getItem(CACHE_KEY('user-a'))).not.toBeNull()

      clearPersistedRecipes() // matches GlobalBurgerMenu's logout handler call signature

      expect(localStorage.getItem(CACHE_KEY('user-a'))).toBeNull()
    })

    it("logging out and a different user logging in never surfaces the previous user's recipes", async () => {
      setUserCookie('user-a')
      const storeA = await import('./recipeStore')
      storeA.recipeActions.setRecipes([mockRecipe('secret-a')])
      storeA.clearPersistedRecipes() // simulate logout

      setUserCookie('user-b') // simulate a different user logging in
      vi.resetModules()
      const storeB = await import('./recipeStore') // simulate the resulting fresh page load

      expect(storeB.$recipes.get()).toEqual([])
      expect(storeB.$recipesInitialized.get()).toBe(false)
    })

    it("switching the site_user cookie between two sessions reads each user's own cache slot, never the other's", async () => {
      setUserCookie('user-a')
      const storeA = await import('./recipeStore')
      storeA.recipeActions.setRecipes([mockRecipe('user-a-own-recipe')])

      setUserCookie('user-b')
      vi.resetModules()
      const storeB = await import('./recipeStore')
      expect(storeB.$recipes.get()).toEqual([]) // no leak of user-a's cache
      storeB.recipeActions.setRecipes([mockRecipe('user-b-recipe')])

      setUserCookie('user-a')
      vi.resetModules()
      const restoredStoreA = await import('./recipeStore')
      expect(restoredStoreA.$recipes.get()).toEqual([mockRecipe('user-a-own-recipe')])
    })
  })
})

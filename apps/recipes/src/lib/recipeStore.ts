import { atom } from 'nanostores'
import type { Recipe } from './types'

export const $recipes = atom<Recipe[]>([])
export const $recipesLoading = atom<boolean>(true)
export const $recipesInitialized = atom<boolean>(false)

export const $recipesError = atom<string | null>(null)

// ---------------------------------------------------------------------------
// Persisted cache (stale-while-revalidate — see PERFORMANCE-PLAN.md, P2)
// ---------------------------------------------------------------------------
//
// `@nanostores/persistent`'s `persistentAtom`/`persistentMap` (used elsewhere in this codebase,
// e.g. userPreferences.ts, weekStore.ts) bake the storage key in at atom-creation time. This
// cache needs a *dynamic* key — scoped to whichever user is currently logged in — so that
// switching accounts (including admin impersonation, see api/admin/impersonate.ts + revert.ts)
// can never surface a different user's recipes. That rules out a static-key persistentAtom, so
// this follows the other established pattern in the codebase for that situation: a hand-rolled,
// SSR-guarded localStorage read/write behind try/catch (see src/stores/overviewCooking.ts).
//
// Payload size: recipe documents are plain JSON (images are Storage URLs, not embedded base64,
// once saved — see the "Storage Proxy" section of the root CLAUDE.md), so a realistic library of
// a few hundred recipes lands in the hundreds-of-KB range, well under localStorage's ~5MB/origin
// quota. IndexedDB would add real complexity (async API, schema versioning) for no measured
// benefit here, so localStorage was chosen. MAX_CACHE_BYTES below is a defensive ceiling in case
// an individual account's library (or a legacy recipe with an inlined base64 sourceImage) grows
// unexpectedly large — writes/reads past it are skipped rather than risking a quota exception or
// a slow JSON.parse of a multi-megabyte string.

const CACHE_KEY_PREFIX = 'chefboard:recipesCache:'
const MAX_CACHE_BYTES = 4 * 1024 * 1024 // 4 MB

function hasLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage
  } catch {
    // Some environments throw on access (e.g. storage disabled) rather than returning undefined.
    return false
  }
}

/**
 * Reads the `site_user` cookie value client-side. This cookie is intentionally set with
 * `httpOnly: false` everywhere it's written (login.ts, admin/impersonate.ts, admin/revert.ts) so
 * the client can read the logged-in user's id — the same pattern GlobalFeedback.jsx already uses.
 * Returns null server-side (SSR) or when there's no session.
 */
export function getCurrentUserId(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)site_user=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

function cacheKeyFor(userId: string): string {
  return `${CACHE_KEY_PREFIX}${userId}`
}

function isRecipeArray(value: unknown): value is Recipe[] {
  return (
    Array.isArray(value) &&
    value.every((r) => r !== null && typeof r === 'object' && typeof (r as Recipe).id === 'string')
  )
}

/**
 * Reads the persisted recipes cache for the currently logged-in user. Returns `null` if there is
 * no session, no cache entry, the entry is corrupt/malformed, or it exceeds the size threshold —
 * callers should treat `null` as "fall back to a normal network fetch" in every case.
 */
export function readPersistedRecipes(): Recipe[] | null {
  if (!hasLocalStorage()) return null
  const userId = getCurrentUserId()
  if (!userId) return null

  try {
    const raw = window.localStorage.getItem(cacheKeyFor(userId))
    if (!raw) return null

    if (raw.length > MAX_CACHE_BYTES) {
      console.warn('[recipeStore] Ignoring oversized recipes cache entry')
      window.localStorage.removeItem(cacheKeyFor(userId))
      return null
    }

    const parsed: unknown = JSON.parse(raw)
    if (!isRecipeArray(parsed)) {
      console.warn('[recipeStore] Ignoring malformed recipes cache entry')
      window.localStorage.removeItem(cacheKeyFor(userId))
      return null
    }

    return parsed
  } catch (err) {
    console.warn('[recipeStore] Failed to read recipes cache, falling back to network', err)
    return null
  }
}

function persistRecipes(recipes: Recipe[]): void {
  if (!hasLocalStorage()) return
  const userId = getCurrentUserId()
  if (!userId) return

  try {
    const serialized = JSON.stringify(recipes)
    if (serialized.length > MAX_CACHE_BYTES) {
      console.warn('[recipeStore] Skipping recipes cache write: payload exceeds size threshold')
      return
    }
    window.localStorage.setItem(cacheKeyFor(userId), serialized)
  } catch (err) {
    // Quota exceeded, storage disabled, etc. — the in-memory store still works, we just lose the
    // warm-launch benefit next time.
    console.warn('[recipeStore] Failed to persist recipes cache', err)
  }
}

/**
 * Clears the persisted recipes cache. Call on logout (see GlobalBurgerMenu.tsx) so a user's data
 * never lingers in storage after they've signed out. Per-user keying already guarantees a
 * *different* user can never read another user's entry (including across admin impersonation —
 * see api/admin/impersonate.ts / revert.ts, both of which swap the `site_user` cookie and then
 * hard-reload, so the next read of this module picks up the new identity's own cache slot); this
 * is belt-and-suspenders plus keeps storage tidy.
 */
export function clearPersistedRecipes(userId?: string | null): void {
  if (!hasLocalStorage()) return
  const id = userId ?? getCurrentUserId()
  if (id) {
    window.localStorage.removeItem(cacheKeyFor(id))
  }
}

// Hydrate synchronously from cache at module load (browser only), so the very first render of
// RecipeManagerView already reflects previously-seen data — no spinner flash while waiting for
// the mount effect in useRecipes.ts to run. This mirrors the top-level side effect weekStore.ts
// already uses to correct stale persisted state before first render.
if (typeof window !== 'undefined') {
  const cached = readPersistedRecipes()
  if (cached !== null) {
    $recipes.set(cached)
    $recipesLoading.set(false)
    $recipesInitialized.set(true)
  }
}

export const recipeActions = {
  setRecipes: (recipes: Recipe[]) => {
    $recipes.set(recipes)
    $recipesLoading.set(false)
    $recipesInitialized.set(true)
    $recipesError.set(null)
    persistRecipes(recipes)
  },

  setError: (error: string) => {
    $recipesError.set(error)
    $recipesLoading.set(false)
    $recipesInitialized.set(true)
  },

  clearError: () => {
    $recipesError.set(null)
  },

  addRecipe: (recipe: Recipe) => {
    const current = $recipes.get()
    const updated = [...current, recipe]
    $recipes.set(updated)
    persistRecipes(updated)
  },

  updateRecipe: (updatedRecipe: Recipe) => {
    const current = $recipes.get()
    const updated = current.map((r) => (r.id === updatedRecipe.id ? updatedRecipe : r))
    $recipes.set(updated)
    persistRecipes(updated)
  },

  deleteRecipe: (id: string) => {
    const current = $recipes.get()
    const updated = current.filter((r) => r.id !== id)
    $recipes.set(updated)
    persistRecipes(updated)
  },
}

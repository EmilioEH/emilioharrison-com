import { useEffect, useRef, useState } from 'react'
import { recipeActions, $recipesInitialized } from '../../../lib/recipeStore'
import { familyActions } from '../../../lib/familyStore'
import type { Recipe, Family, User, PendingInvite, FamilyRecipeData } from '../../../lib/types'

const getBaseUrl = (): string => {
  const base = import.meta.env.BASE_URL
  return base.endsWith('/') ? base : `${base}/`
}

export interface BootstrapUser {
  displayName: string | null
  isAdmin: boolean
}

interface BootstrapFamily {
  family: Family | null
  members: User[]
  currentUserId: string | null
  incomingInvites: PendingInvite[]
  outgoingInvites: PendingInvite[]
}

interface BootstrapResponse {
  success: boolean
  user: BootstrapUser
  recipes: Recipe[]
  planned: FamilyRecipeData[]
  family: BootstrapFamily
}

/**
 * Fetches `GET /api/bootstrap` once on mount and feeds `recipeStore`/`familyStore` directly —
 * this replaces what used to be 3 separate boot-time round trips (`/api/recipes`,
 * `/api/week/planned`, `/api/families/current`; see PERFORMANCE-PLAN.md P6+P7). Also returns the
 * user-identity fields (`displayName`/`isAdmin`) that used to come from a blocking
 * SSR Firestore lookup in `[...path].astro` — that lookup no longer blocks the HTML response, so
 * `RecipeManager` gets these fields from here instead, once bootstrap resolves.
 *
 * If `/api/bootstrap` itself fails (network error, 5xx — anything other than a clean 401, which
 * just means "no session"), falls back to firing the three individual endpoints directly so a
 * transient bootstrap outage doesn't leave the app permanently stuck with no data. The extra
 * round trips are only paid on that unhappy path.
 */
export function useBootstrap() {
  const [user, setUser] = useState<BootstrapUser | null>(null)
  const [bootstrapped, setBootstrapped] = useState(false)
  const hasMountedRef = useRef(false)

  useEffect(() => {
    if (hasMountedRef.current) return
    hasMountedRef.current = true

    const base = getBaseUrl()

    const runFallback = async () => {
      try {
        const [recipesRes, plannedRes, familyRes] = await Promise.all([
          fetch(`${base}api/recipes`),
          fetch(`${base}api/week/planned`),
          fetch(`${base}api/families/current`),
        ])

        if (recipesRes.ok) {
          const data = await recipesRes.json()
          recipeActions.setRecipes((data.recipes as Recipe[]) || [])
        } else if (!$recipesInitialized.get()) {
          recipeActions.setError(`Failed to fetch recipes: ${recipesRes.status}`)
        }

        if (plannedRes.ok) {
          const data = await plannedRes.json()
          if (data.success && Array.isArray(data.planned)) {
            data.planned.forEach((item: FamilyRecipeData) => {
              familyActions.setRecipeFamilyData(item.id, item)
            })
          }
        }

        if (familyRes.ok) {
          const data = await familyRes.json()
          if (data.success) {
            familyActions.setFamily(data.family ?? null)
            familyActions.setMembers(data.members || [])
            familyActions.setCurrentUserId(data.currentUserId || null)
            if (Array.isArray(data.incomingInvites)) {
              familyActions.setPendingInvites(data.incomingInvites)
            }
          }
        }
      } catch (err) {
        console.error('[useBootstrap] Fallback fetch failed', err)
        if (!$recipesInitialized.get()) {
          recipeActions.setError('Failed to load your recipes.')
        }
      }
    }

    const runBootstrap = async () => {
      try {
        const res = await fetch(`${base}api/bootstrap`)

        if (res.status === 401) {
          // No session — middleware would normally have already redirected an unauthenticated
          // request away from this page entirely; nothing to bootstrap here.
          return
        }

        if (!res.ok) {
          throw new Error(`Bootstrap failed: ${res.status}`)
        }

        const data = (await res.json()) as BootstrapResponse

        recipeActions.setRecipes(data.recipes || [])
        ;(data.planned || []).forEach((item) => familyActions.setRecipeFamilyData(item.id, item))
        familyActions.setFamily(data.family?.family ?? null)
        familyActions.setMembers(data.family?.members ?? [])
        familyActions.setCurrentUserId(data.family?.currentUserId ?? null)
        familyActions.setPendingInvites(data.family?.incomingInvites ?? [])
        setUser(data.user ?? null)
      } catch (err) {
        console.error(
          '[useBootstrap] /api/bootstrap failed, falling back to individual endpoints',
          err,
        )
        await runFallback()
      } finally {
        setBootstrapped(true)
      }
    }

    runBootstrap()
  }, [])

  return { user, bootstrapped }
}

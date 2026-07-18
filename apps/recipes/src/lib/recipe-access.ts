/**
 * Centralized per-recipe authorization.
 *
 * The backend talks to Firestore with a service account, which bypasses Firestore security
 * rules — so these application-level checks are the ONLY thing standing between an
 * authenticated user and another family's recipe documents. Any endpoint that reads or
 * writes a document in the top-level `recipes` collection by an arbitrary `[id]` must gate
 * that access through `loadAccessibleRecipe` (or `getAllowedCreatorIds` + `isRecipeAccessible`).
 *
 * Access model (mirrors the visibility scope of `GET /api/recipes`):
 *   A recipe is accessible when it is legacy-public (no `createdBy`) OR its `createdBy` is the
 *   requester or one of their family members. Read and write use the same set — this app's
 *   family-sharing model already treats shared recipes as collaboratively editable.
 */
import type { AstroCookies } from 'astro'
import { db } from './firebase-server'
import { getAuthUser } from './api-helpers'
import type { Recipe } from './types'

export type RecipeAccessResult =
  | { ok: true; userId: string; recipe: Recipe }
  | { ok: false; response: Response }

const jsonResponse = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

/**
 * The set of creator ids whose recipes `userId` may access: themselves plus every member of
 * their family (if any).
 */
export async function getAllowedCreatorIds(userId: string): Promise<Set<string>> {
  const allowed = new Set<string>([userId])

  const userDoc = await db.getDocument<{ familyId?: string }>('users', userId)
  if (userDoc?.familyId) {
    const familyDoc = await db.getDocument<{ members?: string[] }>('families', userDoc.familyId)
    if (Array.isArray(familyDoc?.members)) {
      familyDoc.members.forEach((memberId) => allowed.add(memberId))
    }
  }

  return allowed
}

/**
 * Whether `recipe` is accessible to a user whose allowed-creator set is `allowedCreators`.
 * Legacy recipes with no `createdBy` are treated as public (visible to everyone), consistent
 * with `GET /api/recipes`.
 */
export function isRecipeAccessible(
  recipe: Pick<Recipe, 'createdBy'>,
  allowedCreators: Set<string>,
): boolean {
  const creator = recipe.createdBy
  if (creator === undefined || creator === null) return true
  return allowedCreators.has(creator)
}

/**
 * Load a recipe and enforce that the authenticated caller may access it.
 *
 * Returns the recipe on success, or a ready-to-return `Response`:
 *  - 401 when there is no session,
 *  - 404 when the recipe is missing OR the caller isn't allowed to see it (existence is
 *    deliberately masked so IDs from other families can't be probed).
 */
export async function loadAccessibleRecipe(
  cookies: AstroCookies,
  recipeId: string | undefined,
): Promise<RecipeAccessResult> {
  const userId = getAuthUser(cookies)
  if (!userId) {
    return { ok: false, response: jsonResponse({ error: 'Unauthorized' }, 401) }
  }
  if (!recipeId) {
    return { ok: false, response: jsonResponse({ error: 'Recipe ID required' }, 400) }
  }

  const recipe = (await db.getDocument('recipes', recipeId)) as Recipe | null
  if (!recipe) {
    return { ok: false, response: jsonResponse({ error: 'Recipe not found' }, 404) }
  }

  const allowedCreators = await getAllowedCreatorIds(userId)
  if (!isRecipeAccessible(recipe, allowedCreators)) {
    // Mask existence: same 404 a truly-missing recipe returns.
    return { ok: false, response: jsonResponse({ error: 'Recipe not found' }, 404) }
  }

  return { ok: true, userId, recipe }
}

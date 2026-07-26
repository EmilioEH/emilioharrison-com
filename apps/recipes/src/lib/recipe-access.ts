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
import { chunkArray, dedupeById, FIRESTORE_IN_LIMIT } from './collection-utils'
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
 * Every recipe `userId` may see, as whole documents.
 *
 * This is the collection-level twin of `loadAccessibleRecipe`, and the single implementation of
 * the visibility scope: (createdBy IN [me, ...family]) UNION (legacy recipes with no `createdBy`).
 * Firestore cannot query "field does not exist" server-side (not even via `!=`), so the legacy
 * branch relies on those documents having been backfilled with an explicit `createdBy: null`.
 * True field-less legacy docs won't match; that is a known trade-off of avoiding a full collection
 * scan on every request (see README/PERFORMANCE-PLAN.md).
 *
 * Pass `null` for an unauthenticated caller — they see only the legacy-public recipes.
 *
 * Callers project this to whatever shape they need (`toListRecipe` for the library, the whole
 * document for the meal suggester). `GET /api/bootstrap` deliberately keeps its own copy of these
 * queries: it interleaves them with the family and invite fetches to keep the boot path to a
 * single round of parallel work, and folding it in here would serialise that.
 */
export async function listAccessibleRecipes(userId: string | null): Promise<Recipe[]> {
  const allowedCreators = userId ? await getAllowedCreatorIds(userId) : new Set<string>()

  const results = await Promise.all([
    db.runQuery<Recipe>('recipes', { field: 'createdBy', op: 'EQUAL', value: null }),
    ...chunkArray(Array.from(allowedCreators), FIRESTORE_IN_LIMIT).map((chunk) =>
      db.runQuery<Recipe>('recipes', { field: 'createdBy', op: 'IN', value: chunk }),
    ),
  ])

  return dedupeById(results.flat())
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

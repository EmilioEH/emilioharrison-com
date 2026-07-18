import type { APIRoute, APIContext } from 'astro'
import { db } from '../../lib/firebase-server'
import { setRequestContext } from '../../lib/request-context'
import { getAuthUser, getAuthEmail, unauthorizedResponse } from '../../lib/api-helpers'
import { getEmailList, getEnv } from '../../lib/env'
import { isRecipe } from '../../lib/type-guards'
import { chunkArray, dedupeById, toListRecipe } from './recipes/index'
import type { Recipe, Family, User, PendingInvite, FamilyRecipeData } from '../../lib/types'

/**
 * GET /api/bootstrap
 *
 * Consolidates the boot-time data the client needs into a single round trip (see
 * PERFORMANCE-PLAN.md P6+P7): the caller's user profile (display name / admin flag), their
 * visible recipes (same slim shape as `GET /api/recipes`), this week's planned recipes (same
 * shape as `GET /api/week/planned`), and their family data (same shape as
 * `GET /api/families/current`, nested under `family`).
 *
 * This re-implements the query logic of those three endpoints rather than calling them over
 * HTTP internally — fetching them as sub-requests would still pay the round-trip cost server
 * side, just moved from the client to the worker, which defeats the point of this endpoint.
 * The three individual endpoints are left in place for any other caller (background refreshes,
 * post-mutation refetches, the family-sync poll/toast — see RecipeManager.tsx).
 */
export const GET: APIRoute = async (context: APIContext) => {
  setRequestContext(context)
  const { cookies } = context
  const userId = getAuthUser(cookies)

  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    // 1. The one unavoidable sequential dependency: everything else below (family id, email,
    // the admin flag, the recipe visibility scope) is derived from this document.
    const userDoc = await db.getDocument<User>('users', userId)
    const familyId = userDoc?.familyId || null

    let userEmail = userDoc?.email
    if (!userEmail) {
      userEmail = getAuthEmail(cookies) || ''
    }

    // 2. Everything that only depends on `userId` / `familyId` / `userEmail` (not on each
    // other) runs in parallel.
    const [familyDoc, plannedDataAll, allInvites, legacyRecipes] = await Promise.all([
      familyId ? db.getDocument<Family>('families', familyId) : Promise.resolve(null),
      familyId
        ? db.getCollection<FamilyRecipeData>(`families/${familyId}/recipeData`)
        : Promise.resolve([] as FamilyRecipeData[]),
      db.getCollection('pending_invites'),
      db.runQuery<Recipe>('recipes', { field: 'createdBy', op: 'EQUAL', value: null }),
    ])

    // 3. Family members' recipes depend on the family doc we just fetched — the member-doc
    // lookups and the scoped recipe query for those members are independent of each other, so
    // they run in parallel with one another (but necessarily after step 2).
    const members = (familyDoc?.members as string[] | undefined) || []
    const allowedCreators = new Set<string>([userId, ...members])
    const creatorChunks = chunkArray(Array.from(allowedCreators), 30)

    const [inRecipeResults, memberDocs] = await Promise.all([
      Promise.all(
        creatorChunks.map((chunk) =>
          db.runQuery<Recipe>('recipes', { field: 'createdBy', op: 'IN', value: chunk }),
        ),
      ),
      Promise.all(members.map((memberId) => db.getDocument<User>('users', memberId))),
    ])

    // --- Assemble recipes (mirrors GET /api/recipes) ---
    const rawRecipes = dedupeById([legacyRecipes, ...inRecipeResults].flat())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recipes = rawRecipes.filter(isRecipe).map((doc) => toListRecipe(doc))
    recipes.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))

    // --- Assemble planned (mirrors GET /api/week/planned) ---
    const planned = plannedDataAll.filter((data) => data.weekPlan?.isPlanned === true)

    // --- Assemble family (mirrors GET /api/families/current) ---
    const pendingInvites = (allInvites as unknown as PendingInvite[]).filter(
      (inv) => inv.email?.toLowerCase() === userEmail?.toLowerCase() && inv.status === 'pending',
    )
    const outgoingInvites = familyDoc
      ? (allInvites as unknown as PendingInvite[]).filter(
          (inv) => inv.familyId === familyDoc.id && inv.status === 'pending',
        )
      : []

    // --- Assemble user (mirrors [...path].astro's previous server-side lookup) ---
    const isTestMode = getEnv(context, 'PUBLIC_TEST_MODE') === 'true'
    const isTestUser = userId === 'TestUser' || userId === 'test_user'
    let isAdmin = false
    const displayName: string | null = userDoc?.displayName || userId

    if (isTestMode && isTestUser) {
      isAdmin = true
    } else if (userEmail) {
      const adminEmails = getEmailList(context, 'ADMIN_EMAILS')
      isAdmin = adminEmails.includes(userEmail.toLowerCase())
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: { displayName, isAdmin },
        recipes,
        planned,
        family: {
          family: familyDoc || null,
          members: memberDocs.filter((m): m is User => m !== null),
          currentUserId: userId,
          incomingInvites: pendingInvites,
          outgoingInvites,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (e) {
    console.error('GET Bootstrap Error', e)
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

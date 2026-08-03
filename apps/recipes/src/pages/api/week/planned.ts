import type { APIRoute, APIContext } from 'astro'
import { getAuthUser, unauthorizedResponse } from '../../../lib/api-helpers'
import { db } from '../../../lib/firebase-server'
import { setRequestContext } from '../../../lib/request-context'
import type { FamilyRecipeData } from '../../../lib/types'

/**
 * GET /api/week/planned
 * Get all recipes planned for the current or upcoming week (family-scoped)
 */
export const GET: APIRoute = async (context: APIContext) => {
  setRequestContext(context)
  const { cookies } = context
  const userId = getAuthUser(cookies)

  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    // 1. Get user's family
    const userDoc = await db.getDocument('users', userId)

    if (!userDoc || !userDoc.familyId) {
      return new Response(
        JSON.stringify({
          success: true,
          planned: [],
          message: 'No family assigned',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // 2. Get all family recipe data
    const allFamilyData = await db.getCollection(`families/${userDoc.familyId}/recipeData`)

    // 3. Planned recipes, plus anything the family has reviewed — the library card's
    // loved/disliked mark needs a verdict for recipes that are not on any plan. Kept in step with
    // the same filter in api/bootstrap.ts, which is the path that actually runs on load.
    const plannedData = allFamilyData.filter(
      (data: FamilyRecipeData) =>
        data.weekPlan?.isPlanned === true || (data.reviews?.length ?? 0) > 0,
    )

    return new Response(
      JSON.stringify({
        success: true,
        planned: plannedData as FamilyRecipeData[],
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (e) {
    console.error('GET Planned Recipes Error:', e)
    return new Response(
      JSON.stringify({
        success: false,
        error: (e as Error).message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}

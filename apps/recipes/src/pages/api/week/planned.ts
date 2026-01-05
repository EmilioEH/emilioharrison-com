import type { APIRoute } from 'astro'
import { getAuthUser, unauthorizedResponse } from '../../../lib/api-helpers'
import { db } from '../../../lib/firebase-server'
import type { FamilyRecipeData } from '../../../lib/types'

/**
 * GET /api/week/planned
 * Get all recipes planned for the current or upcoming week (family-scoped)
 */
export const GET: APIRoute = async ({ cookies }) => {
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

    // 3. Filter to only planned recipes
    const plannedData = allFamilyData.filter(
      (data: FamilyRecipeData) => data.weekPlan?.isPlanned === true,
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

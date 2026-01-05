import type { APIRoute } from 'astro'
import { getAuthUser, unauthorizedResponse } from '../../../../lib/api-helpers'
import { db } from '../../../../lib/firebase-server'
import type { UserRating, FamilyRecipeData } from '../../../../lib/types'

/**
 * POST /api/recipes/[id]/rating
 * Add or update a rating for a recipe (family-scoped)
 */
export const POST: APIRoute = async ({ params, request, cookies }) => {
  const userId = getAuthUser(cookies)
  const recipeId = params.id

  if (!userId) {
    return unauthorizedResponse()
  }

  if (!recipeId) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Recipe ID is required',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  try {
    const body = await request.json()
    const { rating } = body

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Rating must be a number between 1 and 5',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // 1. Get user's family and profile
    const userDoc = await db.getDocument('users', userId)

    if (!userDoc || !userDoc.familyId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'You must create or join a family first',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // 2. Get existing family recipe data or create new
    let familyData = await db.getDocument(`families/${userDoc.familyId}/recipeData`, recipeId)

    const newRating: UserRating = {
      userId,
      userName: userDoc.displayName || 'User',
      rating,
      ratedAt: new Date().toISOString(),
    }

    if (!familyData) {
      // Create new family data document
      const newFamilyData: FamilyRecipeData = {
        id: recipeId,
        notes: [],
        ratings: [newRating],
        weekPlan: { isPlanned: false },
        cookingHistory: [],
      }

      await db.createDocument(`families/${userDoc.familyId}/recipeData`, recipeId, newFamilyData)

      return new Response(
        JSON.stringify({
          success: true,
          data: newFamilyData,
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // 3. Update or add rating
    const existingRatings = (familyData.ratings || []) as UserRating[]
    const userRatingIndex = existingRatings.findIndex((r) => r.userId === userId)

    let updatedRatings: UserRating[]
    if (userRatingIndex >= 0) {
      // Update existing rating
      updatedRatings = [...existingRatings]
      updatedRatings[userRatingIndex] = newRating
    } else {
      // Add new rating
      updatedRatings = [...existingRatings, newRating]
    }

    await db.updateDocument(`families/${userDoc.familyId}/recipeData`, recipeId, {
      ratings: updatedRatings,
    })

    // Fetch updated data
    familyData = await db.getDocument(`families/${userDoc.familyId}/recipeData`, recipeId)

    return new Response(
      JSON.stringify({
        success: true,
        data: familyData as FamilyRecipeData,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (e) {
    console.error('POST Rating Error:', e)
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

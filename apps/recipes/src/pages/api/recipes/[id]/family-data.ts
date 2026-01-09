import type { APIRoute } from 'astro'
import { getAuthUser, unauthorizedResponse } from '../../../../lib/api-helpers'
import { db } from '../../../../lib/firebase-server'
import type { FamilyRecipeData } from '../../../../lib/types'

/**
 * GET /api/recipes/[id]/family-data
 * Get family-specific data for a recipe (notes, ratings, week plan, cooking history)
 */
export const GET: APIRoute = async ({ params, cookies }) => {
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
    // 1. Get user's family
    const userDoc = await db.getDocument('users', userId)

    if (!userDoc || !userDoc.familyId) {
      // User has no family - return empty data
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: recipeId,
            notes: [],
            ratings: [],
            weekPlan: { isPlanned: false },
            cookingHistory: [],
          } as FamilyRecipeData,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // 2. Get family recipe data
    const familyDataDoc = await db.getDocument(`families/${userDoc.familyId}/recipeData`, recipeId)

    if (!familyDataDoc) {
      // No data yet for this recipe
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: recipeId,
            notes: [],
            ratings: [],
            weekPlan: { isPlanned: false },
            cookingHistory: [],
          } as FamilyRecipeData,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: familyDataDoc as FamilyRecipeData,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (e) {
    console.error('GET Family Recipe Data Error:', e)
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

/**
 * PATCH /api/recipes/[id]/family-data
 * Update family-specific data (difficulty, ingredient/step notes)
 */
export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  const userId = getAuthUser(cookies)
  const recipeId = params.id

  if (!userId) return unauthorizedResponse()
  if (!recipeId) {
    return new Response(JSON.stringify({ success: false, error: 'Recipe ID required' }), {
      status: 400,
    })
  }

  try {
    const userDoc = await db.getDocument('users', userId)
    if (!userDoc?.familyId) {
      return new Response(JSON.stringify({ success: false, error: 'Must join a family first' }), {
        status: 400,
      })
    }

    const body = await request.json()
    const { difficulty, ingredientNotes, stepNotes } = body

    // Get existing data or create default
    let familyData = await db.getDocument(`families/${userDoc.familyId}/recipeData`, recipeId)
    if (!familyData) {
      familyData = {
        id: recipeId,
        notes: [],
        ratings: [],
        weekPlan: { isPlanned: false },
        cookingHistory: [],
        difficultyRatings: {},
        ingredientNotes: {},
        stepNotes: {},
      }
      await db.createDocument(`families/${userDoc.familyId}/recipeData`, recipeId, familyData)
    }

    // Merge Updates
    const updates: Partial<FamilyRecipeData> = {}

    // 1. Difficulty
    if (typeof difficulty === 'number') {
      updates.difficultyRatings = {
        ...(familyData.difficultyRatings || {}),
        [userId]: difficulty,
      }
    }

    // 2. Ingredient Notes (Merge)
    if (ingredientNotes) {
      updates.ingredientNotes = {
        ...(familyData.ingredientNotes || {}),
        ...ingredientNotes,
      }
    }

    // 3. Step Notes (Merge)
    if (stepNotes) {
      updates.stepNotes = {
        ...(familyData.stepNotes || {}),
        ...stepNotes,
      }
    }

    await db.updateDocument(`families/${userDoc.familyId}/recipeData`, recipeId, updates)

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (e) {
    console.error('PATCH Family Data Error:', e)
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 500,
    })
  }
}

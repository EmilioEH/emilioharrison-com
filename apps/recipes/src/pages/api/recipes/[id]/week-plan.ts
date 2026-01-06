import type { APIRoute } from 'astro'
import { getAuthUser, unauthorizedResponse } from '../../../../lib/api-helpers'
import { db } from '../../../../lib/firebase-server'
import type { WeekPlanData, FamilyRecipeData } from '../../../../lib/types'

/**
 * POST /api/recipes/[id]/week-plan
 * Add a recipe to the week plan or update its planning status (family-scoped)
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
    const { isPlanned, assignedDate } = body

    if (typeof isPlanned !== 'boolean') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'isPlanned (boolean) is required',
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

    const newWeekPlan: WeekPlanData = {
      isPlanned,
      assignedDate: assignedDate || undefined,
      addedBy: isPlanned ? userId : undefined,
      addedByName: isPlanned ? userDoc.displayName || 'User' : undefined,
      addedAt: isPlanned ? new Date().toISOString() : undefined,
    }

    if (!familyData) {
      // Create new family data document
      const newFamilyData: FamilyRecipeData = {
        id: recipeId,
        notes: [],
        ratings: [],
        weekPlan: newWeekPlan,
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

    // 3. Update week plan
    await db.updateDocument(`families/${userDoc.familyId}/recipeData`, recipeId, {
      weekPlan: newWeekPlan,
    })

    // 4. Update family's lastUpdated for sync optimization (the "flag")
    await db.updateDocument('families', userDoc.familyId, {
      lastUpdated: new Date().toISOString(),
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
    console.error('POST Week Plan Error:', e)
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
 * DELETE /api/recipes/[id]/week-plan
 * Remove a recipe from the week plan
 */
export const DELETE: APIRoute = async ({ params, cookies }) => {
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

    // 2. Update week plan to not planned
    await db.updateDocument(`families/${userDoc.familyId}/recipeData`, recipeId, {
      weekPlan: { isPlanned: false },
    })

    // 3. Update family's lastUpdated for sync optimization
    await db.updateDocument('families', userDoc.familyId, {
      lastUpdated: new Date().toISOString(),
    })

    return new Response(
      JSON.stringify({
        success: true,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (e) {
    console.error('DELETE Week Plan Error:', e)
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

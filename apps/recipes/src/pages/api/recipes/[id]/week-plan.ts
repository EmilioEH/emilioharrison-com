import type { APIRoute } from 'astro'
import { getAuthUser, unauthorizedResponse, getCloudflareEnv } from '../../../../lib/api-helpers'
import { db } from '../../../../lib/firebase-server'
import type { WeekPlanData, FamilyRecipeData } from '../../../../lib/types'
import { sendFamilyPush } from '../../../../lib/push-notifications'

/**
 * POST /api/recipes/[id]/week-plan
 * Add a recipe to the week plan or update its planning status (family-scoped)
 */
export const POST: APIRoute = async ({ params, request, cookies, locals }) => {
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
    console.log('[WeekPlan] POST started for recipe:', recipeId, 'user:', userId)

    const body = await request.json()
    const { isPlanned, assignedDate } = body
    console.log('[WeekPlan] Request body:', { isPlanned, assignedDate })

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
    console.log('[WeekPlan] Fetching user document...')
    const userDoc = await db.getDocument('users', userId)
    console.log(
      '[WeekPlan] User doc:',
      userDoc ? { familyId: userDoc.familyId, displayName: userDoc.displayName } : 'NOT FOUND',
    )

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
    console.log('[WeekPlan] Fetching family recipe data...')
    let familyData = await db.getDocument(`families/${userDoc.familyId}/recipeData`, recipeId)
    console.log('[WeekPlan] Family data exists:', !!familyData)

    const newWeekPlan: WeekPlanData = {
      isPlanned,
      assignedDate: assignedDate || undefined,
      addedBy: isPlanned ? userId : undefined,
      addedByName: isPlanned ? userDoc.displayName || 'User' : undefined,
      addedAt: isPlanned ? new Date().toISOString() : undefined,
    }

    if (!familyData) {
      // Create new family data document
      console.log('[WeekPlan] Creating new family data document...')
      const newFamilyData: FamilyRecipeData = {
        id: recipeId,
        notes: [],
        ratings: [],
        weekPlan: newWeekPlan,
        cookingHistory: [],
      }

      await db.createDocument(`families/${userDoc.familyId}/recipeData`, recipeId, newFamilyData)
      console.log('[WeekPlan] Created successfully')

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
    console.log('[WeekPlan] Updating existing family data...')
    await db.updateDocument(`families/${userDoc.familyId}/recipeData`, recipeId, {
      weekPlan: newWeekPlan,
    })
    console.log('[WeekPlan] Update successful')

    // 4. Update family's lastUpdated for sync optimization (the "flag")
    console.log('[WeekPlan] Updating family lastUpdated...')
    await db.updateDocument('families', userDoc.familyId, {
      lastUpdated: new Date().toISOString(),
    })
    console.log('[WeekPlan] Family updated')

    // Fetch updated data
    familyData = await db.getDocument(`families/${userDoc.familyId}/recipeData`, recipeId)

    // Notify Family (Fire and await to ensure delivery in serverless)
    try {
      const recipe = await db.getDocument('recipes', recipeId)
      // Safely access env with fallback
      let env
      try {
        env = getCloudflareEnv(locals)
      } catch {
        console.warn('Could not access Cloudflare Env for notifications')
      }

      if (env) {
        const recipeTitle = recipe?.title || 'a recipe'
        const dayName = new Date(assignedDate || Date.now()).toLocaleDateString('en-US', {
          weekday: 'long',
        })

        await sendFamilyPush(
          userDoc.familyId,
          userId,
          {
            title: 'Meal Plan Update',
            body: `${userDoc.displayName || 'Someone'} added ${recipeTitle} for ${dayName}.`,
            url: '/protected/recipes/week',
            type: 'mealPlan',
          },
          env,
        )
      }
    } catch (err) {
      console.error('Notification dispatch failed:', err)
      // Do not block response on notification failure
    }

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

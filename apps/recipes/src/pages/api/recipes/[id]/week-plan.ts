import type { APIRoute } from 'astro'
import type { APIContext } from 'astro'
import { getAuthUser, unauthorizedResponse } from '../../../../lib/api-helpers'
import { db } from '../../../../lib/firebase-server'
import type { WeekPlanData, FamilyRecipeData } from '../../../../lib/types'
import { setRequestContext } from '../../../../lib/request-context'

/**
 * Record that this recipe was on a given week's plan, permanently.
 *
 * `weekPlan.assignedDate` is a single mutable field per recipe, so it only ever remembers the
 * *latest* week a recipe was planned for. That is fine for showing this week's plan and wrong for
 * the review, which asks about a week that has already happened: re-plan a recipe this week and it
 * silently drops out of last week's review; take one off the plan and the same.
 *
 * `families/{id}/weekPlans/{weekStart}` is append-only and never rewritten by unplanning — what was
 * planned that week is a fact about the past. Weeks before this shipped have no document, and the
 * review falls back to deriving them the old way.
 */
async function recordWeekMembership(familyId: string, weekStart: string, recipeId: string) {
  try {
    const path = `families/${familyId}/weekPlans`
    const existing = (await db.getDocument(path, weekStart)) as { recipeIds?: string[] } | null
    const recipeIds = Array.isArray(existing?.recipeIds) ? existing.recipeIds : []
    if (recipeIds.includes(recipeId)) return
    await db.setDocument(path, weekStart, { recipeIds: [...recipeIds, recipeId] })
  } catch (error) {
    // The plan itself is what the cook asked for; losing the history record shouldn't fail it.
    console.error('[WeekPlan] could not record week membership:', error)
  }
}

/**
 * POST /api/recipes/[id]/week-plan
 * Add a recipe to the week plan or update its planning status (family-scoped)
 */
export const POST: APIRoute = async (context: APIContext) => {
  // Ensure request context is set for db access to Cloudflare env
  setRequestContext(context)

  const { params, request, cookies } = context
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
    const { isPlanned, assignedDate, servings } = body
    console.log('[WeekPlan] Request body:', { isPlanned, assignedDate, servings })

    // A serving count for this week only. Three cases, and they must stay distinct: a number sets
    // it, an explicit `null` clears it back to the recipe's own count, and the key being absent
    // means "not what this request is about" — the existing count is carried over below, so
    // re-planning a recipe doesn't silently reset a choice the cook made. Nonsense is rejected
    // rather than clamped, so a bad client can't quietly make a whole week's shopping wrong.
    let weekServings: number | undefined
    const clearServings = servings === null
    if (servings !== undefined && servings !== null) {
      if (
        typeof servings !== 'number' ||
        !Number.isFinite(servings) ||
        servings < 1 ||
        servings > 100
      ) {
        return new Response(
          JSON.stringify({ success: false, error: 'servings must be a number between 1 and 100' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        )
      }
      weekServings = Math.round(servings)
    }

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
      // Carried over when the caller doesn't mention it, so re-planning (or the optimistic
      // re-POST that follows an add) doesn't silently reset a count the cook chose.
      servings: clearServings
        ? undefined
        : (weekServings ?? (familyData?.weekPlan as WeekPlanData | undefined)?.servings),
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
      if (isPlanned && assignedDate) {
        await recordWeekMembership(userDoc.familyId, assignedDate, recipeId)
      }
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
    if (isPlanned && assignedDate) {
      await recordWeekMembership(userDoc.familyId, assignedDate, recipeId)
    }
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
export const DELETE: APIRoute = async (context: APIContext) => {
  // Ensure request context is set for db access to Cloudflare env
  setRequestContext(context)

  const { params, cookies } = context
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

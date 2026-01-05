import type { APIRoute } from 'astro'
import { getAuthUser, unauthorizedResponse } from '../../../../lib/api-helpers'
import { db } from '../../../../lib/firebase-server'
import type { RecipeNote, FamilyRecipeData } from '../../../../lib/types'

/**
 * POST /api/recipes/[id]/notes
 * Add a note to a recipe (family-scoped)
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
    const { text } = body

    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Note text is required',
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

    const newNote: RecipeNote = {
      userId,
      userName: userDoc.displayName || 'User',
      text,
      createdAt: new Date().toISOString(),
    }

    if (!familyData) {
      // Create new family data document
      const newFamilyData: FamilyRecipeData = {
        id: recipeId,
        notes: [newNote],
        ratings: [],
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

    // 3. Append note to existing data
    const updatedNotes = [...(familyData.notes || []), newNote]

    await db.updateDocument(`families/${userDoc.familyId}/recipeData`, recipeId, {
      notes: updatedNotes,
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
    console.error('POST Note Error:', e)
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

import type { APIRoute } from 'astro'
import { db } from '../../../lib/firebase-server'
import { getAuthUser, unauthorizedResponse } from '../../../lib/api-helpers'
import type { User } from '../../../lib/types'

/**
 * GET /api/admin/migrate-ownership
 * View stats about recipes needing migration
 */
export const GET: APIRoute = async ({ cookies }) => {
  const userId = getAuthUser(cookies)
  if (!userId) return unauthorizedResponse()

  try {
    // Check if admin (optional, but good practice)
    // For now, allow any authenticated user to check status
    const allRecipes = await db.getCollection('recipes')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const legacyCount = allRecipes.filter((r: any) => !r.createdBy).length

    return new Response(
      JSON.stringify({
        totalRecipes: allRecipes.length,
        legacyRecipes: legacyCount,
        message: 'Send POST to migrate. Body: { "defaultEmail": "emilioeh1991@gmail.com" }',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 })
  }
}

/**
 * POST /api/admin/migrate-ownership
 * Assign all legacy recipes to a target user (by email)
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const userId = getAuthUser(cookies)
  if (!userId) return unauthorizedResponse()

  try {
    const body = await request.json()
    const targetEmail = body.defaultEmail || 'emilioeh1991@gmail.com'

    // 1. Find Target User ID
    const users = await db.getCollection('users')
    const targetUser = (users as unknown as User[]).find(
      (u) => u.email.toLowerCase() === targetEmail.toLowerCase(),
    )

    if (!targetUser) {
      return new Response(JSON.stringify({ error: `User not found: ${targetEmail}` }), {
        status: 404,
      })
    }

    // 2. Fetch Recipes
    const allRecipes = await db.getCollection('recipes')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const legacyRecipes = allRecipes.filter((r: any) => !r.createdBy)

    if (legacyRecipes.length === 0) {
      return new Response(JSON.stringify({ message: 'No legacy recipes to migrate' }), {
        status: 200,
      })
    }

    // 3. Update Recipes
    let updatedCount = 0
    // Limit concurrency for safety
    const chunkSize = 10
    for (let i = 0; i < legacyRecipes.length; i += chunkSize) {
      const chunk = legacyRecipes.slice(i, i + chunkSize)
      await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        chunk.map((recipe: any) =>
          db.updateDocument('recipes', recipe.id, {
            createdBy: targetUser.id,
            // also assign familyId if they have one, to make it indexable immediate
            familyId: targetUser.familyId || null,
          }),
        ),
      )
      updatedCount += chunk.length
    }

    return new Response(
      JSON.stringify({
        success: true,
        migrated: updatedCount,
        assignedTo: {
          email: targetUser.email,
          id: targetUser.id,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (e) {
    console.error('Migration Error', e)
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 })
  }
}

import type { APIRoute } from 'astro'
import { db } from '../../../../lib/firebase-server'
import { serverErrorResponse } from '../../../../lib/api-helpers'
import type { RecipeVersion, Recipe } from '../../../../lib/types'

// POST /api/recipes/[id]/restore - Restore a specific version
export const POST: APIRoute = async ({ params, request }) => {
  const recipeId = params.id
  if (!recipeId) return serverErrorResponse('Recipe ID required')

  try {
    const body = await request.json()
    const { versionId } = body as { versionId: string }

    if (!versionId) return serverErrorResponse('Version ID required')

    // 1. Fetch the version to restore
    const versionToRestore = await db.getSubDocument<RecipeVersion>(
      'recipes',
      recipeId,
      'versions',
      versionId,
    )

    if (!versionToRestore) {
      return serverErrorResponse('Version not found')
    }

    // 2. Fetch current recipe state (for safety snapshot)
    const currentRecipe = await db.getDocument<Recipe>('recipes', recipeId)
    if (!currentRecipe) {
      return serverErrorResponse('Recipe not found')
    }

    // 3. Create safety snapshot of current state
    const safetyId = crypto.randomUUID()
    const safetyVersion: RecipeVersion = {
      id: safetyId,
      recipeId,
      timestamp: new Date().toISOString(),
      changeType: 'restore', // Marking that this was the state *before* a restore
      data: currentRecipe, // Snapshot everything
      createdBy: 'system',
    }
    await db.addSubDocument('recipes', recipeId, 'versions', safetyId, safetyVersion)

    // 4. Update the main recipe document
    // Merge restored data (title, ingredients, steps) but keep ID and metadata?
    // User expects a full restore of content.
    const restoredData = {
      ...currentRecipe,
      ...versionToRestore.data,
      updatedAt: new Date().toISOString(),
    }
    await db.updateDocument('recipes', recipeId, restoredData)

    return new Response(JSON.stringify({ success: true, restoredId: versionId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Restore version failed:', error)
    return serverErrorResponse('Failed to restore version')
  }
}

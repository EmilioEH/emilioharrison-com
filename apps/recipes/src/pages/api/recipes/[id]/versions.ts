import type { APIRoute } from 'astro'
import { db } from '../../../../lib/firebase-server'
import { serverErrorResponse } from '../../../../lib/api-helpers'
import type { RecipeVersion, Recipe } from '../../../../lib/types'

// GET /api/recipes/[id]/versions - List versions (metadata only)
export const GET: APIRoute = async ({ params }) => {
  const recipeId = params.id
  if (!recipeId) return serverErrorResponse('Recipe ID required')

  try {
    // Sub-collection fetch
    const versions = await db.getSubCollection<RecipeVersion>('recipes', recipeId, 'versions')

    // Sort desc by timestamp
    versions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Return only metadata (omit large 'data' blob for list view)
    const summary = versions.map((v) => ({
      id: v.id,
      timestamp: v.timestamp,
      changeType: v.changeType,
      createdBy: v.createdBy,
    }))

    return new Response(JSON.stringify({ success: true, versions: summary }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('List versions failed:', error)
    return serverErrorResponse('Failed to list versions')
  }
}

// POST /api/recipes/[id]/versions - Create a snapshot
export const POST: APIRoute = async ({ params, request }) => {
  const recipeId = params.id
  if (!recipeId) return serverErrorResponse('Recipe ID required')

  try {
    const body = await request.json()
    const { changeType, data } = body as {
      changeType: RecipeVersion['changeType']
      data: Partial<Recipe>
    }

    if (!changeType || !data) {
      return serverErrorResponse('Missing changeType or data')
    }

    const versionId = crypto.randomUUID()
    const version: RecipeVersion = {
      id: versionId,
      recipeId,
      timestamp: new Date().toISOString(),
      changeType,
      data,
      createdBy: 'system', // TODO: Grab from auth context if available
    }

    await db.addSubDocument('recipes', recipeId, 'versions', versionId, version)

    return new Response(JSON.stringify({ success: true, versionId }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Create version failed:', error)
    return serverErrorResponse('Failed to create version')
  }
}

import type { APIRoute, APIContext } from 'astro'
import { db } from '../../../../lib/firebase-server'
import { serverErrorResponse } from '../../../../lib/api-helpers'
import { loadAccessibleRecipe } from '../../../../lib/recipe-access'
import { setRequestContext } from '../../../../lib/request-context'

/**
 * Restores a recipe to the snapshot captured just before its last AI Refresh/Enhancement (see
 * `snapshotRecipe` in recipe-merge.ts) — the one-tap undo for a reparse that overwrote manual
 * edits or otherwise went wrong. Clears `previousVersion` afterward: once restored, there is no
 * snapshot left to undo the undo with.
 */
export const POST: APIRoute = async (context: APIContext) => {
  setRequestContext(context)
  const { params, cookies } = context

  const access = await loadAccessibleRecipe(cookies, params.id)
  if (!access.ok) return access.response
  const { recipe } = access

  if (!recipe.previousVersion) {
    return new Response(JSON.stringify({ error: 'No previous version to restore.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const restoredRecipe = {
      ...recipe,
      ...recipe.previousVersion.data,
      updatedAt: new Date().toISOString(),
      previousVersion: null,
    }

    await db.updateDocument('recipes', recipe.id, restoredRecipe)

    return new Response(JSON.stringify({ success: true, recipe: restoredRecipe }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[Restore] Error occurred:', error)
    return serverErrorResponse((error as Error).message)
  }
}

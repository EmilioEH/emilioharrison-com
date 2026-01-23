import type { APIRoute } from 'astro'
import { db } from '../../../../lib/firebase-server'
import { serverErrorResponse } from '../../../../lib/api-helpers'
import type { Recipe, RecipeVersion, Ingredient } from '../../../../lib/types'
import { executeAiParse } from '../../../../lib/services/ai-parser'

export const POST: APIRoute = async ({ params, locals }) => {
  const { id } = params
  if (!id) return serverErrorResponse('Recipe ID required')

  const recipe = (await db.getDocument('recipes', id)) as Recipe | null

  if (!recipe) {
    return new Response(JSON.stringify({ error: 'Recipe not found' }), { status: 404 })
  }

  // Helper to construct text-based payload from existing recipe data
  const buildTextPayload = () => {
    return `
Title: ${recipe.title}
Description: ${recipe.description || ''}

Ingredients:
${recipe.ingredients.map((i: Ingredient) => `${i.amount} ${i.name}`).join('\n')}

Instructions:
${recipe.steps.join('\n')}
    `.trim()
  }

  // SNAPSHOT: Save current version before overwriting
  const versionId = crypto.randomUUID()
  const version: RecipeVersion = {
    id: versionId,
    recipeId: id,
    timestamp: new Date().toISOString(),
    changeType: 'ai-refresh',
    createdBy: 'system',
    data: recipe,
  }
  await db.addSubDocument('recipes', id, 'versions', versionId, version)

  try {
    let newData
    const commonParams = { mode: 'parse' as const, style: 'enhanced' as const }

    if (recipe.sourceUrl) {
      console.log('[Refresh] Using sourceUrl:', recipe.sourceUrl)
      newData = await executeAiParse(locals, { ...commonParams, url: recipe.sourceUrl })
    } else if (recipe.sourceImage) {
      console.log('[Refresh] Using sourceImage')
      newData = await executeAiParse(locals, { ...commonParams, image: recipe.sourceImage })
    } else {
      console.log('[Refresh] Falling back to text representation')
      newData = await executeAiParse(locals, { ...commonParams, text: buildTextPayload() })
    }

    // Cost estimation (Optional fallback or moved to service later)
    const estimatedCost = recipe.estimatedCost

    // MERGE strategy
    const updatedRecipe = {
      ...recipe,
      ...newData,
      updatedAt: new Date().toISOString(),
      sourceUrl: recipe.sourceUrl || newData.sourceUrl,
      sourceImage: recipe.sourceImage || newData.sourceImage,
      images: recipe.images || newData.images,
      estimatedCost,
    }

    await db.updateDocument('recipes', id, updatedRecipe)

    return new Response(JSON.stringify({ success: true, recipe: updatedRecipe }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[Refresh] Error occurred:', error)
    // Fallback to text-based if source failed
    if (recipe.sourceUrl || recipe.sourceImage) {
      console.warn('[Refresh] Source refresh failed, trying text fallback...')
      try {
        const newData = await executeAiParse(locals, {
          mode: 'parse',
          style: 'enhanced',
          text: buildTextPayload(),
        })
        const updatedRecipe = {
          ...recipe,
          ...newData,
          updatedAt: new Date().toISOString(),
        }
        await db.updateDocument('recipes', id, updatedRecipe)
        return new Response(JSON.stringify({ success: true, recipe: updatedRecipe }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      } catch (fallbackError) {
        console.error('[Refresh] Fallback also failed:', fallbackError)
      }
    }
    const errorMessage = error instanceof Error ? error.message : 'Refresh failed'
    return serverErrorResponse(errorMessage)
  }
}

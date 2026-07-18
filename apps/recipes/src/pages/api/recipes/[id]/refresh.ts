import type { APIRoute, APIContext } from 'astro'
import { db } from '../../../../lib/firebase-server'
import { serverErrorResponse } from '../../../../lib/api-helpers'
import { loadAccessibleRecipe } from '../../../../lib/recipe-access'
import { setRequestContext } from '../../../../lib/request-context'
import type { Ingredient } from '../../../../lib/types'
import { executeAiParse } from '../../../../lib/services/ai-parser'

/** Normalize any thrown value to an Error so message extraction is reliable */
const toError = (e: unknown): Error => {
  if (e instanceof Error) return e
  return new Error(typeof e === 'string' ? e : JSON.stringify(e) || 'Unknown error')
}

export const POST: APIRoute = async (context: APIContext) => {
  setRequestContext(context)
  const { params, cookies, locals } = context

  // Refresh overwrites the recipe document — require access to this specific recipe,
  // not merely a valid session.
  const access = await loadAccessibleRecipe(cookies, params.id)
  if (!access.ok) return access.response
  const { recipe } = access
  const id = recipe.id

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

  try {
    let newData
    const commonParams = { style: 'enhanced' as const }

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

    // MERGE strategy
    const updatedRecipe = {
      ...recipe,
      ...newData,
      updatedAt: new Date().toISOString(),
      sourceUrl: recipe.sourceUrl || newData.sourceUrl,
      sourceImage: recipe.sourceImage || newData.sourceImage,
      images: recipe.images || newData.images,
    }

    await db.updateDocument('recipes', id, updatedRecipe)

    return new Response(JSON.stringify({ success: true, recipe: updatedRecipe }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const err = toError(error)
    console.error('[Refresh] Error occurred:', err.message)
    // Fallback to text-based if source failed
    if (recipe.sourceUrl || recipe.sourceImage) {
      console.warn('[Refresh] Source refresh failed, trying text fallback...')
      try {
        const newData = await executeAiParse(locals, {
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
        console.error('[Refresh] Fallback also failed:', toError(fallbackError).message)
      }
    }
    return serverErrorResponse(err.message)
  }
}

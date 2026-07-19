import type { APIRoute, APIContext } from 'astro'
import { db } from '../../../../lib/firebase-server'
import { serverErrorResponse } from '../../../../lib/api-helpers'
import { loadAccessibleRecipe } from '../../../../lib/recipe-access'
import { setRequestContext } from '../../../../lib/request-context'
import type { Ingredient } from '../../../../lib/types'
import { executeAiParse } from '../../../../lib/services/ai-parser'
import {
  mergeAiRecipeUpdate,
  snapshotRecipe,
  UnusableAiResultError,
} from '../../../../lib/services/recipe-merge'
import { rateLimit } from '../../../../lib/rate-limit'
import { logAiError } from '../../../../lib/services/ai-error-log'

/** AI Refresh is a user-triggered, relatively expensive reparse — cap abuse/cost. */
const REFRESH_RATE_LIMIT = 10
const REFRESH_RATE_WINDOW_SECONDS = 60 * 60

/** Normalize any thrown value to an Error so message extraction is reliable */
const toError = (e: unknown): Error => {
  if (e instanceof Error) return e
  return new Error(typeof e === 'string' ? e : JSON.stringify(e) || 'Unknown error')
}

export const POST: APIRoute = async (context: APIContext) => {
  setRequestContext(context)
  const { params, cookies, locals, request } = context

  // Refresh overwrites the recipe document — require access to this specific recipe,
  // not merely a valid session.
  const access = await loadAccessibleRecipe(cookies, params.id)
  if (!access.ok) return access.response
  const { recipe, userId } = access
  const id = recipe.id
  const origin = new URL(request.url).origin

  const kv = locals?.runtime?.env?.SESSION
  const { limited } = await rateLimit(
    kv,
    `refresh:${userId}`,
    REFRESH_RATE_LIMIT,
    REFRESH_RATE_WINDOW_SECONDS,
  )
  if (limited) {
    return new Response(
      JSON.stringify({ error: 'Too many refresh requests. Please try again later.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    )
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

  const runFromSource = async () => {
    const commonParams = { style: 'enhanced' as const }
    if (recipe.sourceUrl) {
      console.log('[Refresh] Using sourceUrl:', recipe.sourceUrl)
      return await executeAiParse(
        locals,
        { ...commonParams, url: recipe.sourceUrl },
        origin,
        request.signal,
      )
    }
    if (recipe.sourceImage) {
      console.log('[Refresh] Using sourceImage')
      return await executeAiParse(
        locals,
        { ...commonParams, image: recipe.sourceImage },
        origin,
        request.signal,
      )
    }
    console.log('[Refresh] No source available, using saved text')
    return await executeAiParse(
      locals,
      { ...commonParams, text: buildTextPayload() },
      origin,
      request.signal,
    )
  }

  let usedTextFallback = false

  try {
    let newData
    try {
      newData = await runFromSource()
    } catch (sourceError) {
      // Only a real source (URL/photo) re-read failing triggers this fallback — and unlike
      // before, we report it to the caller instead of silently swapping what the AI saw for
      // something it never had a chance to actually re-verify against.
      if (recipe.sourceUrl || recipe.sourceImage) {
        console.warn(
          '[Refresh] Source re-read failed, falling back to saved text:',
          toError(sourceError).message,
        )
        usedTextFallback = true
        newData = await executeAiParse(
          locals,
          { style: 'enhanced', text: buildTextPayload() },
          origin,
          request.signal,
        )
      } else {
        throw sourceError
      }
    }

    const previousVersion = snapshotRecipe(recipe, 'refresh')
    const updatedRecipe = { ...mergeAiRecipeUpdate(recipe, newData), previousVersion }

    await db.updateDocument('recipes', id, updatedRecipe)

    return new Response(
      JSON.stringify({ success: true, recipe: updatedRecipe, usedTextFallback }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    logAiError('refresh', error, {
      userId,
      context: { recipeId: id, usedTextFallback: String(usedTextFallback) },
    })
    if (error instanceof UnusableAiResultError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    const err = toError(error)
    console.error('[Refresh] Error occurred:', err.message)
    return serverErrorResponse(err.message)
  }
}

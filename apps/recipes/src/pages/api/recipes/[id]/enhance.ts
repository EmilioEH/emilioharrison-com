import type { APIRoute, APIContext } from 'astro'
import { loadAccessibleRecipe } from '../../../../lib/recipe-access'
import { setRequestContext } from '../../../../lib/request-context'
import { runEnhancementJob } from '../../../../lib/services/recipe-enhancement-job'
import { rateLimit } from '../../../../lib/rate-limit'

const ENHANCE_RATE_LIMIT = 20
const ENHANCE_RATE_WINDOW_SECONDS = 60 * 60

export const POST: APIRoute = async (context: APIContext) => {
  setRequestContext(context)
  const { params, cookies, locals, request } = context

  // Enhance does a full reparse and overwrites the recipe — require access to this specific
  // recipe. (This endpoint previously performed no authorization at all.)
  const access = await loadAccessibleRecipe(cookies, params.id)
  if (!access.ok) return access.response
  const { recipe, userId } = access
  const origin = new URL(request.url).origin

  const kv = locals?.runtime?.env?.SESSION
  const { limited } = await rateLimit(
    kv,
    `enhance:${userId}`,
    ENHANCE_RATE_LIMIT,
    ENHANCE_RATE_WINDOW_SECONDS,
  )
  if (limited) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const result = await runEnhancementJob(locals, recipe, origin, request.signal)

  if (!result.success) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: result.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true, recipe: result.recipe }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

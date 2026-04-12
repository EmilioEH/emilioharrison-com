import type { APIRoute } from 'astro'
import { fetchHebProductGraphQL } from '../../../lib/heb-url'
import { getGroceryScopeId, unauthorizedResponse } from '../../../lib/api-helpers'
import { setRequestContext } from '../../../lib/request-context'

/**
 * GET /api/grocery/heb-refresh?productId=xxx&storeId=yyy
 *
 * Fetches fresh product data (price, size, location, image) from HEB's GraphQL API
 * for a single known product ID. Used by the background refresh hook to keep
 * grocery list prices up to date without user interaction.
 *
 * Auth-gated — requires valid session cookie.
 * No Firestore writes — caller is responsible for persisting the result.
 */
export const GET: APIRoute = async (context) => {
  setRequestContext(context)

  const scope = await getGroceryScopeId(context.cookies)
  if (!scope) return unauthorizedResponse()

  const productId = context.url.searchParams.get('productId')
  const storeId = context.url.searchParams.get('storeId') ?? undefined

  if (!productId) {
    return new Response(JSON.stringify({ error: 'Missing productId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const product = await fetchHebProductGraphQL(productId, storeId)

    if (!product) {
      return new Response(JSON.stringify({ error: 'heb_error' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ product }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[heb-refresh] Fetch failed:', err)
    return new Response(JSON.stringify({ error: 'heb_error' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

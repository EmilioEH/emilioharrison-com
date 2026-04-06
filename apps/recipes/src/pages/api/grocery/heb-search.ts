import type { APIRoute } from 'astro'
import { searchHebProducts, hebProductToIngredientFields } from '../../../lib/heb-url'

/**
 * GET /api/grocery/heb-search?q=chicken+breast
 *
 * Searches HEB products via their GraphQL API.
 * Returns product data with pricing, images, and store location.
 */
export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get('q')
  const storeId = url.searchParams.get('storeId') || undefined

  if (!query || query.trim().length < 2) {
    return new Response(JSON.stringify({ results: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    console.log(`[heb-search] Searching q="${query}" storeId=${storeId ?? 'default'}`)
    const products = await searchHebProducts(query, storeId)
    console.log(`[heb-search] Got ${products.length} results for q="${query}"`)

    const results = products.map((product) => ({
      product,
      ingredientFields: hebProductToIngredientFields(product),
    }))

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[heb-search] Endpoint error:', err)
    return new Response(JSON.stringify({ results: [], error: 'Search failed' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

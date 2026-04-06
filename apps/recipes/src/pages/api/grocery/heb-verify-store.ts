import type { APIRoute } from 'astro'
import { searchHebProducts } from '../../../lib/heb-url'

/**
 * GET /api/grocery/heb-verify-store?storeId=811
 *
 * Verifies an H-E-B store ID by running a test product search.
 * If the store ID is valid, the search returns results with store-specific locations.
 */
export const GET: APIRoute = async ({ url }) => {
  const storeId = url.searchParams.get('storeId')

  if (!storeId || !/^\d+$/.test(storeId)) {
    return new Response(JSON.stringify({ valid: false, error: 'Invalid store ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const products = await searchHebProducts('milk', storeId)
    const valid = products.length > 0
    const sampleLocation = products[0]?.storeLocation || null

    return new Response(JSON.stringify({ valid, sampleLocation }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ valid: false, error: 'Verification failed' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

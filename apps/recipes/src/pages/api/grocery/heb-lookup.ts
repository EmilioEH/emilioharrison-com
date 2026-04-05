import type { APIRoute } from 'astro'
import {
  parseHebUrl,
  fetchHebProductGraphQL,
  hebProductToIngredientFields,
} from '../../../lib/heb-url'
import { searchProducts } from '../../../lib/heb-products'
import type { HebProduct } from '../../../lib/types'

/**
 * POST /api/grocery/heb-lookup
 *
 * Accepts an HEB product URL and returns enriched product data.
 *
 * Strategy:
 * 1. Parse URL for product ID
 * 2. Query HEB's GraphQL API for full product data (price, size, location, images)
 * 3. If GraphQL fails, fall back to URL-derived name + static DB enrichment + CDN image
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const { url } = (await request.json()) as { url: string }

    if (!url) {
      return new Response(JSON.stringify({ error: 'Missing url' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const parsed = parseHebUrl(url)
    if (!parsed) {
      return new Response(JSON.stringify({ error: 'Not a valid H-E-B product URL' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Primary: query HEB GraphQL API
    const product = await fetchHebProductGraphQL(parsed.productId)

    if (product) {
      return new Response(
        JSON.stringify({
          source: 'graphql',
          product,
          ingredientFields: hebProductToIngredientFields(product),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // Fallback: enrich from URL parsing + static DB
    const staticResults = searchProducts(parsed.productName, 1)
    const staticMatch =
      staticResults.length > 0 && staticResults[0].score >= 10 ? staticResults[0].product : null

    const fallbackProduct: HebProduct = {
      productId: parsed.productId,
      name: parsed.productName,
      brand: staticMatch?.brand || '',
      price: staticMatch?.hebPrice || 0,
      priceUnit: staticMatch?.hebPriceUnit || 'each',
      size: '',
      category: staticMatch?.category || 'Pantry & Condiments',
      imageUrl: parsed.imageUrl,
      imageUrls: [parsed.imageUrl],
      inStock: true,
      productUrl: parsed.originalUrl,
    }

    return new Response(
      JSON.stringify({
        source: 'fallback',
        product: fallbackProduct,
        ingredientFields: hebProductToIngredientFields(fallbackProduct),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('HEB lookup error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to look up product',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}

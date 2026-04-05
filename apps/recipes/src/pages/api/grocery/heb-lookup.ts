import type { APIRoute } from 'astro'
import {
  parseHebUrl,
  parseHebProductData,
  extractNextData,
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
 * 1. Parse URL for product ID and slug
 * 2. Attempt to fetch the page and extract __NEXT_DATA__ (may be blocked by WAF)
 * 3. If fetch fails, fall back to URL-derived name + static DB enrichment + CDN image
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
      return new Response(
        JSON.stringify({ error: 'Not a valid H-E-B product URL' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // Try to fetch the page for __NEXT_DATA__
    let product: HebProduct | null = null

    try {
      const response = await fetch(parsed.originalUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(10000),
      })

      if (response.ok) {
        const html = await response.text()
        const nextData = extractNextData(html)
        if (nextData) {
          product = parseHebProductData(nextData)
        }
      }
    } catch (fetchError) {
      // Expected: WAF may block us. Fall through to static enrichment.
      console.log('[heb-lookup] Fetch blocked, falling back to static enrichment:', fetchError instanceof Error ? fetchError.message : 'unknown')
    }

    // If we got product data from the page, return it
    if (product) {
      return new Response(
        JSON.stringify({
          source: 'live',
          product,
          ingredientFields: hebProductToIngredientFields(product),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // Fallback: enrich from URL parsing + static DB
    const staticResults = searchProducts(parsed.productName, 1)
    const staticMatch = staticResults.length > 0 && staticResults[0].score >= 10
      ? staticResults[0].product
      : null

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

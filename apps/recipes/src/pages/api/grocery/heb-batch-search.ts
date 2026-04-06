import type { APIRoute } from 'astro'
import { searchHebProducts, hebProductToIngredientFields } from '../../../lib/heb-url'
import { searchProducts } from '../../../lib/heb-products'
import type { HebProduct } from '../../../lib/types'

const MAX_CONCURRENCY = 5
const DELAY_MS = 200
const MAX_RESULTS_PER_ITEM = 8

interface BatchSearchRequest {
  ingredients: string[]
}

interface BatchSearchResult {
  ingredientName: string
  results: HebProduct[]
  source: 'live' | 'static'
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Search for a single ingredient, falling back to static DB on failure.
 */
async function searchSingleIngredient(name: string): Promise<BatchSearchResult> {
  try {
    const products = await searchHebProducts(name)
    if (products.length > 0) {
      return {
        ingredientName: name,
        results: products.slice(0, MAX_RESULTS_PER_ITEM),
        source: 'live',
      }
    }
  } catch {
    // Fall through to static DB
  }

  // Fallback: static product DB
  const localResults = searchProducts(name)
  const staticProducts: HebProduct[] = localResults.map((item) => ({
    productId: `static-${item.product.name.toLowerCase().replace(/\s+/g, '-')}`,
    name: item.product.name,
    brand: item.product.brand || '',
    price: item.product.hebPrice || 0,
    priceUnit: 'each',
    size: '',
    category: item.product.category || 'Pantry & Condiments',
    imageUrl: '',
    imageUrls: [],
    inStock: true,
    productUrl: '',
  }))

  return {
    ingredientName: name,
    results: staticProducts.slice(0, MAX_RESULTS_PER_ITEM),
    source: 'static',
  }
}

/**
 * POST /api/grocery/heb-batch-search
 *
 * Searches HEB for multiple ingredients in parallel (with concurrency limit).
 * Returns a map of ingredient name → HEB product results.
 */
export const POST: APIRoute = async ({ request }) => {
  const body = (await request.json()) as BatchSearchRequest

  if (!body.ingredients || !Array.isArray(body.ingredients) || body.ingredients.length === 0) {
    return new Response(JSON.stringify({ error: 'Missing ingredients array' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Deduplicate and sanitize
  const uniqueNames = [...new Set(body.ingredients.map((n) => n.trim()).filter(Boolean))]

  const results: BatchSearchResult[] = []

  // Process in batches with concurrency limit and delay
  for (let i = 0; i < uniqueNames.length; i += MAX_CONCURRENCY) {
    const batch = uniqueNames.slice(i, i + MAX_CONCURRENCY)
    const batchResults = await Promise.all(batch.map(searchSingleIngredient))
    results.push(...batchResults)

    // Add delay between batches to avoid rate limiting
    if (i + MAX_CONCURRENCY < uniqueNames.length) {
      await delay(DELAY_MS)
    }
  }

  // Build response map
  const resultMap: Record<string, { results: HebProduct[]; source: string }> = {}
  for (const result of results) {
    resultMap[result.ingredientName] = {
      results: result.results,
      source: result.source,
    }
  }

  return new Response(
    JSON.stringify({
      matches: resultMap,
      ingredientFields: Object.fromEntries(
        results
          .filter((r) => r.results.length > 0)
          .map((r) => [r.ingredientName, hebProductToIngredientFields(r.results[0])]),
      ),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  )
}

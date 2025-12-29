import type { APIRoute } from 'astro'
import { load } from 'cheerio'

export const POST: APIRoute = async ({ request }) => {
  try {
    const { ingredients } = await request.json()

    if (!ingredients || !Array.isArray(ingredients)) {
      return new Response(JSON.stringify({ error: 'Invalid input' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Limit concurrency to avoid blocking
    const CONCURRENCY_LIMIT = 3
    const results = []

    // Process in chunks
    for (let i = 0; i < ingredients.length; i += CONCURRENCY_LIMIT) {
      const chunk = ingredients.slice(i, i + CONCURRENCY_LIMIT)
      const chunkResults = await Promise.all(
        chunk.map((ing: { name: string; amount: number; unit: string }) => fetchHebPrice(ing.name)),
      )
      results.push(...chunkResults)
      // Small delay between chunks to be nice
      if (i + CONCURRENCY_LIMIT < ingredients.length) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }

    const items = results.filter((r) => r !== null)
    const totalCost = items.reduce((sum, item) => sum + item.price, 0)

    return new Response(JSON.stringify({ totalCost, items }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Estimate Cost Error:', error)
    return new Response(JSON.stringify({ error: 'Failed to estimate cost' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function fetchHebPrice(query: string) {
  try {
    // Clean query: remove special chars, maybe limit length
    const cleanQuery = query.replace(/[^\w\s]/gi, '').trim()
    const url = `https://www.heb.com/search/?q=${encodeURIComponent(cleanQuery)}`

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      },
    })

    if (!res.ok) return null

    const html = await res.text()
    const $ = load(html)

    // Method: Extract __NEXT_DATA__
    const scriptContent = $('#__NEXT_DATA__').html()
    if (!scriptContent) return null

    const json = JSON.parse(scriptContent)

    // Navigate deep structure: pageProps -> layout -> visualComponents -> items
    // Since structure can vary, we try to safely access it.
    // Based on research: pageProps.layout.visualComponents[0].items
    // But sometimes it might be different. Let's try to find the "Results" component.

    // HEB Next Data Structure is complex.
    // Let's try a safer path or search for items.

    const layout = json.props?.pageProps?.layout
    if (!layout) return null

    const product = findProductInLayout(layout)
    if (!product) return null

    const price = extractPriceFromProduct(product)
    if (!price) return null

    return {
      name: product.name || query,
      price: price,
      image: product.image || product.images?.[0]?.url || '',
      url: `https://www.heb.com/product-detail/${product.id || ''}`,
      searchedTerm: query,
    }
  } catch (e) {
    console.warn(`Failed to fetch price for ${query}`, e)
    return null
  }
}

// Helper to find product in the complex Next.js layout structure
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findProductInLayout(layout: any): any | null {
  if (!layout.visualComponents) return null

  for (const comp of layout.visualComponents) {
    if (comp.items && Array.isArray(comp.items) && comp.items.length > 0) {
      // Check if it's a product result (has 'productId' or 'name')
      if (comp.items[0].productId || comp.items[0].name) {
        return comp.items[0]
      }
    }
  }
  return null
}

// Helper to safely extract price from product object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPriceFromProduct(product: any): number | null {
  // Attempt 1: price attribute
  if (product.price) {
    const p = typeof product.price === 'number' ? product.price : parseFloat(product.price)
    if (!isNaN(p) && p > 0) return p
  }

  // Attempt 2: listingPrice
  if (product.listingPrice) {
    const p =
      typeof product.listingPrice === 'number'
        ? product.listingPrice
        : parseFloat(product.listingPrice)
    if (!isNaN(p) && p > 0) return p
  }

  // Attempt 3: Deep dive into SKUs logic
  if (product.SKUs && product.SKUs[0]) {
    const sku = product.SKUs[0]
    if (sku.contextPrices && sku.contextPrices.length > 0) {
      const p = sku.contextPrices[0].amount
      if (typeof p === 'number' && p > 0) return p
    }
  }

  return null
}

/**
 * Utilities for parsing H-E-B product URLs and extracting product data
 * from the __NEXT_DATA__ JSON embedded in HEB's Next.js pages.
 */

import type { HebProduct } from './types'

/** Result of parsing an HEB product URL */
export interface ParsedHebUrl {
  productId: string
  slug: string
  productName: string
  imageUrl: string
  originalUrl: string
}

const HEB_URL_PATTERN =
  /^https?:\/\/(?:www\.)?heb\.com\/product-detail\/([a-z0-9-]+)\/(\d+)\/?(?:\?.*)?$/i

/**
 * Parse an HEB product URL to extract product ID, slug, and derived image URL.
 * Returns null if the URL doesn't match the expected pattern.
 */
export function parseHebUrl(url: string): ParsedHebUrl | null {
  const trimmed = url.trim()
  const match = trimmed.match(HEB_URL_PATTERN)
  if (!match) return null

  const [, slug, productId] = match
  const productName = slug
    .split('-')
    .map((word) => {
      // Keep brand abbreviations uppercase
      if (['h', 'e', 'b'].includes(word)) return word.toUpperCase()
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
    // Fix "H E B" → "H-E-B"
    .replace(/\bH E B\b/g, 'H-E-B')

  const paddedId = productId.padStart(9, '0')
  const imageUrl = `https://images.heb.com/is/image/HEBGrocery/${paddedId}`

  return {
    productId,
    slug,
    productName,
    imageUrl,
    originalUrl: trimmed,
  }
}

/**
 * Check if a string looks like an HEB product URL.
 */
export function isHebUrl(text: string): boolean {
  return HEB_URL_PATTERN.test(text.trim())
}

/**
 * Map HEB breadcrumb categories to our grocery list categories.
 */
function mapHebCategory(breadcrumbs: Array<{ title: string }>): string {
  if (!breadcrumbs || breadcrumbs.length < 3) return 'Pantry & Condiments'

  // Use the 3rd breadcrumb (first meaningful department)
  const dept = breadcrumbs[2]?.title?.toLowerCase() || ''

  const categoryMap: Record<string, string> = {
    'dairy & eggs': 'Dairy & Eggs',
    'dairy': 'Dairy & Eggs',
    'eggs & egg substitutes': 'Dairy & Eggs',
    'frozen': 'Frozen Foods',
    'frozen foods': 'Frozen Foods',
    'produce': 'Produce',
    'fruits & vegetables': 'Produce',
    'fruit & vegetables': 'Produce',
    'meat & seafood': 'Meat',
    'meat': 'Meat',
    'seafood': 'Seafood',
    'deli': 'Deli & Prepared',
    'bakery': 'Bakery & Bread',
    'bread': 'Bakery & Bread',
    'beer, wine & spirits': 'Beer & Wine',
    'pantry': 'Pantry & Condiments',
    'canned goods': 'Canned & Dry Goods',
    'baking': 'Baking & Spices',
    'breakfast': 'Breakfast & Cereal',
    'snacks': 'Snacks',
    'beverages': 'Beverages',
    'household': 'Paper & Household',
    'pet': 'Pet',
    'baby': 'Baby',
    'personal care': 'Personal Care',
    'health': 'Health & Pharmacy',
  }

  for (const [key, value] of Object.entries(categoryMap)) {
    if (dept.includes(key)) return value
  }

  return 'Pantry & Condiments'
}

/**
 * Extract and normalize product data from HEB's __NEXT_DATA__ JSON.
 * This is the server-rendered JSON that Next.js embeds in every page.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseHebProductData(nextData: any): HebProduct | null {
  try {
    const product = nextData?.props?.pageProps?.product
    if (!product) return null

    const sku = product.SKUs?.[0]
    const contextPrice = sku?.contextPrices?.[0] // ONLINE price context

    return {
      productId: product.id,
      name: product.fullDisplayName,
      brand: product.brand?.name || '',
      price: contextPrice?.listPrice?.amount ?? 0,
      salePrice: contextPrice?.salePrice?.amount,
      priceUnit: contextPrice?.listPrice?.unit || 'each',
      unitPrice: contextPrice?.unitListPrice?.amount,
      unitPriceUnit: contextPrice?.unitListPrice?.unit,
      size: sku?.customerFriendlySize || '',
      category: mapHebCategory(product.breadcrumbs),
      imageUrl: product.carouselImageUrls?.[0] || '',
      imageUrls: product.carouselImageUrls || [],
      storeLocation: product.productLocation?.location,
      inStock: product.inventory?.inventoryState === 'IN_STOCK',
      productUrl: product.productPageURL || '',
      upc: sku?.twelveDigitUPC,
    }
  } catch {
    return null
  }
}

/**
 * Extract __NEXT_DATA__ JSON from raw HTML string.
 */
export function extractNextData(html: string): unknown | null {
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s,
  )
  if (!match?.[1]) return null

  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

/**
 * Convert an HebProduct to ShoppableIngredient fields for merging into grocery list.
 */
export function hebProductToIngredientFields(product: HebProduct) {
  return {
    hebProductId: product.productId,
    hebProductUrl: product.productUrl,
    imageUrl: product.imageUrl,
    hebPrice: product.salePrice ?? product.price,
    hebPriceUnit: product.priceUnit,
    hebSize: product.size,
    category: product.category,
    storeLocation: product.storeLocation,
  }
}

/**
 * Utilities for parsing H-E-B product URLs and extracting product data
 * from HEB's GraphQL API or the __NEXT_DATA__ JSON embedded in their pages.
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
    .map((word, idx) => {
      // Keep brand abbreviations uppercase
      if (['h', 'e', 'b'].includes(word)) return word.toUpperCase()
      // Capitalize first word only (sentence case)
      if (idx === 0) return word.charAt(0).toUpperCase() + word.slice(1)
      return word
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
    dairy: 'Dairy & Eggs',
    'eggs & egg substitutes': 'Dairy & Eggs',
    frozen: 'Frozen Foods',
    'frozen foods': 'Frozen Foods',
    produce: 'Produce',
    'fruits & vegetables': 'Produce',
    'fruit & vegetables': 'Produce',
    'meat & seafood': 'Meat',
    meat: 'Meat',
    seafood: 'Seafood',
    deli: 'Deli & Prepared',
    bakery: 'Bakery & Bread',
    bread: 'Bakery & Bread',
    'beer, wine & spirits': 'Beer & Wine',
    pantry: 'Pantry & Condiments',
    'canned goods': 'Canned & Dry Goods',
    baking: 'Baking & Spices',
    breakfast: 'Breakfast & Cereal',
    snacks: 'Snacks',
    beverages: 'Beverages',
    household: 'Paper & Household',
    pet: 'Pet',
    baby: 'Baby',
    'personal care': 'Personal Care',
    health: 'Health & Pharmacy',
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

    const size = sku?.customerFriendlySize || ''
    const displayName = size ? `${product.fullDisplayName}, ${size}` : product.fullDisplayName

    return {
      productId: product.id,
      name: displayName,
      brand: product.brand?.name || '',
      price: contextPrice?.listPrice?.amount ?? 0,
      salePrice: contextPrice?.salePrice?.amount,
      priceUnit: contextPrice?.listPrice?.unit || 'each',
      unitPrice: contextPrice?.unitListPrice?.amount,
      unitPriceUnit: contextPrice?.unitListPrice?.unit,
      size: size,
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
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s)
  if (!match?.[1]) return null

  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

/** Default store ID for HEB Manor (used for pricing context) */
const DEFAULT_STORE_ID = '92'

/** Common headers for HEB GraphQL requests */
const HEB_GRAPHQL_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
  Origin: 'https://www.heb.com',
}

/** GraphQL query for product detail */
const PRODUCT_DETAIL_QUERY = `query ProductDetail($id: ID!, $storeId: ID!) {
  productDetail(id: $id, storeId: $storeId, shoppingContext: CURBSIDE_PICKUP) {
    ... on Product {
      id
      fullDisplayName
      brand { name }
      SKUs {
        customerFriendlySize
        twelveDigitUPC
        contextPrices {
          context
          listPrice { amount unit formattedAmount }
          salePrice { amount unit formattedAmount }
          unitListPrice { amount unit formattedAmount }
          unitSalePrice { amount unit formattedAmount }
        }
      }
      productLocation { location }
      breadcrumbs { title }
      carouselImageUrls
      productPageURL
      inventory { inventoryState }
    }
  }
}`

/**
 * Fetch product data from HEB's GraphQL API.
 * This bypasses the WAF that blocks HTML page fetches.
 */
export async function fetchHebProductGraphQL(
  productId: string,
  storeId: string = DEFAULT_STORE_ID,
): Promise<HebProduct | null> {
  try {
    const response = await fetch('https://www.heb.com/graphql', {
      method: 'POST',
      headers: HEB_GRAPHQL_HEADERS,
      body: JSON.stringify({
        query: PRODUCT_DETAIL_QUERY,
        variables: { id: productId, storeId },
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      console.error(
        `[heb-lookup] GraphQL returned ${response.status} for product=${productId} storeId=${storeId}`,
      )
      return null
    }

    const json = (await response.json()) as {
      data?: { productDetail?: Record<string, unknown> }
      errors?: Array<{ message: string }>
    }

    if (json.errors?.length) {
      console.error('[heb-lookup] GraphQL errors:', json.errors.map((e) => e.message).join('; '))
    }

    const product = json.data?.productDetail
    if (!product) return null

    return parseHebGraphQLProduct(product)
  } catch (err) {
    console.error('[heb-lookup] Fetch failed:', err)
    return null
  }
}

/**
 * Parse product data from HEB's GraphQL response into our HebProduct type.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseHebGraphQLProduct(product: any): HebProduct | null {
  try {
    if (!product?.fullDisplayName) return null

    const sku = product.SKUs?.[0]
    // Prefer ONLINE pricing, fall back to first available
    const contextPrice =
      sku?.contextPrices?.find((p: { context: string }) => p.context === 'ONLINE') ??
      sku?.contextPrices?.[0]

    const size = sku?.customerFriendlySize || ''
    const displayName = size ? `${product.fullDisplayName}, ${size}` : product.fullDisplayName

    return {
      productId: product.id,
      name: displayName,
      brand: product.brand?.name || '',
      price: contextPrice?.listPrice?.amount ?? 0,
      salePrice: contextPrice?.salePrice?.amount,
      priceUnit: contextPrice?.listPrice?.unit || 'each',
      unitPrice: contextPrice?.unitListPrice?.amount,
      unitPriceUnit: contextPrice?.unitListPrice?.unit,
      size,
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
 * Convert an HebProduct to ShoppableIngredient fields for merging into grocery list.
 */
export function hebProductToIngredientFields(product: HebProduct) {
  return {
    hebProductId: product.productId,
    hebProductUrl: product.productUrl,
    imageUrl: product.imageUrl,
    hebPrice: product.salePrice ?? product.price,
    hebPriceUnit: product.priceUnit,
    hebUnitPrice: product.unitPrice,
    hebUnitPriceUnit: product.unitPriceUnit,
    hebSize: product.size,
    category: product.category,
    storeLocation: product.storeLocation,
  }
}

// ---------------------------------------------------------------------------
// HEB Product Search (live GraphQL)
// ---------------------------------------------------------------------------

/** GraphQL query for product search */
const PRODUCT_SEARCH_QUERY = `query ProductSearch($query: String!, $storeId: Int!) {
  productSearch(query: $query, storeId: $storeId, shoppingContext: CURBSIDE_PICKUP) {
    records {
      id
      fullDisplayName
      brand { name }
      carouselImageUrls
      productPageURL
      inventory { inventoryState }
      productLocation { location }
      deal
      isNew
      SKUs {
        customerFriendlySize
        contextPrices {
          context
          listPrice { amount unit }
          salePrice { amount unit }
          unitListPrice { amount unit }
        }
      }
    }
  }
}`

/**
 * Search HEB products via their GraphQL API.
 * Returns up to 20 results with full pricing and location data.
 */
export async function searchHebProducts(
  query: string,
  storeId: string = DEFAULT_STORE_ID,
): Promise<HebProduct[]> {
  if (!query || query.trim().length < 2) return []

  try {
    const response = await fetch('https://www.heb.com/graphql', {
      method: 'POST',
      headers: HEB_GRAPHQL_HEADERS,
      body: JSON.stringify({
        query: PRODUCT_SEARCH_QUERY,
        variables: { query: query.trim(), storeId: parseInt(storeId, 10) },
      }),
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      console.error(
        `[heb-search] GraphQL returned ${response.status} for query="${query}" storeId=${storeId}`,
      )
      return []
    }

    const json = (await response.json()) as {
      data?: { productSearch?: { records?: Array<Record<string, unknown>> } }
      errors?: Array<{ message: string }>
    }

    if (json.errors?.length) {
      console.error('[heb-search] GraphQL errors:', json.errors.map((e) => e.message).join('; '))
    }

    const records = json.data?.productSearch?.records
    if (!records?.length) {
      console.warn(`[heb-search] No results for query="${query}" storeId=${storeId}`)
      return []
    }

    return records
      .map((record) => parseHebSearchResult(record))
      .filter((p): p is HebProduct => p !== null)
  } catch (err) {
    console.error('[heb-search] Fetch failed:', err)
    return []
  }
}

/**
 * Parse a single search result record into our HebProduct type.
 * Search results have the same Product shape but no breadcrumbs (so we infer category from location).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseHebSearchResult(record: any): HebProduct | null {
  try {
    if (!record?.fullDisplayName) return null

    const sku = record.SKUs?.[0]
    const contextPrice =
      sku?.contextPrices?.find((p: { context: string }) => p.context === 'ONLINE') ??
      sku?.contextPrices?.[0]

    const size = sku?.customerFriendlySize || ''
    const displayName = size ? `${record.fullDisplayName}, ${size}` : record.fullDisplayName

    return {
      productId: record.id,
      name: displayName,
      brand: record.brand?.name || '',
      price: contextPrice?.listPrice?.amount ?? 0,
      salePrice: contextPrice?.salePrice?.amount,
      priceUnit: contextPrice?.listPrice?.unit || 'each',
      unitPrice: contextPrice?.unitListPrice?.amount,
      unitPriceUnit: contextPrice?.unitListPrice?.unit,
      size,
      category: inferCategoryFromLocation(record.productLocation?.location),
      imageUrl: record.carouselImageUrls?.[0] || '',
      imageUrls: record.carouselImageUrls || [],
      storeLocation: record.productLocation?.location,
      inStock: record.inventory?.inventoryState === 'IN_STOCK',
      productUrl: record.productPageURL || '',
    }
  } catch {
    return null
  }
}

/**
 * Infer a grocery category from HEB's store location string.
 * Search results don't include breadcrumbs, so we use the location instead.
 */
function inferCategoryFromLocation(location?: string): string {
  if (!location) return 'Pantry & Condiments'
  const loc = location.toLowerCase()

  if (loc.includes('dairy')) return 'Dairy & Eggs'
  if (loc.includes('meat') || loc.includes('butcher')) return 'Meat'
  if (loc.includes('seafood') || loc.includes('fish')) return 'Seafood'
  if (loc.includes('produce') || loc.includes('fruit') || loc.includes('vegetable'))
    return 'Produce'
  if (loc.includes('frozen')) return 'Frozen Foods'
  if (loc.includes('bakery') || loc.includes('bread')) return 'Bakery & Bread'
  if (loc.includes('deli')) return 'Deli & Prepared'
  if (loc.includes('beer') || loc.includes('wine') || loc.includes('spirit')) return 'Beer & Wine'
  if (loc.includes('snack') || loc.includes('chip')) return 'Snacks'
  if (loc.includes('beverage') || loc.includes('drink') || loc.includes('water')) return 'Beverages'
  if (loc.includes('cereal') || loc.includes('breakfast')) return 'Breakfast & Cereal'
  if (loc.includes('baby')) return 'Baby'
  if (loc.includes('pet')) return 'Pet'
  if (loc.includes('health') || loc.includes('pharmacy')) return 'Health & Pharmacy'
  if (loc.includes('household') || loc.includes('paper')) return 'Paper & Household'
  if (loc.includes('personal') || loc.includes('beauty')) return 'Personal Care'

  return 'Pantry & Condiments'
}

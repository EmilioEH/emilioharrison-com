/**
 * H-E-B product lookup module.
 * Provides fuzzy search and lookup against the static grocery suggestions database.
 */

import { GROCERY_SUGGESTIONS, type GrocerySuggestion } from './grocery-suggestions'

export type { GrocerySuggestion }

export interface SearchResult {
  product: GrocerySuggestion
  score: number // Higher is better match
}

/**
 * Extracts searchable words from a string, removing common stop words.
 */
function extractSearchWords(text: string): string[] {
  const stopWords = new Set([
    'a',
    'an',
    'the',
    'of',
    'for',
    'with',
    'and',
    'or',
    'in',
    'on',
    'h-e-b',
    'heb',
    'central',
    'market',
    'brand',
  ])

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1 && !stopWords.has(word))
}

/**
 * Calculates a match score between a query and a product.
 * Higher scores indicate better matches.
 */
function calculateScore(queryWords: string[], product: GrocerySuggestion): number {
  const productWords = extractSearchWords(product.name)
  const brandWords = product.brand ? extractSearchWords(product.brand) : []
  const allProductWords = [...productWords, ...brandWords]

  let score = 0

  for (const queryWord of queryWords) {
    // Exact word match in product name
    if (productWords.some((pw) => pw === queryWord)) {
      score += 10
      continue
    }

    // Exact word match in brand
    if (brandWords.some((bw) => bw === queryWord)) {
      score += 5
      continue
    }

    // Partial match (query word is substring of product word)
    if (allProductWords.some((pw) => pw.includes(queryWord))) {
      score += 7
      continue
    }

    // Partial match (product word is substring of query word)
    if (allProductWords.some((pw) => queryWord.includes(pw) && pw.length >= 3)) {
      score += 4
      continue
    }

    // Prefix match
    if (allProductWords.some((pw) => pw.startsWith(queryWord) || queryWord.startsWith(pw))) {
      score += 3
    }
  }

  // Bonus for matching more words
  const matchedWords = queryWords.filter((qw) =>
    allProductWords.some(
      (pw) => pw === qw || pw.includes(qw) || qw.includes(pw) || pw.startsWith(qw),
    ),
  )
  if (matchedWords.length === queryWords.length && queryWords.length > 1) {
    score += 5 // Bonus for matching all query words
  }

  return score
}

/**
 * Searches for products matching the query.
 * Returns results sorted by relevance score (best matches first).
 *
 * @param query - Search query (e.g., "avocado", "chicken breast", "heb milk")
 * @param limit - Maximum number of results to return (default: 10)
 * @returns Array of search results with products and scores
 */
export function searchProducts(query: string, limit = 10): SearchResult[] {
  if (!query || query.trim().length < 2) {
    return []
  }

  const queryWords = extractSearchWords(query)
  if (queryWords.length === 0) {
    return []
  }

  const results: SearchResult[] = []

  for (const product of GROCERY_SUGGESTIONS) {
    const score = calculateScore(queryWords, product)
    if (score > 0) {
      results.push({ product, score })
    }
  }

  // Sort by score descending, then by name alphabetically
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.product.name.localeCompare(b.product.name)
  })

  return results.slice(0, limit)
}

/**
 * Finds a single product by exact or close name match.
 * Returns the best matching product or null if no good match found.
 *
 * @param name - Product name to search for
 * @returns The best matching product, or null
 */
export function findProduct(name: string): GrocerySuggestion | null {
  if (!name || name.trim().length < 2) {
    return null
  }

  const normalizedQuery = name.toLowerCase().trim()

  // First try exact match (case-insensitive)
  const exactMatch = GROCERY_SUGGESTIONS.find((p) => p.name.toLowerCase() === normalizedQuery)
  if (exactMatch) {
    return exactMatch
  }

  // Try to find a product whose name contains the query
  const containsMatch = GROCERY_SUGGESTIONS.find((p) =>
    p.name.toLowerCase().includes(normalizedQuery),
  )
  if (containsMatch) {
    return containsMatch
  }

  // Use fuzzy search and return top result if score is high enough
  const results = searchProducts(name, 1)
  if (results.length > 0 && results[0].score >= 7) {
    return results[0].product
  }

  return null
}

/**
 * Gets the price information for a product by name.
 *
 * @param name - Product name to look up
 * @returns Price info object, or null if not found
 */
export function getProductPrice(name: string): { price: number; unit: string } | null {
  const product = findProduct(name)
  if (!product || product.hebPrice === undefined) {
    return null
  }

  return {
    price: product.hebPrice,
    unit: product.hebPriceUnit || 'each',
  }
}

/**
 * Gets products by category.
 *
 * @param category - Category name (must match exactly)
 * @returns Array of products in that category
 */
export function getProductsByCategory(category: string): GrocerySuggestion[] {
  return GROCERY_SUGGESTIONS.filter((p) => p.category === category)
}

/**
 * Gets all unique categories in the database.
 */
export function getCategories(): string[] {
  const categories = new Set<string>()
  for (const product of GROCERY_SUGGESTIONS) {
    categories.add(product.category)
  }
  return Array.from(categories)
}

/**
 * Gets the total count of products in the database.
 */
export function getProductCount(): number {
  return GROCERY_SUGGESTIONS.length
}

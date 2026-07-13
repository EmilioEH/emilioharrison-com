import {
  GROCERY_SUGGESTIONS,
  GROCERY_CATEGORY_ORDER,
  GROCERY_CATEGORY_AISLES,
  type GrocerySuggestion,
} from './grocery-suggestions'

const OLD_TO_NEW_CATEGORY: Record<string, string> = {
  Produce: 'Produce',
  Meat: 'Meat',
  Dairy: 'Dairy & Eggs',
  Bakery: 'Bakery & Bread',
  Frozen: 'Frozen Foods',
  Pantry: 'Pantry & Condiments',
  Spices: 'Baking & Spices',
  Other: 'Other',
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(s: string): string[] {
  return normalize(s).split(' ').filter(Boolean)
}

export function findSuggestion(ingredientName: string): GrocerySuggestion | null {
  const norm = normalize(ingredientName)
  if (!norm) return null

  let best: GrocerySuggestion | null = null
  let bestScore = 0

  for (const suggestion of GROCERY_SUGGESTIONS) {
    const suggNorm = normalize(suggestion.name)

    if (suggNorm === norm) return suggestion

    if (suggNorm.includes(norm)) {
      const score = norm.length / suggNorm.length
      if (score > bestScore && score >= 0.3) {
        bestScore = score
        best = suggestion
      }
    } else if (norm.includes(suggNorm) && suggNorm.length >= 4) {
      const score = suggNorm.length / norm.length
      if (score > bestScore && score >= 0.3) {
        bestScore = score
        best = suggestion
      }
    }
  }

  if (bestScore >= 0.4) return best

  const tokens = tokenize(ingredientName)
  for (const suggestion of GROCERY_SUGGESTIONS) {
    const suggTokens = tokenize(suggestion.name)
    const matchCount = tokens.filter(
      (t) =>
        t.length >= 3 &&
        suggTokens.some((st) => {
          if (st === t) return true
          if (st.startsWith(t) || t.startsWith(st)) return true
          return false
        }),
    ).length
    if (matchCount === 0) continue
    const score = matchCount / Math.min(tokens.length, suggTokens.length)
    if (score > bestScore) {
      bestScore = score
      best = suggestion
    }
  }

  return bestScore >= 0.5 ? best : null
}

export function searchSuggestions(query: string, limit = 10): GrocerySuggestion[] {
  const norm = normalize(query)
  if (!norm || norm.length < 2) return []

  const tokens = tokenize(query)

  const scored: Array<{ suggestion: GrocerySuggestion; score: number }> = []

  for (const suggestion of GROCERY_SUGGESTIONS) {
    const suggNorm = normalize(suggestion.name)

    if (suggNorm === norm) {
      scored.push({ suggestion, score: 100 })
      continue
    }

    if (suggNorm.startsWith(norm)) {
      scored.push({ suggestion, score: 90 })
      continue
    }

    if (suggNorm.includes(norm)) {
      scored.push({ suggestion, score: 80 })
      continue
    }

    const suggTokens = tokenize(suggestion.name)
    const matchCount = tokens.filter((t) =>
      suggTokens.some((st) => st.startsWith(t) || t.startsWith(st)),
    ).length
    if (matchCount > 0) {
      scored.push({ suggestion, score: 50 + (matchCount / tokens.length) * 30 })
      continue
    }

    const brandNorm = suggestion.brand ? normalize(suggestion.brand) : ''
    if (brandNorm && brandNorm.includes(norm)) {
      scored.push({ suggestion, score: 40 })
    }
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((s) => s.suggestion)
}

export function mapToHebCategory(oldCategory: string): string {
  return OLD_TO_NEW_CATEGORY[oldCategory] || oldCategory
}

export function getCategoryAisle(category: string): string | undefined {
  return GROCERY_CATEGORY_AISLES[category]
}

export function getCategoryOrder(category: string): number {
  return GROCERY_CATEGORY_ORDER[category] ?? 99
}

export function getPriceForItem(ingredientName: string): { price: number; unit: string } | null {
  const match = findSuggestion(ingredientName)
  if (match?.hebPrice != null && match.hebPriceUnit) {
    return { price: match.hebPrice, unit: match.hebPriceUnit }
  }
  return null
}

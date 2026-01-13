import { useState, useMemo } from 'react'
import * as FuseModule from 'fuse.js'
import type { Recipe } from '../../../lib/types'

// Robust import for Fuse.js (handles ESM/CJS interop issues)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Fuse = (FuseModule as any).default || FuseModule

export interface Filters {
  protein?: string[]
  mealType?: string[]
  dishType?: string[]
  difficulty?: string[]
  cuisine?: string[]
  dietary?: string[]
  equipment?: string[]
  occasion?: string[]
  onlyFavorites?: boolean
}

// Helper: Check if single-value field matches filter (e.g., protein, mealType)
const matchesSingleFilter = (
  filterValues: string[] | undefined,
  recipeValue: string | undefined,
): boolean => {
  if (!filterValues || filterValues.length === 0) return true
  if (!recipeValue) return true // No value = don't exclude
  return filterValues.includes(recipeValue)
}

// Helper: Check if array-value field has overlap with filter (e.g., dietary tags)
const matchesArrayFilter = (
  filterValues: string[] | undefined,
  recipeValues: string[] | undefined,
): boolean => {
  if (!filterValues || filterValues.length === 0) return true
  if (!recipeValues || recipeValues.length === 0) return false
  return recipeValues.some((v) => filterValues.includes(v))
}

export const useFilteredRecipes = (recipes: Recipe[], view: string) => {
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false)
  const [filters, setFilters] = useState<Filters>({})
  const [sort, setSort] = useState<string>('protein')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Initialize Fuse.js for fuzzy search
  const fuse = useMemo(() => {
    if (!recipes || recipes.length === 0) return null
    return new Fuse(recipes, {
      keys: [
        { name: 'title', weight: 0.7 },
        { name: 'ingredients.name', weight: 0.3 },
      ],
      threshold: 0.4, // Sensitivity: 0.0 = exact, 1.0 = match anything
      includeScore: true,
      includeMatches: true,
      ignoreLocation: true, // Search anywhere in the string
    })
  }, [recipes])

  const processedRecipes = useMemo(() => {
    let result = [...recipes]

    // View Mode Filter (Library vs Week)
    if (view === 'week') {
      result = result.filter((r) => r.thisWeek)
    }

    // Search
    if (searchQuery) {
      if (!fuse) return []
      const searchResults = fuse.search(searchQuery)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result = searchResults.map((r: any) => ({
        ...r.item,
        matches: r.matches,
        score: r.score,
      }))
    }

    // Filter using helper to reduce cognitive complexity
    result = result.filter((r) => {
      // Single-value filters
      if (!matchesSingleFilter(filters.protein, r.protein)) return false
      if (!matchesSingleFilter(filters.mealType, r.mealType)) return false
      if (!matchesSingleFilter(filters.dishType, r.dishType)) return false
      if (!matchesSingleFilter(filters.difficulty, r.difficulty)) return false
      if (!matchesSingleFilter(filters.cuisine, r.cuisine)) return false

      // Array-value filters (recipe has multiple tags)
      if (!matchesArrayFilter(filters.dietary, r.dietary)) return false
      if (!matchesArrayFilter(filters.equipment, r.equipment)) return false
      if (!matchesArrayFilter(filters.occasion, r.occasion)) return false

      // Favorites filter
      if (filters.onlyFavorites && !r.isFavorite) return false

      return true
    })

    // Sort using extracted comparators to reduce cognitive complexity
    const sortComparators: Record<
      string,
      (a: Recipe & { score?: number }, b: Recipe & { score?: number }) => number
    > = {
      protein: (a, b) => {
        // If searching, preserve Fuse.js relevance order
        if (searchQuery) {
          return (a.score ?? 1) - (b.score ?? 1)
        }
        const pA = a.protein || 'Other'
        const pB = b.protein || 'Other'
        return pA === pB ? a.title.localeCompare(b.title) : pA.localeCompare(pB)
      },
      alpha: (a, b) => a.title.localeCompare(b.title),
      recent: (a, b) => parseInt(b.id) - parseInt(a.id),
      time: (a, b) => a.prepTime + a.cookTime - (b.prepTime + b.cookTime),
      rating: (a, b) => {
        const rA = a.rating || 0
        const rB = b.rating || 0
        return rA === rB ? a.title.localeCompare(b.title) : rB - rA
      },
      'cost-low': (a, b) => {
        const cA = a.estimatedCost ?? Infinity
        const cB = b.estimatedCost ?? Infinity
        return cA === cB ? a.title.localeCompare(b.title) : cA - cB
      },
      'cost-high': (a, b) => {
        const cA = a.estimatedCost ?? -1
        const cB = b.estimatedCost ?? -1
        return cA === cB ? a.title.localeCompare(b.title) : cB - cA
      },
    }

    const comparator = sortComparators[sort] || (() => 0)
    result.sort(comparator)

    return result
  }, [recipes, searchQuery, filters, sort, view, fuse])

  return {
    filtersOpen,
    setFiltersOpen,
    filters,
    setFilters,
    sort,
    setSort,
    searchQuery,
    setSearchQuery,
    processedRecipes,
  }
}

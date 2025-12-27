import { useState, useMemo } from 'react'

export const useFilteredRecipes = (recipes, view) => {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState({})
  const [sort, setSort] = useState('protein')
  const [searchQuery, setSearchQuery] = useState('')

  const processedRecipes = useMemo(() => {
    let result = [...recipes]

    // View Mode Filter (Library vs Week)
    if (view === 'week') {
      result = result.filter((r) => r.thisWeek)
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (r) =>
          r.title?.toLowerCase().includes(q) ||
          r.ingredients?.some((i) => i.name.toLowerCase().includes(q)),
      )
    }

    // Filter
    result = result.filter((r) => {
      if (filters.protein?.length > 0 && !filters.protein.includes(r.protein)) return false
      if (filters.mealType?.length > 0 && !filters.mealType.includes(r.mealType)) return false
      if (filters.dishType?.length > 0 && !filters.dishType.includes(r.dishType)) return false
      if (filters.difficulty?.length > 0 && !filters.difficulty.includes(r.difficulty)) return false
      if (filters.cuisine?.length > 0 && !filters.cuisine.includes(r.cuisine)) return false

      if (filters.dietary?.length > 0) {
        if (!r.dietary || !r.dietary.some((d) => filters.dietary.includes(d))) return false
      }
      if (filters.equipment?.length > 0) {
        if (!r.equipment || !r.equipment.some((e) => filters.equipment.includes(e))) return false
      }
      if (filters.occasion?.length > 0) {
        if (!r.occasion || !r.occasion.some((o) => filters.occasion.includes(o))) return false
      }

      if (filters.onlyFavorites) {
        if (!r.isFavorite) return false
      }

      return true
    })

    // Sort
    result.sort((a, b) => {
      if (sort === 'protein') {
        const pA = a.protein || 'Other'
        const pB = b.protein || 'Other'
        if (pA === pB) return a.title.localeCompare(b.title)
        return pA.localeCompare(pB)
      }
      if (sort === 'alpha') return a.title.localeCompare(b.title)
      if (sort === 'recent') return parseInt(b.id) - parseInt(a.id)
      if (sort === 'time') return a.prepTime + a.cookTime - (b.prepTime + b.cookTime)
      if (sort === 'rating') {
        const rA = a.rating || 0
        const rB = b.rating || 0
        if (rA === rB) return a.title.localeCompare(b.title)
        return rB - rA
      }
      return 0
    })

    return result
  }, [recipes, searchQuery, filters, sort, view])

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

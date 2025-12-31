import React, { useState, useLayoutEffect, useRef, useEffect } from 'react'
import { ChefHat, ChevronRight, Search, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Recipe } from '../../lib/types'
import { useRecipeGrouping } from './hooks/useRecipeGrouping'

// Global scroll cache
const scrollCache: Record<string, string | number> = {}

interface RecipeLibraryProps {
  recipes: Recipe[]
  onSelectRecipe: (recipe: Recipe) => void
  onToggleThisWeek: (id: string) => void
  sort: string
  isSelectionMode: boolean
  selectedIds: Set<string>
  onClearSearch?: () => void
  hasSearch?: boolean
  scrollContainer?: HTMLElement | null
  // New Header Tools Props
  onOpenFilters: () => void
  activeFilterCount: number
}

declare global {
  interface Window {
    recipeScrollContainer?: HTMLElement
  }
}

export const RecipeLibrary: React.FC<RecipeLibraryProps> = ({
  recipes,
  onSelectRecipe,
  onToggleThisWeek,
  sort,
  isSelectionMode,
  selectedIds,
  onClearSearch,
  hasSearch,
  scrollContainer,
  onOpenFilters,
  activeFilterCount,
}) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)
  const isProgrammaticScroll = useRef(false)

  // Scrollspy & Tabs
  const [activeGroup, setActiveGroup] = useState<string>(() => {
    return (scrollCache['library_activeGroup'] as string) || ''
  })
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const navRef = useRef<HTMLDivElement>(null)

  // Filter Logic
  const filteredRecipes = React.useMemo(() => {
    if (activeFilters.size === 0) return recipes

    return recipes.filter((recipe) => {
      if (activeFilters.has('Favorites') && !recipe.isFavorite) return false
      if (activeFilters.has('This Week') && !recipe.thisWeek) return false
      if (activeFilters.has('Under 30m') && recipe.cookTime + recipe.prepTime > 30) return false
      if (
        activeFilters.has('High Protein') &&
        (!recipe.protein ||
          !['beef', 'chicken', 'fish', 'pork'].includes(recipe.protein.toLowerCase()))
      )
        return false
      return true
    })
  }, [recipes, activeFilters])

  // Use custom hook for complex grouping logic
  const { groupedRecipes, getGroupTitle } = useRecipeGrouping(filteredRecipes, sort)

  const toggleFilter = (filter: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(filter)) {
        next.delete(filter)
      } else {
        next.add(filter)
      }
      return next
    })
  }

  // Initialize active group if none exists
  useEffect(() => {
    if (groupedRecipes.sortedKeys.length > 0 && !activeGroup) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveGroup(groupedRecipes.sortedKeys[0])
    }
  }, [groupedRecipes.sortedKeys, activeGroup])

  // 1. One-time Scroll Restoration
  useLayoutEffect(() => {
    const cachedScroll = Number(scrollCache['library']) || 0
    const container = scrollContainer || window.recipeScrollContainer

    if (container && cachedScroll > 0) {
      container.scrollTo({ top: cachedScroll, behavior: 'instant' })

      // Restore active pill scroll position
      const currentGroup = scrollCache['library_activeGroup']
      if (currentGroup && navRef.current) {
        const activeBtn = navRef.current.querySelector(
          `[data-group="${currentGroup}"]`,
        ) as HTMLElement
        if (activeBtn) {
          const left =
            activeBtn.offsetLeft - navRef.current.clientWidth / 2 + activeBtn.clientWidth / 2
          navRef.current.scrollTo({ left, behavior: 'instant' })
        }
      }
    }
  }, [scrollContainer]) // Only run on mount or when container becomes available

  // 2. Continuous Scroll Listener
  useEffect(() => {
    const container = scrollContainer || window.recipeScrollContainer
    if (!container) return

    const handleScroll = () => {
      // Cache Scroll
      const currentScroll = container.scrollTop
      scrollCache['library'] = currentScroll

      // Scrollspy Logic
      if (isSelectionMode || isProgrammaticScroll.current) return

      const scrollPosition = currentScroll + 180 // Offset

      // Find the group currently in view
      let currentGroup = activeGroup

      for (const key of groupedRecipes.sortedKeys) {
        const el = groupRefs.current[key]
        if (el) {
          const { offsetTop, offsetHeight } = el
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            currentGroup = key
            break
          }
        }
      }

      if (currentGroup !== activeGroup) {
        setActiveGroup(currentGroup)
        scrollCache['library_activeGroup'] = currentGroup

        // Scroll pill into view
        const navEl = navRef.current
        if (navEl) {
          const activeBtn = navEl.querySelector(`[data-group="${currentGroup}"]`) as HTMLElement
          if (activeBtn) {
            const left = activeBtn.offsetLeft - navEl.clientWidth / 2 + activeBtn.clientWidth / 2
            navEl.scrollTo({ left, behavior: 'smooth' })
          }
        }
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [activeGroup, groupedRecipes, isSelectionMode, scrollContainer])

  const toggleGroup = (groupName: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }))
  }

  const scrollToGroup = (key: string) => {
    setActiveGroup(key)
    const el = groupRefs.current[key]
    const container = scrollContainer || window.recipeScrollContainer
    if (el && container) {
      isProgrammaticScroll.current = true
      // Scroll to element, accounting for Category Nav height (~60px)
      const top = Math.max(0, el.offsetTop - 65)
      container.scrollTo({ top, behavior: 'smooth' })

      // Release lock after animation + margin
      setTimeout(() => {
        isProgrammaticScroll.current = false
      }, 1000)
    }
  }

  if (recipes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
        <ChefHat className="mb-4 h-16 w-16 opacity-50" />
        <p className="mb-4 font-bold">No recipes found.</p>
        <p className="mb-6 max-w-xs text-sm">
          {hasSearch
            ? 'Try adjusting your search terms or filters.'
            : 'Get started by adding your first recipe!'}
        </p>
        {hasSearch && onClearSearch && <Button onClick={onClearSearch}>Clear Search</Button>}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="pb-24 animate-in fade-in">
      {/* Sticky Header Block: Nav + Filters */}
      {!isSelectionMode && (
        <div className="sticky top-0 z-40 bg-background/95 pb-2 shadow-sm backdrop-blur transition-all">
          {/* Row 1: Tools & Filters */}
          <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto px-4 py-2">
            {/* Search Trigger */}
            <button
              onClick={onOpenFilters}
              aria-label="Open search"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Filter Trigger */}
            <button
              onClick={onOpenFilters}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${activeFilterCount > 0 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute right-0 top-0 -mr-1 -mt-1 flex h-3 w-3 items-center justify-center rounded-full bg-primary text-[8px] text-primary-foreground ring-2 ring-background">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <div className="mx-1 h-6 w-px bg-border" />

            {/* Quick Filter Pills */}
            {['Favorites', 'This Week', 'Under 30m', 'High Protein'].map((filter) => (
              <button
                key={filter}
                onClick={() => toggleFilter(filter)}
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                  activeFilters.has(filter)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Row 2: Category Nav */}
          {groupedRecipes.sortedKeys.length > 1 && (
            <div
              ref={navRef}
              className="scrollbar-hide flex items-center gap-2 overflow-x-auto px-4 pb-2"
            >
              {groupedRecipes.sortedKeys.map((key) => (
                <button
                  key={key}
                  data-group={key}
                  onClick={() => scrollToGroup(key)}
                  className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-bold transition-all ${
                    activeGroup === key
                      ? 'bg-foreground text-background shadow-md'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  } `}
                >
                  {getGroupTitle(key)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {groupedRecipes.sortedKeys.map((key) => (
        <div
          key={key}
          ref={(el) => {
            groupRefs.current[key] = el
          }}
        >
          {/* Group Header - Sticky below Nav & Filters (approx 100px) */}
          <div
            className={`sticky z-30 border-b border-border bg-background/95 backdrop-blur-sm transition-all duration-200 ${!isSelectionMode ? 'top-[105px]' : 'top-0'} `}
          >
            <button
              onClick={() => toggleGroup(key)}
              className="flex w-full items-center justify-between px-4 py-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <h3 className="font-display text-xl font-bold text-foreground">
                  {getGroupTitle(key)}
                </h3>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {groupedRecipes.groups[key].length}
                </span>
              </div>
              <ChevronRight
                className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                  openGroups[key] !== false ? 'rotate-90' : ''
                }`}
              />
            </button>
          </div>

          {/* Recipe List - Always List View */}
          {openGroups[key] !== false && (
            <div className="flex flex-col gap-2 p-4">
              {groupedRecipes.groups[key].map((recipe) => (
                <div
                  key={recipe.id}
                  role="button"
                  tabIndex={0}
                  data-testid={`recipe-card-${recipe.id}`}
                  className={`group flex w-full cursor-pointer gap-4 rounded-xl border border-transparent p-3 text-left transition-all hover:bg-accent/50 ${
                    isSelectionMode && selectedIds?.has(recipe.id)
                      ? 'border-primary/20 bg-accent'
                      : 'hover:border-border hover:shadow-sm'
                  }`}
                  onClick={() => onSelectRecipe(recipe)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelectRecipe(recipe)
                    }
                  }}
                >
                  {/* Square Thumbnail */}
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted shadow-sm">
                    {recipe.finishedImage || recipe.sourceImage ? (
                      <img
                        src={recipe.finishedImage || recipe.sourceImage}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        alt=""
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ChefHat className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>

                  {/* Content Column */}
                  <div className="flex flex-1 flex-col justify-between py-0.5">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="line-clamp-2 pr-2 font-display text-lg font-bold leading-tight text-foreground">
                          {recipe.title}
                        </h4>
                        {recipe.rating && (
                          <div className="flex shrink-0 items-center gap-1 rounded-full bg-secondary/50 px-1.5 py-0.5 text-[10px] font-bold text-foreground">
                            <span>★</span> <span data-testid="recipe-rating">{recipe.rating}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
                        <span>{recipe.cookTime + recipe.prepTime} min</span>
                        <span>•</span>
                        <span>{recipe.mealType}</span>
                      </div>
                    </div>

                    {/* Footer / Actions */}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {recipe.isFavorite && (
                          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-500">
                            Favorite
                          </span>
                        )}
                        {recipe.thisWeek && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                            This Week
                          </span>
                        )}
                      </div>

                      {/* Quick Add Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onToggleThisWeek(recipe.id)
                        }}
                        className={`flex h-8 items-center justify-center gap-1 rounded-full px-3 transition-all ${
                          recipe.thisWeek
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground'
                        }`}
                      >
                        {recipe.thisWeek ? (
                          <span className="text-xs font-bold">✓ Added</span>
                        ) : (
                          <span className="text-xs font-bold">+ Add</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

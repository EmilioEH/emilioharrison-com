import React, { useState, useLayoutEffect, useRef } from 'react'
import { ChefHat, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Recipe } from '../../lib/types'
import { useRecipeGrouping } from './hooks/useRecipeGrouping'
import { LibraryRecipeCard } from './library/LibraryRecipeCard'

// Global scroll cache
const scrollCache: Record<string, number> = {}

interface RecipeLibraryProps {
  recipes: Recipe[]
  onSelectRecipe: (recipe: Recipe) => void
  onToggleThisWeek: (id: string) => void
  sort: string
  isSelectionMode: boolean
  selectedIds: Set<string>
  onAssignDay: (recipe: Recipe, date: string) => void
  viewMode: 'grid' | 'list'
  onClearSearch?: () => void
  hasSearch?: boolean
}

export const RecipeLibrary: React.FC<RecipeLibraryProps> = ({
  recipes,
  onSelectRecipe,
  onToggleThisWeek,
  sort,
  isSelectionMode,
  selectedIds,
  onAssignDay,
  viewMode,
  onClearSearch,
  hasSearch,
}) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const containerRef = useRef<HTMLDivElement>(null)

  // Use custom hook for complex grouping logic
  const { groupedRecipes, getGroupTitle, weekDays } = useRecipeGrouping(recipes, sort)

  // Scroll Restoration
  useLayoutEffect(() => {
    // Restore scroll
    const cachedScroll = scrollCache['library'] || 0
    // Try to restore on window/document body if we are scrolling the main page
    // Or key off a specific container if we are in a sub-scroller.
    // The main app usually scrolls the 'main' element in RecipeManager.
    // Since RecipeLibrary is inside that scrollable area, we might need a different approach.
    // However, the task says the 'library resets to the top'.
    // In RecipeManager, the <main> has overflow-y-auto.
    // We need to target THAT scroll container.
    // The previous implementation of RecipeManager has:
    // <main className="relative flex-1 overflow-y-auto scroll-smooth">

    // We can't access that REF easily without passing it down.
    // ALTERNATIVE: Use the parent selector.
    const scrollContainer = document.querySelector('main.overflow-y-auto')

    if (scrollContainer && cachedScroll > 0) {
      scrollContainer.scrollTop = cachedScroll
    }

    // Save scroll on unmount
    return () => {
      if (scrollContainer) {
        scrollCache['library'] = scrollContainer.scrollTop
      }
    }
  }, []) // Run once on mount/unmount

  const toggleGroup = (groupName: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }))
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
      {groupedRecipes.sortedKeys.map((key) => (
        <div key={key}>
          {/* Group Header */}
          <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm transition-all duration-200">
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

          {/* Recipe Grid - Only show if group is open */}
          {openGroups[key] !== false && (
            <div
              className={`p-4 ${
                viewMode === 'grid'
                  ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'
                  : 'flex flex-col gap-2'
              }`}
            >
              {groupedRecipes.groups[key].map((recipe) =>
                viewMode === 'grid' ? (
                  <LibraryRecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    onClick={() => onSelectRecipe(recipe)}
                    onToggleThisWeek={onToggleThisWeek}
                    data-testid={`recipe-card-${recipe.id}`}
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedIds?.has(recipe.id)}
                    onAssignDay={onAssignDay}
                    weekDays={sort === 'week-day' ? weekDays : null}
                  />
                ) : (
                  // List View Item
                  <button
                    key={recipe.id}
                    onClick={() => onSelectRecipe(recipe)}
                    className={`flex w-full items-center gap-4 rounded-lg p-2 text-left transition hover:bg-accent ${
                      isSelectionMode && selectedIds?.has(recipe.id) ? 'bg-accent' : ''
                    }`}
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                      {recipe.finishedImage || recipe.sourceImage ? (
                        <img
                          src={recipe.finishedImage || recipe.sourceImage}
                          className="h-full w-full object-cover"
                          alt=""
                        />
                      ) : (
                        <ChefHat className="p-2 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate font-medium text-foreground">{recipe.title}</h4>
                      <div className="text-xs text-muted-foreground">
                        {recipe.cookTime + recipe.prepTime}m • {recipe.mealType}
                      </div>
                    </div>
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

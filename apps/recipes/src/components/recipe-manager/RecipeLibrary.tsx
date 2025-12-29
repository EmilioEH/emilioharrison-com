import React, { useState, useRef, useMemo, useEffect } from 'react'
import { ChefHat, ChevronDown } from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Recipe } from '../../lib/types'
import { useRecipeGrouping } from './hooks/useRecipeGrouping'
import { LibraryRecipeCard } from './library/LibraryRecipeCard'

interface RecipeLibraryProps {
  recipes: Recipe[]
  onSelectRecipe: (recipe: Recipe) => void
  onToggleThisWeek: (id: string) => void
  sort: string
  isSelectionMode: boolean
  selectedIds: Set<string>
  onAssignDay: (recipe: Recipe, date: string) => void
  viewMode: 'grid' | 'list'
}

// Helper to chunk array
const chunk = <T,>(arr: T[], size: number): T[][] => {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_v, i) =>
    arr.slice(i * size, i * size + size),
  )
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
}) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const parentRef = useRef<HTMLDivElement>(null)

  // Use custom hook for complex grouping logic
  const { groupedRecipes, getGroupTitle, weekDays } = useRecipeGrouping(recipes, sort)

  const toggleGroup = (groupName: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }))
  }

  // --- Virtualization Logic ---
  // 1. Determine columns based on container width (simple breakpoint logic)
  const [numColumns, setNumColumns] = useState(1)

  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth
      // tailwind break points: sm: 640, lg: 1024
      if (viewMode === 'list') {
        setNumColumns(1)
      } else {
        if (width >= 1024) setNumColumns(3)
        else if (width >= 640) setNumColumns(2)
        else setNumColumns(1)
      }
    }
    updateColumns()
    window.addEventListener('resize', updateColumns)
    return () => window.removeEventListener('resize', updateColumns)
  }, [viewMode])

  // 2. Flatten Data
  const virtualItems = useMemo(() => {
    const items: Array<{ type: 'header'; key: string } | { type: 'row'; recipes: Recipe[] }> = []

    groupedRecipes.sortedKeys.forEach((key) => {
      // Add Header
      items.push({ type: 'header', key })

      // Add Recipes if open
      if (openGroups[key] !== false) {
        const groupRecipes = groupedRecipes.groups[key]
        const rows = chunk(groupRecipes, numColumns)
        rows.forEach((row) => {
          items.push({ type: 'row', recipes: row })
        })
      }
    })
    return items
  }, [groupedRecipes, openGroups, numColumns])

  const rowVirtualizer = useVirtualizer({
    count: virtualItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = virtualItems[index]
      if (item.type === 'header') return 60 // Approximate header height
      if (viewMode === 'list') return 80 // List item height
      return 380 // Grid Card Height (approx)
    },
    overscan: 5,
  })

  if (recipes.length === 0) {
    return (
      <div className="py-20 text-center text-gray-400">
        <ChefHat className="mx-auto mb-4 h-16 w-16 opacity-50" />
        <p className="font-bold">No recipes found.</p>
      </div>
    )
  }

  return (
    <div ref={parentRef} className="animate-in fade-in scrollbar-hide h-full overflow-y-auto pb-24">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const item = virtualItems[virtualRow.index]
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {item.type === 'header' ? (
                // Header Row
                <div className="border-b border-md-sys-color-outline bg-md-sys-color-surface last:border-0">
                  <button
                    onClick={() => toggleGroup(item.key)}
                    className="hover:bg-md-sys-color-primary/[0.04] flex w-full items-center justify-between px-6 py-4 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <h3 className="font-display text-xl font-bold text-md-sys-color-on-surface">
                        {getGroupTitle(item.key)}
                      </h3>
                      <span className="rounded-full bg-md-sys-color-primary-container px-2 py-0.5 text-xs font-medium text-md-sys-color-on-primary-container">
                        {groupedRecipes.groups[item.key].length}
                      </span>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 text-md-sys-color-on-surface-variant transition-transform duration-200 ${
                        openGroups[item.key] !== false ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                </div>
              ) : (
                // Recipe Row
                <div
                  className={`grid gap-4 px-4 py-2 ${
                    viewMode === 'grid'
                      ? numColumns === 3
                        ? 'grid-cols-3'
                        : numColumns === 2
                          ? 'grid-cols-2'
                          : 'grid-cols-1'
                      : 'grid-cols-1'
                  }`}
                >
                  {item.recipes.map((recipe) =>
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
                        className={`flex w-full items-center gap-4 rounded-lg p-2 text-left transition hover:bg-gray-100 ${
                          isSelectionMode && selectedIds?.has(recipe.id) ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-gray-200">
                          {recipe.finishedImage || recipe.sourceImage ? (
                            <img
                              src={recipe.finishedImage || recipe.sourceImage}
                              className="h-full w-full object-cover"
                              alt=""
                            />
                          ) : (
                            <ChefHat className="p-2 text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate font-medium text-gray-900">{recipe.title}</h4>
                          <div className="text-xs text-gray-500">
                            {recipe.cookTime + recipe.prepTime}m • {recipe.mealType}
                          </div>
                        </div>
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

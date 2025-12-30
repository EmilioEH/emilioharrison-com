import React, { useState } from 'react'
import { ChefHat, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

  // Use custom hook for complex grouping logic
  const { groupedRecipes, getGroupTitle, weekDays } = useRecipeGrouping(recipes, sort)

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
    <div className="animate-in fade-in scrollbar-hide h-full overflow-y-auto pb-24">
      {groupedRecipes.sortedKeys.map((key) => (
        <div key={key}>
          {/* Group Header */}
          <div className="border-border bg-muted/30 border-b">
            <button
              onClick={() => toggleGroup(key)}
              className="hover:bg-muted/50 flex w-full items-center justify-between px-4 py-4 transition-colors"
            >
              <div className="flex items-center gap-3">
                <h3 className="text-foreground font-display text-xl font-bold">
                  {getGroupTitle(key)}
                </h3>
                <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                  {groupedRecipes.groups[key].length}
                </span>
              </div>
              <ChevronDown
                className={`text-muted-foreground h-5 w-5 transition-transform duration-200 ${
                  openGroups[key] !== false ? 'rotate-180' : ''
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
                    className={`hover:bg-accent flex w-full items-center gap-4 rounded-lg p-2 text-left transition ${
                      isSelectionMode && selectedIds?.has(recipe.id) ? 'bg-accent' : ''
                    }`}
                  >
                    <div className="bg-muted h-12 w-12 shrink-0 overflow-hidden rounded-md">
                      {recipe.finishedImage || recipe.sourceImage ? (
                        <img
                          src={recipe.finishedImage || recipe.sourceImage}
                          className="h-full w-full object-cover"
                          alt=""
                        />
                      ) : (
                        <ChefHat className="text-muted-foreground p-2" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-foreground truncate font-medium">{recipe.title}</h4>
                      <div className="text-muted-foreground text-xs">
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

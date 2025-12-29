import React, { useState } from 'react'
import { ChefHat, Calendar, Heart, Check } from 'lucide-react'
import type { Recipe } from '../../lib/types'
import { useRecipeGrouping } from './hooks/useRecipeGrouping'
import { AccordionGroup } from '../ui/AccordionGroup'
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
      <div className="py-20 text-center text-gray-400">
        <ChefHat className="mx-auto mb-4 h-16 w-16 opacity-50" />
        <p className="font-bold">No recipes found.</p>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in h-full overflow-y-auto pb-24">
      {groupedRecipes.sortedKeys.map((key) => (
        <AccordionGroup
          key={key}
          title={getGroupTitle(key)}
          count={groupedRecipes.groups[key].length}
          isOpen={openGroups[key] !== false}
          onToggle={() => toggleGroup(key)}
          viewMode={viewMode}
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
              // List View - Keeping inline for now as it's simple enough, or could extract too
              <button
                key={recipe.id}
                onClick={() => onSelectRecipe(recipe)}
                className={`flex w-full items-center gap-4 border-b border-gray-100 bg-white p-3 text-left transition last:border-0 hover:bg-gray-50 ${
                  isSelectionMode && selectedIds?.has(recipe.id) ? 'bg-blue-50' : ''
                }`}
              >
                {isSelectionMode && (
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      selectedIds?.has(recipe.id)
                        ? 'border-primary bg-primary text-white'
                        : 'border-gray-300'
                    }`}
                  >
                    {selectedIds?.has(recipe.id) && <Check size={12} />}
                  </div>
                )}

                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {recipe.finishedImage || recipe.sourceImage ? (
                    <img
                      src={recipe.finishedImage || recipe.sourceImage}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ChefHat className="h-full w-full p-2 text-gray-300" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="truncate font-medium text-gray-900">{recipe.title}</h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{recipe.cookTime + recipe.prepTime}m</span>
                    <span>•</span>
                    <span>{recipe.mealType || 'Other'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {recipe.thisWeek && <Calendar size={16} className="text-primary" />}
                  {recipe.isFavorite && <Heart size={16} className="fill-red-500 text-red-500" />}
                </div>
              </button>
            ),
          )}
        </AccordionGroup>
      ))}
    </div>
  )
}

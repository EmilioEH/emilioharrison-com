import React, { useState, useMemo } from 'react'
import { Clock, Users, ChefHat, ChevronDown, Calendar, Star, Heart, Check } from 'lucide-react'

const LibraryRecipeCard = ({
  recipe,
  onClick,
  onToggleThisWeek,
  'data-testid': testId,
  isSelectionMode,
  isSelected,
}) => (
  <div
    data-testid={testId}
    className={`group relative flex w-full flex-col overflow-hidden rounded-md-l border bg-md-sys-color-surface text-left shadow-md-1 transition-all hover:shadow-md-2 ${
      recipe.thisWeek
        ? 'border-md-sys-color-primary ring-1 ring-md-sys-color-primary'
        : 'border-md-sys-color-outline'
    }`}
  >
    <button onClick={onClick} className="relative flex h-full w-full flex-1 flex-col text-left">
      {isSelectionMode && (
        <div className="absolute left-2 top-2 z-20">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${isSelected ? 'border-md-sys-color-primary bg-md-sys-color-primary' : 'border-gray-400 bg-white/80'}`}
          >
            {isSelected && <Check className="h-4 w-4 text-md-sys-color-on-primary" />}
          </div>
        </div>
      )}
      {recipe.sourceImage && (
        <div className="h-32 w-full overflow-hidden border-b border-md-sys-color-outline">
          <img
            src={recipe.sourceImage}
            alt={recipe.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        </div>
      )}
      <div className="p-4">
        {/* Supporting Metadata - Top */}
        <div className="mb-2 flex items-center justify-between">
          {recipe.protein && (
            <span className="rounded-full bg-md-sys-color-secondary-container px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-md-sys-color-on-secondary-container">
              {recipe.protein}
            </span>
          )}
          {recipe.thisWeek && (
            <span className="inline-flex items-center gap-1 rounded-full bg-md-sys-color-primary-container px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-md-sys-color-on-primary-container">
              <Calendar className="h-3.5 w-3.5" /> This Week
            </span>
          )}
        </div>

        {/* Primary Content - Title */}
        <h3 className="mb-3 line-clamp-2 font-display text-lg font-bold leading-tight text-md-sys-color-on-surface">
          {recipe.title}
        </h3>

        {/* Secondary Metadata - Bottom */}
        <div className="flex items-center gap-3 text-xs font-medium text-md-sys-color-on-surface-variant">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{recipe.cookTime + recipe.prepTime}m</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span>{recipe.servings}</span>
          </div>
          {recipe.rating && (
            <div className="ml-auto flex items-center gap-1 text-md-sys-color-primary">
              <Star className="h-3.5 w-3.5 fill-current" />
              <span className="font-semibold">{recipe.rating}</span>
            </div>
          )}
          {recipe.isFavorite && <Heart className="h-4 w-4 fill-red-500 text-red-500" />}
        </div>
      </div>
    </button>
    <button
      onClick={(e) => {
        e.stopPropagation()
        onToggleThisWeek(recipe.id)
      }}
      className={`absolute right-2 top-2 z-10 rounded-full p-2 shadow-sm transition-colors ${
        recipe.thisWeek
          ? 'hover:bg-md-sys-color-primary/90 bg-md-sys-color-primary text-md-sys-color-on-primary'
          : 'bg-md-sys-color-surface-variant text-md-sys-color-on-surface-variant hover:bg-md-sys-color-secondary-container hover:text-md-sys-color-on-secondary-container'
      }`}
      title={recipe.thisWeek ? 'Remove from This Week' : 'Add to This Week'}
    >
      <Calendar className="h-4 w-4" />
    </button>
  </div>
)

const AccordionGroup = ({ title, count, children, isOpen, onToggle }) => (
  <div className="border-b border-md-sys-color-outline last:border-0">
    <button
      onClick={onToggle}
      className="hover:bg-md-sys-color-primary/[0.04] flex w-full items-center justify-between px-6 py-4 transition-colors"
    >
      <div className="flex items-center gap-3">
        <h3 className="font-display text-xl font-bold text-md-sys-color-on-surface">{title}</h3>
        <span className="rounded-full bg-md-sys-color-primary-container px-2 py-0.5 text-xs font-medium text-md-sys-color-on-primary-container">
          {count}
        </span>
      </div>
      <ChevronDown
        className={`h-5 w-5 text-md-sys-color-on-surface-variant transition-transform duration-200 ${
          isOpen ? 'rotate-180' : ''
        }`}
      />
    </button>
    <div
      className={`grid transition-all duration-200 ease-in-out ${
        isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      }`}
    >
      <div className="overflow-hidden">
        <div className="grid grid-cols-1 gap-4 p-4 pb-8 sm:grid-cols-2 lg:grid-cols-3">
          {children}
        </div>
      </div>
    </div>
  </div>
)

export const RecipeLibrary = ({
  recipes,
  onSelectRecipe,
  onToggleThisWeek,
  sort,
  isSelectionMode,
  selectedIds,
}) => {
  const [openGroups, setOpenGroups] = useState({})

  const toggleGroup = (groupName) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }))
  }

  const groupedRecipes = useMemo(() => {
    const groups = {}

    recipes.forEach((recipe) => {
      let groupKey = 'Other'

      if (sort === 'protein') {
        groupKey = recipe.protein || 'Uncategorized'
      } else if (sort === 'alpha') {
        groupKey = recipe.title ? recipe.title[0].toUpperCase() : '#'
      } else if (sort === 'recent') {
        groupKey = 'All Recipes'
      } else if (sort === 'time') {
        const totalMinutes = (recipe.prepTime || 0) + (recipe.cookTime || 0)
        if (totalMinutes <= 15) groupKey = '15 Min or Less'
        else if (totalMinutes <= 30) groupKey = '30 Min or Less'
        else if (totalMinutes <= 60) groupKey = 'Under 1 Hour'
        else groupKey = 'Over 1 Hour'
      }

      if (!groups[groupKey]) groups[groupKey] = []
      groups[groupKey].push(recipe)
    })

    // Sort group keys if needed
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (sort === 'protein') {
        const order = [
          'Chicken',
          'Beef',
          'Pork',
          'Fish',
          'Seafood',
          'Vegetarian',
          'Vegan',
          'Uncategorized',
          'Other',
        ]
        const idxA = order.indexOf(a)
        const idxB = order.indexOf(b)
        if (idxA !== -1 && idxB !== -1) return idxA - idxB
        if (idxA !== -1) return -1
        if (idxB !== -1) return 1
        return a.localeCompare(b)
      }
      return a.localeCompare(b)
    })
    return { groups, sortedKeys }
  }, [recipes, sort])

  React.useEffect(() => {
    if (Object.keys(openGroups).length === 0 && groupedRecipes.sortedKeys.length > 0) {
      const allOpen = {}
      groupedRecipes.sortedKeys.forEach((key) => {
        allOpen[key] = true
      })
      setOpenGroups(allOpen)
    }
  }, [groupedRecipes.sortedKeys, openGroups])

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
          title={key}
          count={groupedRecipes.groups[key].length}
          isOpen={!!openGroups[key]}
          onToggle={() => toggleGroup(key)}
        >
          {groupedRecipes.groups[key].map((recipe) => (
            <LibraryRecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={() => onSelectRecipe(recipe)}
              onToggleThisWeek={onToggleThisWeek}
              data-testid={`recipe-card-${recipe.id}`}
              isSelectionMode={isSelectionMode}
              isSelected={selectedIds?.has(recipe.id)}
            />
          ))}
        </AccordionGroup>
      ))}
    </div>
  )
}

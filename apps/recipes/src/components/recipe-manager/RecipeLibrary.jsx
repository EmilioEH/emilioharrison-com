import React, { useState, useMemo } from 'react'
import { Clock, Users, ChefHat, ChevronDown } from 'lucide-react'

const LibraryRecipeCard = ({ recipe, onClick, 'data-testid': testId }) => (
  <button
    onClick={onClick}
    data-testid={testId}
    className="group relative flex w-full flex-col overflow-hidden rounded-md-l border border-md-sys-color-outline bg-md-sys-color-surface text-left shadow-md-1 transition-all hover:shadow-md-2"
  >
    {recipe.sourceImage && (
      <div className="h-32 w-full overflow-hidden border-b border-md-sys-color-outline">
        <img
          src={recipe.sourceImage}
          alt={recipe.title}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
      </div>
    )}
    <div className="p-4">
      <div className="mb-2">
        {recipe.protein && (
          <span className="mb-1 inline-block rounded-md-full bg-md-sys-color-secondary-container px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-md-sys-color-on-secondary-container">
            {recipe.protein}
          </span>
        )}
        <h3 className="line-clamp-2 font-display text-lg font-bold leading-tight text-md-sys-color-on-surface">
          {recipe.title}
        </h3>
      </div>

      <div className="mt-auto flex gap-3 text-xs font-medium text-md-sys-color-on-surface-variant">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{recipe.cookTime + recipe.prepTime}m</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          <span>{recipe.servings}</span>
        </div>
      </div>
    </div>
  </button>
)

const AccordionGroup = ({ title, count, children, isOpen, onToggle }) => (
  <div className="border-b border-md-sys-color-outline last:border-0">
    <button
      onClick={onToggle}
      className="flex w-full items-center justify-between px-6 py-4 transition-colors hover:bg-md-sys-color-primary/[0.04]"
    >
      <div className="flex items-center gap-3">
        <h3 className="font-display text-xl font-bold text-md-sys-color-on-surface">{title}</h3>
        <span className="rounded-md-full bg-md-sys-color-primary-container px-2 py-0.5 text-xs font-medium text-md-sys-color-on-primary-container">
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
        <div className="grid grid-cols-2 gap-4 p-4 pb-8">{children}</div>
      </div>
    </div>
  </div>
)

export const RecipeLibrary = ({ recipes, onSelectRecipe, sort }) => {
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

  // Effect to open the first group by default if none are open
  React.useEffect(() => {
    if (Object.keys(openGroups).length === 0 && groupedRecipes.sortedKeys.length > 0) {
      setOpenGroups({ [groupedRecipes.sortedKeys[0]]: true })
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
              data-testid={`recipe-card-${recipe.id}`}
            />
          ))}
        </AccordionGroup>
      ))}
    </div>
  )
}

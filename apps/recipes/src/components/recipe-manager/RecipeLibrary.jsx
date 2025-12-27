import React, { useState, useMemo } from 'react'
import { Clock, Users, ChefHat, ChevronDown, Calendar, Star, Heart, Check } from 'lucide-react'
import { getCurrentWeekDays } from '../../lib/date-helpers'

const LibraryRecipeCard = ({
  recipe,
  onClick,
  onToggleThisWeek,
  'data-testid': testId,
  isSelectionMode,
  isSelected,
  onAssignDay,
  weekDays,
}) => (
  <div
    data-testid={testId}
    className={`group relative flex w-full flex-col overflow-hidden rounded-xl border bg-md-sys-color-surface text-left transition-all ${
      recipe.thisWeek
        ? 'border-md-sys-color-primary shadow-md-2'
        : 'border-md-sys-color-outline shadow-md-1 hover:shadow-md-2'
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
      {(recipe.finishedImage || recipe.sourceImage) && (
        <div className="h-32 w-full overflow-hidden border-b border-md-sys-color-outline">
          <img
            src={recipe.finishedImage || recipe.sourceImage}
            alt={recipe.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        {/* Supporting Metadata - Top */}
        <div className="mb-3 flex flex-wrap items-start gap-2">
          {recipe.protein && (
            <span className="rounded-full bg-md-sys-color-secondary-container px-3 py-1 text-xs font-medium uppercase tracking-wide text-md-sys-color-on-secondary-container">
              {recipe.protein}
            </span>
          )}
          {recipe.thisWeek && (
            <span className="inline-flex items-center gap-2 rounded-full bg-md-sys-color-primary-container px-3 py-1 text-xs font-semibold uppercase tracking-wide text-md-sys-color-on-primary-container">
              <Calendar className="h-3.5 w-3.5" />
              <span>This Week</span>
            </span>
          )}
        </div>

        {/* Primary Content - Title */}
        <h3 className="mb-4 line-clamp-2 font-display text-lg font-bold leading-tight text-md-sys-color-on-surface">
          {recipe.title}
        </h3>

        {/* Secondary Metadata - Bottom */}
        <div className="mt-auto flex items-center gap-3 text-xs font-medium text-md-sys-color-on-surface-variant">
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
          : 'bg-md-sys-color-surface-variant/80 text-md-sys-color-on-surface-variant backdrop-blur-sm hover:bg-md-sys-color-secondary-container hover:text-md-sys-color-on-secondary-container'
      }`}
      title={recipe.thisWeek ? 'Remove from This Week' : 'Add to This Week'}
    >
      <Calendar className="h-4 w-4" />
    </button>

    {/* Day Assignment Selection */}
    {onAssignDay && weekDays && weekDays.length > 0 && (
      <div className="bg-md-sys-color-surface-variant/30 border-t border-md-sys-color-outline p-2">
        <select
          value={recipe.assignedDate || ''}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation()
            onAssignDay(recipe, e.target.value)
          }}
          className="w-full rounded border border-md-sys-color-outline bg-white p-1 text-xs"
        >
          <option value="">Move to...</option>
          {weekDays.map((day) => (
            <option key={day.date} value={day.date}>
              {day.displayLabel}
            </option>
          ))}
        </select>
      </div>
    )}
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
  onAssignDay,
}) => {
  const [openGroups, setOpenGroups] = useState({})

  const weekDays = useMemo(() => getCurrentWeekDays(), [])

  const toggleGroup = (groupName) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }))
  }

  const groupedRecipes = useMemo(() => {
    const groups = {}

    // Default Groups for Week View
    if (sort === 'week-day') {
      weekDays.forEach((d) => {
        groups[d.date] = []
      })
      groups['Unassigned'] = []
    }

    recipes.forEach((recipe) => {
      let groupKey = 'Other'

      if (sort === 'protein') {
        groupKey = recipe.protein || 'Uncategorized'
      } else if (sort === 'mealType') {
        groupKey = recipe.mealType || 'Other'
      } else if (sort === 'dishType') {
        groupKey = recipe.dishType || 'Other'
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
      } else if (sort === 'week-day') {
        // Check if assignedDate aligns with current week
        const isValidDate = recipe.assignedDate && groups[recipe.assignedDate]
        groupKey = isValidDate ? recipe.assignedDate : 'Unassigned'
      }

      if (!groups[groupKey]) groups[groupKey] = []
      groups[groupKey].push(recipe)
    })

    // Sort group keys
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (sort === 'week-day') {
        // Unassigned first, then dates
        if (a === 'Unassigned') return -1
        if (b === 'Unassigned') return 1
        return a.localeCompare(b)
      }
      if (sort === 'protein') {
        const order = ['Chicken', 'Beef', 'Pork', 'Fish', 'Seafood', 'Vegetarian', 'Vegan', 'Other']
        // Handle unknown keys (put them at end)
        const aIdx = order.indexOf(a)
        const bIdx = order.indexOf(b)
        if (aIdx === -1 && bIdx === -1) return a.localeCompare(b)
        if (aIdx === -1) return 1
        if (bIdx === -1) return -1
        return aIdx - bIdx
      }
      if (sort === 'mealType') {
        const order = ['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Snack', 'Dessert']
        // Handle unknown keys (put them at end)
        const aIdx = order.indexOf(a)
        const bIdx = order.indexOf(b)
        if (aIdx === -1 && bIdx === -1) return a.localeCompare(b)
        if (aIdx === -1) return 1
        if (bIdx === -1) return -1
        return aIdx - bIdx
      }
      if (sort === 'dishType') {
        const order = ['Main', 'Side', 'Appetizer', 'Salad', 'Soup', 'Drink', 'Sauce']
        const aIdx = order.indexOf(a)
        const bIdx = order.indexOf(b)
        if (aIdx === -1 && bIdx === -1) return a.localeCompare(b)
        if (aIdx === -1) return 1
        if (bIdx === -1) return -1
        return aIdx - bIdx
      }
      if (sort === 'time' || sort === 'recent') {
        // No specific order, just alphabetical for these groups
        return a.localeCompare(b)
      }
      return a.localeCompare(b)
    })
    return { groups, sortedKeys }
  }, [recipes, sort, weekDays])

  React.useEffect(() => {
    if (Object.keys(openGroups).length === 0 && groupedRecipes.sortedKeys.length > 0) {
      const allOpen = {}
      groupedRecipes.sortedKeys.forEach((key) => {
        allOpen[key] = true
      })
      setOpenGroups(allOpen)
    }
  }, [groupedRecipes.sortedKeys, openGroups])

  const getGroupTitle = (key) => {
    if (sort === 'week-day') {
      if (key === 'Unassigned') return 'To Plan'
      const d = weekDays.find((wd) => wd.date === key)
      return d ? d.displayLabel : key
    }
    return key
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
              onAssignDay={onAssignDay}
              weekDays={sort === 'week-day' ? weekDays : null}
            />
          ))}
        </AccordionGroup>
      ))}
    </div>
  )
}

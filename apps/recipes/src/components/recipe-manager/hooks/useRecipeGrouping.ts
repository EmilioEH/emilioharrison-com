import { useMemo } from 'react'
import { format, addDays, parseISO } from 'date-fns'
import { useStore } from '@nanostores/react'
import { weekState, currentWeekRecipes } from '../../../lib/weekStore'
import type { Recipe } from '../../../lib/types'

// Predefined sort orders for grouping
const SORT_ORDERS: Record<string, string[]> = {
  protein: ['Chicken', 'Beef', 'Pork', 'Fish', 'Seafood', 'Vegetarian', 'Vegan', 'Other'],
  mealType: ['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Snack', 'Dessert'],
  dishType: ['Main', 'Side', 'Appetizer', 'Salad', 'Soup', 'Drink', 'Sauce'],
  'cost-low': ['Under $10', '$10 - $20', 'Over $20', 'Unknown'],
  'cost-high': ['Over $20', '$10 - $20', 'Under $10', 'Unknown'],
}

// Helper: Sort groups by predefined order or alphabetically
const sortByPredefinedOrder = (a: string, b: string, order?: string[]): number => {
  if (!order) return a.localeCompare(b)
  const aIdx = order.indexOf(a)
  const bIdx = order.indexOf(b)
  if (aIdx === -1 && bIdx === -1) return a.localeCompare(b)
  if (aIdx === -1) return 1
  if (bIdx === -1) return -1
  return aIdx - bIdx
}

// Individual grouping strategies for each sort type
type GroupKeyResolver = (recipe: Recipe, groups: Record<string, Recipe[]>) => string

const groupByProtein: GroupKeyResolver = (recipe) => recipe.protein || 'Uncategorized'
const groupByMealType: GroupKeyResolver = (recipe) => recipe.mealType || 'Other'
const groupByDishType: GroupKeyResolver = (recipe) => recipe.dishType || 'Other'
const groupByAlpha: GroupKeyResolver = (recipe) =>
  recipe.title ? recipe.title[0].toUpperCase() : '#'
const groupByRecent: GroupKeyResolver = () => 'All Recipes'

const groupByTime: GroupKeyResolver = (recipe) => {
  const totalMinutes = (recipe.prepTime || 0) + (recipe.cookTime || 0)
  if (totalMinutes <= 15) return '15 Min or Less'
  if (totalMinutes <= 30) return '30 Min or Less'
  if (totalMinutes <= 60) return 'Under 1 Hour'
  return 'Over 1 Hour'
}

const groupByCost: GroupKeyResolver = (recipe) => {
  const cost = recipe.estimatedCost
  if (cost === undefined || cost === null) return 'Unknown'
  if (cost < 10) return 'Under $10'
  if (cost < 20) return '$10 - $20'
  return 'Over $20'
}

// Lookup table for group key resolvers
const GROUP_KEY_RESOLVERS: Record<string, GroupKeyResolver> = {
  protein: groupByProtein,
  mealType: groupByMealType,
  dishType: groupByDishType,
  alpha: groupByAlpha,
  recent: groupByRecent,
  time: groupByTime,

  'cost-low': groupByCost,
  'cost-high': groupByCost,
}

// Updated Helper: Returns ARRAY of keys
const getGroupKeys = (
  recipe: Recipe,
  sort: string,
  groups: Record<string, Recipe[]>,
  weekRecipes?: { recipeId: string; date: string }[],
): string[] => {
  if (sort === 'week-day') {
    if (!weekRecipes) return ['Unassigned']
    const planned = weekRecipes.filter((p) => p.recipeId === recipe.id)
    if (planned.length === 0) return ['Unassigned']
    // Return all dates this recipe is scheduled for
    return planned.map((p) => p.date)
  }

  // Generic single-key resolvers
  const resolver = GROUP_KEY_RESOLVERS[sort]
  return [resolver ? resolver(recipe, groups) : 'Other']
}

export function useRecipeGrouping(recipes: Recipe[], sort: string) {
  const { activeWeekStart } = useStore(weekState)
  const activeWeekPlanned = useStore(currentWeekRecipes)

  const weekDays = useMemo(() => {
    const start = parseISO(activeWeekStart)
    return Array.from({ length: 7 }).map((_, i) => {
      const date = addDays(start, i)
      return {
        date: format(date, 'yyyy-MM-dd'),
        displayLabel: format(date, 'EEEE'), // Monday
        shortLabel: format(date, 'EEE'), // Mon
        dayOfMonth: format(date, 'd'), // 24
      }
    })
  }, [activeWeekStart])

  const groupedRecipes = useMemo(() => {
    const groups: Record<string, Recipe[]> = {}

    // Default Groups for Week View
    if (sort === 'week-day') {
      weekDays.forEach((d) => {
        groups[d.date] = []
      })
      groups['Unassigned'] = []
    }

    recipes.forEach((recipe) => {
      const groupKeys = getGroupKeys(recipe, sort, groups, activeWeekPlanned)

      groupKeys.forEach((key) => {
        // Verify key exists (important for week days)
        if (sort === 'week-day' && key !== 'Unassigned' && !groups[key]) {
          // This handles edge case where recipe might be planned for a day NOT in the current view
          // (though activeWeekPlanned shouldn't allow that normally)
          return
        }
        if (!groups[key]) groups[key] = []

        // Avoid duplicates if logic returns same key twice? (Set logic handled upstream usually, but here is explicit list)
        groups[key].push(recipe)
      })
    })

    // Sort group keys using helper and predefined orders
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      // Special case: week-day has "Unassigned" first
      if (sort === 'week-day') {
        if (a === 'Unassigned') return 1
        if (b === 'Unassigned') return -1

        return a.localeCompare(b)
      }
      // "Unassigned" at bottom
      if (a === 'Unassigned') return 1
      if (b === 'Unassigned') return -1

      // Use predefined order if available, otherwise alphabetical
      return sortByPredefinedOrder(a, b, SORT_ORDERS[sort])
    })

    // Filter empty groups?
    // For week view, we likely want to KEEP empty days visible.
    // For others, maybe filter?
    // Current logic keeps them.

    return { groups, sortedKeys }
  }, [recipes, sort, weekDays, activeWeekPlanned])

  const getGroupTitle = (key: string) => {
    if (sort === 'week-day') {
      if (key === 'Unassigned') return 'Unschduled'
      const d = weekDays.find((wd) => wd.date === key)
      return d ? `${d.displayLabel} (${d.dayOfMonth})` : key
    }
    return key
  }

  return { groupedRecipes, getGroupTitle, weekDays }
}

import { useMemo } from 'react'
import { getCurrentWeekDays } from '../../../lib/date-helpers'
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

// Helper to determine the group key for a recipe based on sort strategy
const getGroupKey = (recipe: Recipe, sort: string, groups: Record<string, Recipe[]>): string => {
  if (sort === 'protein') {
    return recipe.protein || 'Uncategorized'
  }
  if (sort === 'mealType') {
    return recipe.mealType || 'Other'
  }
  if (sort === 'dishType') {
    return recipe.dishType || 'Other'
  }
  if (sort === 'alpha') {
    return recipe.title ? recipe.title[0].toUpperCase() : '#'
  }
  if (sort === 'recent') {
    return 'All Recipes'
  }
  if (sort === 'time') {
    const totalMinutes = (recipe.prepTime || 0) + (recipe.cookTime || 0)
    if (totalMinutes <= 15) return '15 Min or Less'
    if (totalMinutes <= 30) return '30 Min or Less'
    if (totalMinutes <= 60) return 'Under 1 Hour'
    return 'Over 1 Hour'
  }
  if (sort === 'week-day') {
    // Check if assignedDate aligns with current week
    const isValidDate = recipe.assignedDate && groups[recipe.assignedDate]
    return isValidDate && recipe.assignedDate ? recipe.assignedDate : 'Unassigned'
  }
  if (sort === 'cost-low' || sort === 'cost-high') {
    const cost = recipe.estimatedCost
    if (cost === undefined || cost === null) return 'Unknown'
    if (cost < 10) return 'Under $10'
    if (cost < 20) return '$10 - $20'
    return 'Over $20'
  }
  return 'Other'
}

export function useRecipeGrouping(recipes: Recipe[], sort: string) {
  const weekDays = useMemo(() => getCurrentWeekDays(), [])

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
      const groupKey = getGroupKey(recipe, sort, groups)
      if (!groups[groupKey]) groups[groupKey] = []
      groups[groupKey].push(recipe)
    })

    // Sort group keys using helper and predefined orders
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      // Special case: week-day has "Unassigned" first
      if (sort === 'week-day') {
        if (a === 'Unassigned') return -1
        if (b === 'Unassigned') return 1
        return a.localeCompare(b)
      }
      // Use predefined order if available, otherwise alphabetical
      return sortByPredefinedOrder(a, b, SORT_ORDERS[sort])
    })
    return { groups, sortedKeys }
  }, [recipes, sort, weekDays])

  const getGroupTitle = (key: string) => {
    if (sort === 'week-day') {
      if (key === 'Unassigned') return 'To Plan'
      const d = weekDays.find((wd) => wd.date === key)
      return d ? d.displayLabel : key
    }
    return key
  }

  return { groupedRecipes, getGroupTitle, weekDays }
}

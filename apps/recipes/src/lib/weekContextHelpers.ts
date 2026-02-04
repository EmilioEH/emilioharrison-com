import { parseISO, isToday, isTomorrow, differenceInMinutes, format } from 'date-fns'
import type { PlannedRecipe } from './weekStore'
import type { Recipe } from './types'

/**
 * Default meal times when not specified by user (in HH:mm format)
 */
export const DEFAULT_MEAL_TIMES = {
  breakfast: '08:00',
  lunch: '12:00',
  dinner: '18:00',
} as const

/**
 * Default cooking mode threshold in minutes
 * Switch to cooking mode this many minutes before the meal
 */
export const DEFAULT_COOKING_THRESHOLD = 120 // 2 hours

/**
 * Cooking mode context type
 */
export type ContextMode = 'planning' | 'pre-cooking' | 'cooking'

/**
 * Next meal information
 */
export interface NextMealInfo {
  plannedRecipe: PlannedRecipe
  recipe: Recipe
  dateTime: Date
  minutesUntil: number
  isToday: boolean
  isTomorrow: boolean
  mode: ContextMode
}

/**
 * Get the default meal time based on meal type
 */
function getDefaultMealTime(mealType?: 'breakfast' | 'lunch' | 'dinner'): string {
  if (!mealType) return DEFAULT_MEAL_TIMES.dinner
  return DEFAULT_MEAL_TIMES[mealType]
}

/**
 * Parse a date and time string into a Date object
 * @param date YYYY-MM-DD format
 * @param time HH:mm format (optional, defaults based on mealType)
 * @param mealType Used to determine default time if time is not specified
 */
function parseMealDateTime(
  date: string,
  time?: string,
  mealType?: 'breakfast' | 'lunch' | 'dinner',
): Date {
  const dateObj = parseISO(date)
  const timeStr = time || getDefaultMealTime(mealType)
  const [hours, minutes] = timeStr.split(':').map(Number)
  dateObj.setHours(hours, minutes, 0, 0)
  return dateObj
}

/**
 * Get the next upcoming meal from a list of planned recipes
 * Returns null if no upcoming meals found
 */
export function getNextUpcomingMeal(
  plannedRecipes: PlannedRecipe[],
  allRecipes: Recipe[],
  cookingThreshold = DEFAULT_COOKING_THRESHOLD,
): NextMealInfo | null {
  const now = new Date()
  const upcomingMeals: NextMealInfo[] = []

  // Build list of all upcoming meals with their datetime
  plannedRecipes.forEach((planned) => {
    const recipe = allRecipes.find((r) => r.id === planned.recipeId)
    if (!recipe) return

    const mealDateTime = parseMealDateTime(planned.date, planned.mealTime, planned.mealType)
    const minutesUntil = differenceInMinutes(mealDateTime, now)

    // Only include future meals
    if (minutesUntil > 0) {
      upcomingMeals.push({
        plannedRecipe: planned,
        recipe,
        dateTime: mealDateTime,
        minutesUntil,
        isToday: isToday(mealDateTime),
        isTomorrow: isTomorrow(mealDateTime),
        mode: 'planning',
      })
    }
  })

  // Sort by datetime (earliest first)
  upcomingMeals.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime())

  // Get the next meal
  const nextMeal = upcomingMeals[0]
  if (!nextMeal) return null

  // Determine mode based on time until meal
  // Cooking mode: within 60 min of meal
  // Pre-cooking mode: between 60 min and cookingThreshold
  const preCookingStart = Math.max(cookingThreshold, 60)
  if (nextMeal.minutesUntil <= 60) {
    nextMeal.mode = 'cooking' // Less than 1 hour
  } else if (nextMeal.minutesUntil <= preCookingStart) {
    nextMeal.mode = 'pre-cooking' // 1-2 hours before (or up to threshold)
  }

  return nextMeal
}

/**
 * Format time remaining until meal in human-readable format
 * Examples: "in 2h 30m", "in 45m", "in 15m"
 */
export function formatTimeUntilMeal(minutes: number): string {
  if (minutes < 0) return 'now'

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours > 0 && mins > 0) {
    return `in ${hours}h ${mins}m`
  } else if (hours > 0) {
    return `in ${hours}h`
  } else {
    return `in ${mins}m`
  }
}

/**
 * Format meal time for display
 * Examples: "Tonight (6:00 PM)", "Tomorrow (12:00 PM)", "Wednesday (8:00 AM)"
 */
export function formatMealLabel(mealInfo: NextMealInfo): string {
  const timeStr = format(mealInfo.dateTime, 'h:mm a')

  if (mealInfo.isToday) {
    // Determine if it's breakfast, lunch, or dinner time
    const hour = mealInfo.dateTime.getHours()
    if (hour < 11) {
      return `Breakfast (${timeStr})`
    } else if (hour < 16) {
      return `Lunch (${timeStr})`
    } else {
      return `Tonight (${timeStr})`
    }
  } else if (mealInfo.isTomorrow) {
    return `Tomorrow (${timeStr})`
  } else {
    const dayName = format(mealInfo.dateTime, 'EEEE')
    return `${dayName} (${timeStr})`
  }
}

/**
 * Get contextual label for today's day name (e.g., "Tonight" vs "Today")
 */
export function getTodayLabel(hour: number): string {
  if (hour < 11) {
    return 'This morning'
  } else if (hour < 16) {
    return 'Today'
  } else {
    return 'Tonight'
  }
}

/**
 * Determine overall context mode based on next meal
 * Used to decide what content to show in small/medium states
 */
export function getContextMode(nextMeal: NextMealInfo | null): ContextMode {
  if (!nextMeal) return 'planning'
  return nextMeal.mode
}

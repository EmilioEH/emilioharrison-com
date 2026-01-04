import { computed } from 'nanostores'
import { persistentMap } from '@nanostores/persistent'
import { startOfWeek, addWeeks, format, parseISO, addDays } from 'date-fns'

// --- Types ---

export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday'

export interface PlannedRecipe {
  recipeId: string
  day: DayOfWeek
  date: string // YYYY-MM-DD
  weekStart: string // YYYY-MM-DD (Monday)
  mealType?: string // Optional: Breakfast, Lunch, Dinner
}

export type WeekState = Record<string, string> & {
  activeWeekStart: string // ISO Date of Monday for the currently viewed week
}

// --- Constants ---

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

// --- Store ---

// Persist the active week view (defaults to current week)
// using a map to allow for potential future expansion of view settings
export const weekState = persistentMap<WeekState>('weekState', {
  activeWeekStart: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
})

// Persist planned recipes
// Key: "recipeId_date" -> Value: JSON string of PlannedRecipe
// We use a flat map for easier persistence, and computed stores to group by week
export const plannedRecipesStore = persistentMap<Record<string, string | undefined>>(
  'plannedRecipes',
  {},
)

// --- Computed Helpers ---

// Get all planned recipes as objects
export const allPlannedRecipes = computed(plannedRecipesStore, (recipes) => {
  return Object.values(recipes)
    .filter((r): r is string => typeof r === 'string')
    .map((r) => JSON.parse(r) as PlannedRecipe)
})

// Get recipes for the currently active week
export const currentWeekRecipes = computed([weekState, allPlannedRecipes], (state, recipes) => {
  return recipes.filter((r) => r.weekStart === state.activeWeekStart)
})

// Get distinct weeks (for the calendar picker)
export const distinctWeeks = computed(allPlannedRecipes, (recipes) => {
  const weeks = new Set<string>()
  // Always include this week and next week
  const thisWeek = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const nextWeek = format(addWeeks(new Date(thisWeek), 1), 'yyyy-MM-dd')
  weeks.add(thisWeek)
  weeks.add(nextWeek)

  // Add any other weeks with planned meals
  recipes.forEach((r) => weeks.add(r.weekStart))

  return Array.from(weeks).sort()
})

// --- Actions ---

/**
 * Switch the active week context
 * @param date optional date to switch to (defaults to current week)
 */
export const switchWeekContext = (date?: Date | string) => {
  const d = date ? (typeof date === 'string' ? parseISO(date) : date) : new Date()
  const monday = startOfWeek(d, { weekStartsOn: 1 })
  weekState.setKey('activeWeekStart', format(monday, 'yyyy-MM-dd'))
}

/**
 * Add a recipe to a specific day in the CURRENTLY ACTIVE week
 */
export const addRecipeToDay = (recipeId: string, day: DayOfWeek) => {
  const activeStart = weekState.get().activeWeekStart
  const dateOfStart = parseISO(activeStart)
  const dayIndex = DAYS_OF_WEEK.indexOf(day)
  const targetDate = addDays(dateOfStart, dayIndex)
  const dateStr = format(targetDate, 'yyyy-MM-dd')

  const newPlan: PlannedRecipe = {
    recipeId,
    day,
    date: dateStr,
    weekStart: activeStart,
  }

  // Key format: "recipeId_date" to allow same recipe on multiple days,
  // but only once per day per recipe
  const key = `${recipeId}_${dateStr}`

  plannedRecipesStore.setKey(key, JSON.stringify(newPlan))
}

/**
 * Remove a recipe from a specific day
 */
export const removeRecipeFromDay = (recipeId: string, date: string) => {
  const key = `${recipeId}_${date}`
  plannedRecipesStore.setKey(key, undefined)
  // Actually for persistentMap, setting to undefined might not clear the key from storage depending on implementation.
  // Let's use the provided way if possible, or just standard map manipulation.
  // nanostores/persistent doesn't strictly support 'delete' in the setKey signature purely,
  // but setting to undefined usually signals removal in many stores.
  // Checks documentation: persistentMap doesn't delete keys easily.
  // Workaround: We might need to copy, delete, and setAll if we want to truly remove,
  // OR just filter them out in the computed.
  // For now, let's assume setting to 'null' or empty string and filtering is safer if delete isn't supported.
  // Wait, standard map.setKey(key, undefined) works in nanostores to delete.
  plannedRecipesStore.setKey(key, undefined!)
}

/**
 * Remove all planned instances of a recipe
 */
export const unplanRecipe = (recipeId: string) => {
  const current = plannedRecipesStore.get()
  const updates: Record<string, undefined> = {}

  Object.entries(current).forEach(([key]) => {
    if (key.startsWith(`${recipeId}_`)) {
      updates[key] = undefined
    }
  })

  if (Object.keys(updates).length > 0) {
    // Batch update if possible, or loop
    Object.keys(updates).forEach((k) => plannedRecipesStore.setKey(k, undefined!))
  }
}

/**
 * Check if a recipe is planned for the active week
 */
export const isPlannedForActiveWeek = (recipeId: string, days?: DayOfWeek[]) => {
  const active = currentWeekRecipes.get()
  const planned = active.filter((p) => p.recipeId === recipeId)

  if (days) {
    return planned.some((p) => days.includes(p.day))
  }

  return planned.length > 0
}

/**
 * Get the planned days for a recipe in the active week
 */
export const getPlannedDays = (recipeId: string) => {
  const active = currentWeekRecipes.get()
  return active.filter((p) => p.recipeId === recipeId).map((p) => p.day)
}

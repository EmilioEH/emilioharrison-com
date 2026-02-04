import { computed } from 'nanostores'
import { persistentMap } from '@nanostores/persistent'
import { startOfWeek, addWeeks, format, parseISO, addDays } from 'date-fns'
import { $recipeFamilyData, familyActions } from './familyStore'

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
  mealType?: 'breakfast' | 'lunch' | 'dinner'
  mealTime?: string // HH:mm format (e.g., "18:00" for 6pm)
  addedBy?: string
  addedByName?: string
}

type WeekState = Record<string, string> & {
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
export const weekState = persistentMap<WeekState>('weekState', {
  activeWeekStart: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
})

// --- Computed Helpers ---

// Get all planned recipes derived from the family data store
export const allPlannedRecipes = computed($recipeFamilyData, (familyData) => {
  const planned: PlannedRecipe[] = []

  Object.values(familyData).forEach((data) => {
    if (data.weekPlan?.isPlanned && data.weekPlan.assignedDate) {
      const date = parseISO(data.weekPlan.assignedDate)
      const weekStart = startOfWeek(date, { weekStartsOn: 1 })
      const dayIndex = (date.getDay() + 6) % 7 // Monday = 0

      planned.push({
        recipeId: data.id,
        day: DAYS_OF_WEEK[dayIndex],
        date: data.weekPlan.assignedDate,
        weekStart: format(weekStart, 'yyyy-MM-dd'),
        mealType: data.weekPlan.mealType,
        mealTime: data.weekPlan.mealTime,
        addedBy: data.weekPlan.addedBy,
        addedByName: data.weekPlan.addedByName,
      })
    }
  })

  return planned
})

// Get recipes for the currently active week
// Get recipes for the currently active week
export const currentWeekRecipes = computed([weekState, allPlannedRecipes], (state, recipes) => {
  // Robust check: re-calculate week start from date to avoid missing property issues
  return recipes.filter((r) => {
    // Primary check: precise property match
    if (r.weekStart === state.activeWeekStart) return true

    // Fallback check: derived from date (handles missing property or trim issues)
    if (r.date && state.activeWeekStart) {
      try {
        const date = parseISO(r.date)
        const derivedStart = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
        return derivedStart === state.activeWeekStart
      } catch {
        return false
      }
    }
    return false
  })
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

// API Helper
const getBaseUrl = () => {
  return import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`
}

/**
 * Add a recipe to a specific day in the CURRENTLY ACTIVE week
 * @returns true if successful, false otherwise
 */
export const addRecipeToDay = async (recipeId: string, day: DayOfWeek): Promise<boolean> => {
  const activeStart = weekState.get().activeWeekStart
  const dateOfStart = parseISO(activeStart)
  const dayIndex = DAYS_OF_WEEK.indexOf(day)
  const targetDate = addDays(dateOfStart, dayIndex)
  const dateStr = format(targetDate, 'yyyy-MM-dd')

  // Call API
  try {
    const res = await fetch(`${getBaseUrl()}api/recipes/${recipeId}/week-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isPlanned: true,
        assignedDate: dateStr,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      try {
        const json = JSON.parse(text)
        console.error('Failed to add recipe to week:', json.error || `Server Error: ${res.status}`)
      } catch {
        console.error(
          'Failed to add recipe to week:',
          `Server Error (${res.status}): ${text.substring(0, 100)}`,
        )
      }
      return false
    }

    const data = await res.json()

    if (data.success && data.data) {
      familyActions.setRecipeFamilyData(recipeId, data.data)
      return true
    } else {
      console.warn('[WeekStore] API success but no data?', data)
      return false
    }
  } catch (error) {
    console.error('Failed to add recipe to week (details):', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
    }
    return false
  }
}

/**
 * Remove a recipe from a specific day
 */
export const removeRecipeFromDay = async (recipeId: string) => {
  try {
    const res = await fetch(`${getBaseUrl()}api/recipes/${recipeId}/week-plan`, {
      method: 'DELETE',
    })

    if (res.ok) {
      // Fetch fresh data or manually update store
      const resData = await fetch(`${getBaseUrl()}api/recipes/${recipeId}/family-data`)
      const data = await resData.json()
      if (data.success && data.data) {
        familyActions.setRecipeFamilyData(recipeId, data.data)
      }
    }
  } catch (error) {
    console.error('Failed to remove recipe from week:', error)
  }
}

/**
 * Remove all planned instances of a recipe
 */
export const unplanRecipe = async (recipeId: string) => {
  // Since backend only supports one instance, this is the same as removeRecipeFromDay logic
  // but we don't need the date. DELETE endpoint handles it.
  await removeRecipeFromDay(recipeId)
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

/**
 * Get all planned dates for a recipe across all weeks with formatted labels
 * Returns array of { day, label, dateStr, isCurrentWeek, isNextWeek }
 */
export const getPlannedDatesForRecipe = (recipeId: string) => {
  const today = new Date()
  const thisWeekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const nextWeekStart = format(addWeeks(parseISO(thisWeekStart), 1), 'yyyy-MM-dd')

  const allRecipes = allPlannedRecipes.get()
  const planned = allRecipes.filter((p) => p.recipeId === recipeId)

  return planned.map((p) => {
    const dayAbbrev = p.day.slice(0, 3) // Mon, Tue, etc.
    const isCurrentWeek = p.weekStart === thisWeekStart
    const isNextWeek = p.weekStart === nextWeekStart

    let label: string
    if (isCurrentWeek) {
      label = dayAbbrev // Just "Mon"
    } else if (isNextWeek) {
      label = `N: ${dayAbbrev}` // "N: Mon"
    } else {
      // Future week: show date like "Jan 20: Mon"
      const weekDate = parseISO(p.weekStart)
      label = `${format(weekDate, 'MMM d')}: ${dayAbbrev}`
    }

    return {
      day: p.day,
      label,
      dateStr: p.date,
      weekStart: p.weekStart,
      isCurrentWeek,
      isNextWeek,
      addedByName: p.addedByName,
    }
  })
}

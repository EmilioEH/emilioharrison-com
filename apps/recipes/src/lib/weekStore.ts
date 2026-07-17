import { atom, computed } from 'nanostores'
import { persistentMap } from '@nanostores/persistent'
import { startOfWeek, addWeeks, format, parseISO } from 'date-fns'
import { $recipeFamilyData, familyActions } from './familyStore'

// --- Types ---

export interface PlannedRecipe {
  recipeId: string
  date: string // YYYY-MM-DD (the week's Monday for new entries; legacy entries may carry a day-level date)
  weekStart: string // YYYY-MM-DD (Monday)
  addedBy?: string
  addedByName?: string
}

type WeekState = Record<string, string> & {
  activeWeekStart: string // ISO Date of Monday for the currently viewed week
}

// --- Store ---

// Persist the active week view (defaults to current week)
export const weekState = persistentMap<WeekState>('weekState', {
  activeWeekStart: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
})

/**
 * Signals that the grocery list for the stored week start needs regeneration.
 * Set to a week start string (e.g. "2026-05-25") when a recipe is added to that week.
 * Cleared by WeekWorkspace after triggering regeneration.
 */
export const $groceryNeedsRegen = atom<string | null>(null)

// On load, advance a stale stored week to the current week.
// The default value above only applies on first ever load; after that localStorage
// holds the previous value, so the planner would stay stuck in the past.
{
  const thisWeek = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  if (weekState.get().activeWeekStart < thisWeek) {
    weekState.setKey('activeWeekStart', thisWeek)
  }
}

// --- Computed Helpers ---

// Get all planned recipes derived from the family data store
export const allPlannedRecipes = computed($recipeFamilyData, (familyData) => {
  const planned: PlannedRecipe[] = []

  Object.values(familyData).forEach((data) => {
    if (data.weekPlan?.isPlanned && data.weekPlan.assignedDate) {
      const date = parseISO(data.weekPlan.assignedDate)
      const weekStart = startOfWeek(date, { weekStartsOn: 1 })

      planned.push({
        recipeId: data.id,
        date: data.weekPlan.assignedDate,
        weekStart: format(weekStart, 'yyyy-MM-dd'),
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
 * Add a recipe to the CURRENTLY ACTIVE week. There is no day-level assignment —
 * `assignedDate` is always the week's start (Monday), which keeps the existing
 * `currentWeekRecipes`/grocery pipeline (both keyed off the date's week) unchanged.
 * @returns true if successful, false otherwise
 */
export const addRecipeToWeek = async (recipeId: string): Promise<boolean> => {
  const activeStart = weekState.get().activeWeekStart
  const dateStr = activeStart

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
      // Signal that the grocery list for this week needs regeneration,
      // since a new recipe was added and the cached list is now stale.
      $groceryNeedsRegen.set(activeStart)
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
 * Remove a recipe from the week plan
 */
export const removeRecipeFromWeek = async (recipeId: string) => {
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
  // Since backend only supports one instance, this is the same as removeRecipeFromWeek logic
  // but we don't need the date. DELETE endpoint handles it.
  await removeRecipeFromWeek(recipeId)
}

/**
 * Check if a recipe is planned for the active week
 */
export const isPlannedForActiveWeek = (recipeId: string) => {
  const active = currentWeekRecipes.get()
  return active.some((p) => p.recipeId === recipeId)
}

/**
 * Get all planned weeks for a recipe with formatted labels
 * Returns array of { label, dateStr, weekStart, isCurrentWeek, isNextWeek, addedByName }
 */
export const getPlannedWeeksForRecipe = (recipeId: string) => {
  const today = new Date()
  const thisWeekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const nextWeekStart = format(addWeeks(parseISO(thisWeekStart), 1), 'yyyy-MM-dd')

  const allRecipes = allPlannedRecipes.get()
  const planned = allRecipes.filter((p) => p.recipeId === recipeId)

  return planned.map((p) => {
    const isCurrentWeek = p.weekStart === thisWeekStart
    const isNextWeek = p.weekStart === nextWeekStart

    let label: string
    if (isCurrentWeek) {
      label = 'This week'
    } else if (isNextWeek) {
      label = 'Next week'
    } else {
      // Future week: show the week's start date like "Jan 20"
      const weekDate = parseISO(p.weekStart)
      label = format(weekDate, 'MMM d')
    }

    return {
      label,
      dateStr: p.date,
      weekStart: p.weekStart,
      isCurrentWeek,
      isNextWeek,
      addedByName: p.addedByName,
    }
  })
}

import { atom, computed } from 'nanostores'
import { persistentMap } from '@nanostores/persistent'
import { startOfWeek, addWeeks, format, parseISO } from 'date-fns'
import { $recipeFamilyData, familyActions } from './familyStore'
import type { WeekPlanData } from './types'

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
 * True while one of the week's full screens (the review, the suggester) is open.
 *
 * It lives here rather than inside `WeekWorkspace` because the bottom tab bar is a sibling of the
 * whole workspace, several levels up in `RecipeManager`. The tab bar is `fixed z-50` and later in
 * the DOM than the overlay's `absolute z-50`, so it painted straight over a screen that is
 * supposed to have the viewport to itself — and one tap on it discarded a half-finished exchange.
 */
export const $weekOverlayOpen = atom<boolean>(false)

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
 * Write a recipe's week-plan state into the store straight away and hand back the undo.
 *
 * The store is the only thing the UI reads, so this is what makes a tap feel instant. The undo
 * restores the exact entry that was there — including "there was no entry at all" — rather than
 * guessing at an inverse, so a failed request leaves the store precisely as it started.
 */
function optimisticallySetPlan(recipeId: string, weekPlan: WeekPlanData): () => void {
  const before = $recipeFamilyData.get()[recipeId]

  familyActions.setRecipeFamilyData(recipeId, {
    // A recipe with no family data yet still needs the other fields to satisfy the shape; they
    // are replaced wholesale by the server's response the moment it arrives.
    ...{ id: recipeId, notes: [], ratings: [], cookingHistory: [] },
    ...before,
    weekPlan: { ...before?.weekPlan, ...weekPlan },
  })

  return () => {
    if (before) {
      familyActions.setRecipeFamilyData(recipeId, before)
    } else {
      familyActions.clearRecipeFamilyData(recipeId)
    }
  }
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

  // Show it as planned immediately, and put it back if the server disagrees.
  //
  // This used to wait for the round trip before anything moved, so tapping `+` did nothing
  // visible for as long as the request took — which on a phone is long enough to tap again, or
  // to conclude it didn't work. Every consumer reads the same store, so the card, the library
  // badge and the week count all flip together.
  const rollback = optimisticallySetPlan(recipeId, { isPlanned: true, assignedDate: dateStr })

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
      rollback()
      return false
    }

    const data = await res.json()

    if (data.success && data.data) {
      familyActions.setRecipeFamilyData(recipeId, data.data)
      // Nothing to flag: the grocery list records the recipes it was built from, so the week view
      // works out on its own that this week has changed. The old in-memory flag set here only
      // ever caught *additions*, and was gone after a reload.
      return true
    } else {
      console.warn('[WeekStore] API success but no data?', data)
      rollback()
      return false
    }
  } catch (error) {
    console.error('Failed to add recipe to week (details):', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
    }
    rollback()
    return false
  }
}

/**
 * Cook this recipe for a different number of people, this week.
 *
 * Written to the family's plan entry, never to the recipe — cooking for six this week must not
 * change the recipe for everyone forever. Passing `undefined` goes back to the recipe's own count.
 *
 * **Only for a recipe already on the plan.** The count is a property of the plan entry, so
 * writing one for an unplanned recipe would have to create that entry — and adding a recipe to
 * the week as a side effect of reading its ingredients at a different scale is not something
 * anyone asked for. Returns `false` without touching anything; the caller keeps the choice
 * locally instead.
 *
 * Optimistic like the other two, so the stepper moves on the tap. The grocery list notices on its
 * own: the count is part of the week's signature, so changing it makes the stored list stale.
 */
export const setWeekServings = async (
  recipeId: string,
  servings: number | undefined,
): Promise<boolean> => {
  const current = $recipeFamilyData.get()[recipeId]?.weekPlan
  if (!current?.isPlanned) return false

  const rollback = optimisticallySetPlan(recipeId, {
    isPlanned: true,
    assignedDate: current.assignedDate ?? weekState.get().activeWeekStart,
    servings,
  })

  try {
    const res = await fetch(`${getBaseUrl()}api/recipes/${recipeId}/week-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isPlanned: true,
        assignedDate: current.assignedDate ?? weekState.get().activeWeekStart,
        // `null` is how "back to the recipe's own count" is said on the wire; `undefined` would
        // simply be dropped by JSON.stringify and read as "don't change it".
        servings: servings ?? null,
      }),
    })

    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.success || !data.data) {
      rollback()
      return false
    }
    familyActions.setRecipeFamilyData(recipeId, data.data)
    return true
  } catch (error) {
    console.error('Failed to set servings for the week:', error)
    rollback()
    return false
  }
}

/** What this recipe is being cooked for this week, if the cook has said. */
export const weekServingsFor = (recipeId: string): number | undefined =>
  $recipeFamilyData.get()[recipeId]?.weekPlan?.servings

/**
 * Remove a recipe from the week plan. Optimistic in the same way as adding: the card and the
 * week count change on the tap, and go back if the server refuses.
 */
export const removeRecipeFromWeek = async (recipeId: string): Promise<boolean> => {
  const rollback = optimisticallySetPlan(recipeId, { isPlanned: false })

  try {
    const res = await fetch(`${getBaseUrl()}api/recipes/${recipeId}/week-plan`, {
      method: 'DELETE',
    })

    if (!res.ok) {
      rollback()
      return false
    }

    // Fetch fresh data or manually update store
    const resData = await fetch(`${getBaseUrl()}api/recipes/${recipeId}/family-data`)
    const data = await resData.json()
    if (data.success && data.data) {
      familyActions.setRecipeFamilyData(recipeId, data.data)
    }
    return true
  } catch (error) {
    console.error('Failed to remove recipe from week:', error)
    rollback()
    return false
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

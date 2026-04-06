import { persistentAtom } from '@nanostores/persistent'
import { computed } from 'nanostores'

/**
 * User preferences for week planner behavior
 */
export interface WeekPlannerPreferences {
  // Week transition: when to start showing "next week" instead of "this week"
  planNextWeekStartDay: 'thursday' | 'friday' | 'saturday' | 'sunday'

  // Default meal times (used when recipe doesn't have specific mealTime)
  defaultMealTimes: {
    breakfast: string // HH:mm format, e.g., "08:00"
    lunch: string // HH:mm format, e.g., "12:00"
    dinner: string // HH:mm format, e.g., "18:00"
  }

  // Cooking mode threshold: switch to cooking mode this many minutes before meal
  cookingModeThreshold: number // Default: 120 (2 hours)
}

/**
 * Default preferences
 */
export const DEFAULT_PREFERENCES: WeekPlannerPreferences = {
  planNextWeekStartDay: 'friday',
  defaultMealTimes: {
    breakfast: '08:00',
    lunch: '12:00',
    dinner: '18:00',
  },
  cookingModeThreshold: 120,
}

/**
 * User preferences store with localStorage persistence
 * Uses JSON encoding to handle nested objects
 */
const $userPreferencesRaw = persistentAtom<string>(
  'userPreferences',
  JSON.stringify(DEFAULT_PREFERENCES),
)

/**
 * Computed store that parses the JSON preferences
 */
export const $userPreferences = computed($userPreferencesRaw, (raw) => {
  try {
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) } as WeekPlannerPreferences
  } catch {
    return DEFAULT_PREFERENCES
  }
})

/**
 * Helper to update a single preference
 */
export const updatePreference = <K extends keyof WeekPlannerPreferences>(
  key: K,
  value: WeekPlannerPreferences[K],
) => {
  const current = $userPreferences.get()
  $userPreferencesRaw.set(JSON.stringify({ ...current, [key]: value }))
}

/**
 * Helper to reset to defaults
 */
export const resetPreferences = () => {
  $userPreferencesRaw.set(JSON.stringify(DEFAULT_PREFERENCES))
}

// ---------------------------------------------------------------------------
// H-E-B Store Preference
// ---------------------------------------------------------------------------

export interface HebStorePreference {
  storeId: string
  storeName: string
}

const $hebStoreRaw = persistentAtom<string>('hebStore', '')

export const $hebStore = computed($hebStoreRaw, (raw): HebStorePreference | null => {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed.storeId && parsed.storeName) return parsed as HebStorePreference
    return null
  } catch {
    return null
  }
})

export const setHebStore = (store: HebStorePreference | null) => {
  $hebStoreRaw.set(store ? JSON.stringify(store) : '')
}

/**
 * Get the day number for week transition setting
 * Returns: 0 = Sunday, 4 = Thursday, 5 = Friday, 6 = Saturday
 */
export const getWeekTransitionDayNumber = (
  day: WeekPlannerPreferences['planNextWeekStartDay'],
): number => {
  const dayMap = {
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 0,
  }
  return dayMap[day]
}

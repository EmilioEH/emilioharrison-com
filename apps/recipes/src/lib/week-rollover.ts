import { format, parseISO, addWeeks, isBefore } from 'date-fns'
import { plannedRecipesStore, type PlannedRecipe } from './weekStore'

// Standard ISO format
const DATE_FMT = 'yyyy-MM-dd'

export const checkAndRunRollover = async () => {
  if (typeof window === 'undefined') return // Client side only

  const today = new Date()

  const recipesMap = plannedRecipesStore.get()
  const allRecipes: PlannedRecipe[] = Object.values(recipesMap)
    .filter((r): r is string => typeof r === 'string')
    .map((r) => JSON.parse(r))

  // Group by week
  const recipesByWeek: Record<string, PlannedRecipe[]> = {}
  allRecipes.forEach((r) => {
    if (!recipesByWeek[r.weekStart]) {
      recipesByWeek[r.weekStart] = []
    }
    recipesByWeek[r.weekStart].push(r)
  })

  // Check each week
  for (const [weekStartStr, recipes] of Object.entries(recipesByWeek)) {
    const weekStart = parseISO(weekStartStr)
    const weekEnd = addWeeks(weekStart, 1) // Start of next week actually

    // If week ended before today (meaning today is Monday or later of next week)
    if (isBefore(weekEnd, today)) {
      console.log(`[Rollover] Archiving week ${weekStartStr}...`)

      try {
        // Call API
        const response = await fetch('/protected/recipes/api/week/archive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weekStart: weekStartStr,
            weekEnd: format(weekEnd, DATE_FMT),
            archivedAt: new Date().toISOString(),
            mealCount: recipes.length,
            recipes: recipes,
          }),
        })

        if (response.ok) {
          console.log(
            `[Rollover] Archived week ${weekStartStr} successfully. Cleaning up local data...`,
          )

          // Remove from store
          const updates: Record<string, undefined> = {}
          recipes.forEach((r) => {
            const key = `${r.recipeId}_${r.date}`
            updates[key] = undefined
          })
          Object.keys(updates).forEach((k) => plannedRecipesStore.setKey(k, undefined!))
        } else {
          console.error(`[Rollover] Server error archiving week ${weekStartStr}`)
        }
      } catch (error) {
        console.error(`[Rollover] Network failed to archive week ${weekStartStr}`, error)
      }
    }
  }
}

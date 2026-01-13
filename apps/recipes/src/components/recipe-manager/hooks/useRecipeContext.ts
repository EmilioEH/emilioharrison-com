import { useMemo } from 'react'
import type { Recipe } from '../../../lib/types'
import type { PlannedRecipe } from '../../../lib/weekStore'

export function useRecipeContext(
  recipes: Recipe[],
  view: string,
  activeRecipeId: string | null,
  activeWeekPlanned: PlannedRecipe[],
) {
  const selectedRecipe = useMemo(() => {
    if (!activeRecipeId) return null
    return recipes.find((r) => r.id === activeRecipeId) || null
  }, [recipes, activeRecipeId])

  const sourceRecipes = useMemo(() => {
    if (view === 'week') {
      const ids = new Set(activeWeekPlanned.map((p) => p.recipeId))
      return recipes.filter((r) => ids.has(r.id))
    }
    return recipes
  }, [recipes, view, activeWeekPlanned])

  return { selectedRecipe, sourceRecipes }
}

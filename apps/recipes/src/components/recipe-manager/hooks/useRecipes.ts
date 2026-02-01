import { useEffect } from 'react'
import { useStore } from '@nanostores/react'
import type { Recipe } from '../../../lib/types'
import {
  $recipes,
  $recipesLoading,
  $recipesInitialized,
  $recipesError,
  recipeActions,
} from '../../../lib/recipeStore'

const getBaseUrl = (): string => {
  const base = import.meta.env.BASE_URL
  return base.endsWith('/') ? base : `${base}/`
}

export const useRecipes = () => {
  const recipes = useStore($recipes)
  const loading = useStore($recipesLoading)
  const initialized = useStore($recipesInitialized)

  const refreshRecipes = async (showLoading = false): Promise<void> => {
    // If we are already initialized and not forcing loading, we can skip setting loading true
    // But if explicit refresh is requested, we might want to show loading.
    // However, for "background refresh" we might just want to update data.

    // For this implementation, if showLoading is true, we set the global loading state
    if (showLoading) $recipesLoading.set(true)

    try {
      const res = await fetch(`${getBaseUrl()}api/recipes`)
      if (res.ok) {
        const data = await res.json()
        recipeActions.setRecipes((data.recipes as Recipe[]) || [])
      } else {
        let errorMessage = `Failed to fetch recipes: ${res.status} ${res.statusText}`
        try {
          const errorData = await res.json()
          if (errorData.error) {
            errorMessage = errorData.error
          }
        } catch {
          // ignore json parse error
        }
        throw new Error(errorMessage)
      }
    } catch (err) {
      console.error('Failed to load recipes', err)
      const message = err instanceof Error ? err.message : 'Unknown error'
      recipeActions.setError(message)
    }
  }

  // Initial fetch on mount (only if not already initialized)
  useEffect(() => {
    if (!initialized) {
      refreshRecipes(true)
    }
  }, [initialized])

  // Adapter to match existing setRecipes signature (approximate)
  // RecipeManager uses: setRecipes((prev) => ...) and setRecipes([...])
  const setRecipes = (value: Recipe[] | ((prev: Recipe[]) => Recipe[])) => {
    if (typeof value === 'function') {
      const current = $recipes.get()
      recipeActions.setRecipes(value(current))
    } else {
      recipeActions.setRecipes(value)
    }
  }

  const error = useStore($recipesError)

  return { recipes, setRecipes, loading, initialized, error, refreshRecipes, getBaseUrl }
}

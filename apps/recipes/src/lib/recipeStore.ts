import { atom } from 'nanostores'
import type { Recipe } from './types'

export const $recipes = atom<Recipe[]>([])
export const $recipesLoading = atom<boolean>(true)
export const $recipesInitialized = atom<boolean>(false)

export const $recipesError = atom<string | null>(null)

export const recipeActions = {
  setRecipes: (recipes: Recipe[]) => {
    $recipes.set(recipes)
    $recipesLoading.set(false)
    $recipesInitialized.set(true)
    $recipesError.set(null)
  },

  setError: (error: string) => {
    $recipesError.set(error)
    $recipesLoading.set(false)
  },

  clearError: () => {
    $recipesError.set(null)
  },

  addRecipe: (recipe: Recipe) => {
    const current = $recipes.get()
    $recipes.set([...current, recipe])
  },

  updateRecipe: (updatedRecipe: Recipe) => {
    const current = $recipes.get()
    $recipes.set(current.map((r) => (r.id === updatedRecipe.id ? updatedRecipe : r)))
  },

  deleteRecipe: (id: string) => {
    const current = $recipes.get()
    $recipes.set(current.filter((r) => r.id !== id))
  },
}

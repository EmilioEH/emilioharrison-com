import { useState, useCallback } from 'react'
import type { Recipe } from '../../../lib/types'

interface UseRecipeActionsProps {
  recipes: Recipe[]
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>
  getBaseUrl: () => string
}

export const useRecipeActions = ({ recipes, setRecipes, getBaseUrl }: UseRecipeActionsProps) => {
  const [isSaving, setIsSaving] = useState(false)

  const saveRecipe = useCallback(
    async (
      recipe: Partial<Recipe> & { id?: string },
    ): Promise<{ success: boolean; savedRecipe?: Recipe }> => {
      setIsSaving(true)
      const isNew = !recipe.id || !recipes.find((r) => r.id === recipe.id)
      const method = isNew ? 'POST' : 'PUT'
      const url = isNew ? `${getBaseUrl()}api/recipes` : `${getBaseUrl()}api/recipes/${recipe.id}`

      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recipe),
        })

        if (res.ok) {
          const savedRecipe = { ...recipe } as Recipe
          if (isNew) {
            const { id } = await res.json()
            savedRecipe.id = id
          }

          // Optimistic update
          setRecipes((prev) => {
            const exists = prev.find((r) => r.id === savedRecipe.id)
            if (exists) {
              return prev.map((r) => (r.id === savedRecipe.id ? savedRecipe : r))
            }
            return [savedRecipe, ...prev]
          })

          // await refreshRecipes(false) -- REMOVED to prevent race condition with optimistic updates
          return { success: true, savedRecipe }
        } else {
          console.error('Failed to save recipe')
          return { success: false }
        }
      } catch (e) {
        console.error(e)
        return { success: false }
      } finally {
        setIsSaving(false)
      }
    },
    [recipes, setRecipes, getBaseUrl],
  )

  const deleteRecipe = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const res = await fetch(`${getBaseUrl()}api/recipes/${id}`, { method: 'DELETE' })
        if (res.ok) {
          setRecipes((prev) => prev.filter((r) => r.id !== id))
          // Unplan from week view
          const { unplanRecipe } = await import('../../../lib/weekStore')
          unplanRecipe(id)
          return true
        } else {
          return false
        }
      } catch (e) {
        console.error(e)
        return false
      }
    },
    [setRecipes, getBaseUrl],
  )

  return {
    saveRecipe,
    deleteRecipe,
    isSaving,
  }
}

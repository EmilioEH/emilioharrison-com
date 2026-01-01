import { useState, useCallback } from 'react'
import type { Recipe } from '../../../lib/types'

interface UseRecipeActionsProps {
  recipes: Recipe[]
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>
  refreshRecipes: (showLoading?: boolean) => Promise<void>
  getBaseUrl: () => string
}

export const useRecipeActions = ({
  recipes,
  setRecipes,
  refreshRecipes,
  getBaseUrl,
}: UseRecipeActionsProps) => {
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
    [recipes, setRecipes, refreshRecipes, getBaseUrl],
  )

  const deleteRecipe = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const res = await fetch(`${getBaseUrl()}api/recipes/${id}`, { method: 'DELETE' })
        if (res.ok) {
          setRecipes((prev) => prev.filter((r) => r.id !== id))
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

  const toggleFavorite = useCallback(
    async (recipe: Recipe): Promise<Recipe> => {
      const oldIsFavorite = recipe.isFavorite
      const newIsFavorite = !oldIsFavorite

      // Optimistic update
      setRecipes((prev) =>
        prev.map((r) => (r.id === recipe.id ? { ...r, isFavorite: newIsFavorite } : r)),
      )

      try {
        const res = await fetch(`${getBaseUrl()}api/favorites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipeId: recipe.id }),
        })

        if (!res.ok) throw new Error('Failed to toggle favorite')

        const data = await res.json()
        if (data.isFavorite !== newIsFavorite) {
          // Revert/Sync if server disagrees
          setRecipes((prev) =>
            prev.map((r) => (r.id === recipe.id ? { ...r, isFavorite: data.isFavorite } : r)),
          )
          return { ...recipe, isFavorite: data.isFavorite }
        }
        return { ...recipe, isFavorite: newIsFavorite }
      } catch (e) {
        console.error(e)
        // Revert on error
        setRecipes((prev) =>
          prev.map((r) => (r.id === recipe.id ? { ...r, isFavorite: oldIsFavorite } : r)),
        )
        return { ...recipe, isFavorite: oldIsFavorite }
      }
    },
    [setRecipes, getBaseUrl],
  )

  const bulkUpdateRecipes = useCallback(
    async (ids: Set<string>, updates: Partial<Recipe>): Promise<boolean> => {
      try {
        const res = await fetch(`${getBaseUrl()}api/recipes/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            ids: Array.from(ids),
            updates,
          }),
        })

        if (res.ok) {
          setRecipes((prev) =>
            prev.map((r) => {
              if (ids.has(r.id)) {
                return { ...r, ...updates, updatedAt: new Date().toISOString() }
              }
              return r
            }),
          )
          return true
        }
        return false
      } catch (e) {
        console.error(e)
        return false
      }
    },
    [setRecipes, getBaseUrl],
  )

  const bulkDeleteRecipes = useCallback(
    async (ids: Set<string>): Promise<boolean> => {
      // Optimistic Update
      setRecipes((prev) => prev.filter((r) => !ids.has(r.id)))

      try {
        await Promise.all(
          Array.from(ids).map((id) =>
            fetch(`${getBaseUrl()}api/recipes/${id}`, { method: 'DELETE' }),
          ),
        )
        return true
      } catch (e) {
        console.error(e)
        // Revert/Sync on error
        await refreshRecipes(false)
        return false
      }
    },
    [setRecipes, getBaseUrl, refreshRecipes],
  )

  return {
    saveRecipe,
    deleteRecipe,
    toggleFavorite,
    bulkUpdateRecipes,
    bulkDeleteRecipes,
    isSaving,
  }
}

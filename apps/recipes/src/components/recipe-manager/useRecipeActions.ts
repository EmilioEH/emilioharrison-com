import { useState } from 'react'
import type { Recipe } from '../../lib/types'
import type { HeaderAction } from '../recipe-details/types'
import { confirm, alert } from '../../lib/dialogStore'

interface UseRecipeActionsProps {
  recipe: Recipe
  onUpdate: (recipe: Recipe, action: 'save' | 'edit' | 'silent') => void
  onDelete: (id: string) => void
  onToggleThisWeek: (id?: string) => void
  onToggleFavorite?: () => void
}

export const useRecipeActions = ({
  recipe,
  onUpdate,
  onDelete,
  onToggleThisWeek,
  onToggleFavorite,
}: UseRecipeActionsProps) => {
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshProgress, setRefreshProgress] = useState<string>('')
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  const handleAction = async (action: HeaderAction) => {
    switch (action) {
      case 'delete': {
        const confirmed = await confirm('Are you certain you want to delete this recipe?')
        if (confirmed) {
          onDelete(recipe.id)
        }
        break
      }
      case 'edit':
        setIsEditing(true)
        break
      case 'addToWeek':
        onToggleThisWeek(recipe.id)
        break
      case 'move':
        onUpdate({ ...recipe }, 'edit')
        break
      case 'toggleFavorite':
        if (onToggleFavorite) onToggleFavorite()
        break
      case 'share':
        setShareDialogOpen(true)
        break
      case 'history':
        setIsHistoryOpen(true)
        break
      case 'refresh':
        await handleRefresh()
        break
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    setRefreshProgress('Preparing to refresh...')

    const baseUrl = import.meta.env.BASE_URL.endsWith('/')
      ? import.meta.env.BASE_URL
      : `${import.meta.env.BASE_URL}/`

    try {
      setRefreshProgress('Analyzing recipe content...')
      const res = await fetch(`${baseUrl}api/recipes/${recipe.id}/refresh`, { method: 'POST' })
      setRefreshProgress('Applying AI enhancements...')
      const data = await res.json()

      if (data.success && data.recipe) {
        setRefreshProgress('Done!')
        await new Promise((r) => setTimeout(r, 1000))
        onUpdate(data.recipe, 'silent')
      } else {
        throw new Error(data.error || 'Refresh failed')
      }
    } catch (e) {
      console.error('Refresh error:', e)
      const errorMsg = e instanceof Error ? e.message : String(e)
      if (errorMsg.includes('too large')) {
        await alert(
          'The recipe image is too large (>9MB) for our AI to process. Please edit the recipe and upload a smaller image.',
          'Image Too Large',
        )
      } else {
        await alert(`Failed to refresh recipe: ${errorMsg}`, 'Error')
      }
    } finally {
      setIsRefreshing(false)
      setRefreshProgress('')
    }
  }

  const handleSaveRecipe = async (updated: Recipe) => {
    const baseUrl = import.meta.env.BASE_URL.endsWith('/')
      ? import.meta.env.BASE_URL
      : `${import.meta.env.BASE_URL}/`

    const res = await fetch(`${baseUrl}api/recipes/${updated.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })

    if (!res.ok) {
      alert('Failed to save recipe')
      return
    }

    onUpdate(updated, 'save')
    setIsEditing(false)
  }

  return {
    handleAction,
    handleSaveRecipe,
    state: {
      shareDialogOpen,
      isEditing,
      isRefreshing,
      refreshProgress,
      isHistoryOpen,
    },
    setters: {
      setShareDialogOpen,
      setIsEditing,
      setIsHistoryOpen,
    },
  }
}

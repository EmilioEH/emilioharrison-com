import type { Recipe, PendingInvite } from '../../../lib/types'
import { alert, confirm } from '../../../lib/dialogStore'
import { familyActions, $pendingInvites } from '../../../lib/familyStore'

import type { ViewMode } from './useRouter'

interface UseRecipeHandlersProps {
  recipes: Recipe[]
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>
  saveRecipe: (recipe: Partial<Recipe>) => Promise<{ success: boolean }>
  deleteRecipe: (id: string) => Promise<boolean>
  bulkUpdateRecipes: (ids: Set<string>, updates: Partial<Recipe>) => Promise<boolean>
  bulkDeleteRecipes: (ids: Set<string>) => Promise<boolean>
  setRecipe: (id: string | null) => void
  setView: (view: ViewMode) => void
  selectedRecipe: Recipe | null
  selectedIds: Set<string>
  clearSelection: () => void
  setCurrentUser: (name: string) => void
}

export function useRecipeHandlers({
  recipes,
  setRecipes,
  saveRecipe,
  deleteRecipe,
  bulkUpdateRecipes,
  bulkDeleteRecipes,
  setRecipe,
  setView,
  selectedRecipe: _selectedRecipe,
  selectedIds,
  clearSelection,
  setCurrentUser,
}: UseRecipeHandlersProps) {
  const handleAcceptInvite = async (invite: PendingInvite) => {
    try {
      const res = await fetch('/protected/recipes/api/families/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId: invite.id, accept: true }),
      })
      const data = await res.json()
      if (data.success) {
        const familyRes = await fetch('/protected/recipes/api/families/current')
        const familyData = await familyRes.json()
        if (familyData.success) {
          familyActions.setFamily(familyData.family)
          familyActions.setMembers(familyData.members || [])
          familyActions.setPendingInvites([])
          await alert(`Joined ${invite.familyName} successfully!`)
        }
      } else {
        await alert(data.error || 'Failed to join family')
      }
    } catch (e) {
      console.error(e)
      await alert('An error occurred')
    }
  }

  const handleDeclineInvite = async (invite: PendingInvite) => {
    try {
      const res = await fetch('/protected/recipes/api/families/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId: invite.id, accept: false }),
      })
      const data = await res.json()
      if (data.success) {
        const current = $pendingInvites.get()
        familyActions.setPendingInvites(current.filter((i) => i.id !== invite.id))
      } else {
        await alert(data.error || 'Failed to decline invitation')
      }
    } catch (e) {
      console.error(e)
      await alert('An error occurred')
    }
  }

  const handleSaveRecipeInternal = async (recipe: Partial<Recipe> & { id?: string }) => {
    const { success } = await saveRecipe(recipe)
    if (success) {
      setView('library')
      setRecipe(null)
    } else {
      await alert('Failed to save recipe')
    }
  }

  const handleDeleteRecipeInternal = async (id: string) => {
    const success = await deleteRecipe(id)
    if (success) {
      setView('library')
      setRecipe(null)
    } else {
      await alert('Failed to delete')
    }
  }

  const handleUpdateRecipe = (updatedRecipe: Recipe, mode: 'save' | 'edit' = 'save') => {
    if (mode === 'edit') {
      setRecipe(updatedRecipe.id)
      setView('edit')
    } else {
      const changes = { ...updatedRecipe, updatedAt: new Date().toISOString() }
      handleSaveRecipeInternal(changes)
      setRecipes((prev) => prev.map((r) => (r.id === updatedRecipe.id ? changes : r)))
    }
  }

  const handleBulkDelete = async () => {
    if (await confirm(`Delete ${selectedIds.size} recipes? This cannot be undone.`)) {
      if (await bulkDeleteRecipes(selectedIds)) {
        clearSelection()
      } else {
        await alert('Some deletions failed')
      }
    }
  }

  const handleBulkEdit = async (updates: Partial<Recipe>) => {
    if (await bulkUpdateRecipes(selectedIds, updates)) {
      clearSelection()
    } else {
      await alert('Bulk update failed')
    }
  }

  const handleExport = () => {
    const dataStr = JSON.stringify(recipes, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `chefboard_backup_${new Date().toISOString().split('T')[0]}.json`
    link.href = url
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleUpdateProfile = async (displayName: string) => {
    try {
      const res = await fetch('/protected/recipes/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      })
      if (res.ok) {
        setCurrentUser(displayName)
        await alert('Profile updated successfully!')
        return true
      }
      await alert('Failed to update profile')
      return false
    } catch (e) {
      console.error(e)
      await alert('An error occurred')
      return false
    }
  }

  return {
    handleAcceptInvite,
    handleDeclineInvite,
    handleSaveRecipe: handleSaveRecipeInternal,
    handleDeleteRecipe: handleDeleteRecipeInternal,
    handleUpdateRecipe,
    handleBulkDelete,
    handleBulkEdit,
    handleExport,
    handleUpdateProfile,
  }
}

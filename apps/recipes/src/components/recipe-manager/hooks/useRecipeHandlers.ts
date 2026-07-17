import type { Recipe, PendingInvite } from '../../../lib/types'
import { alert, confirm } from '../../../lib/dialogStore'
import { familyActions, $pendingInvites } from '../../../lib/familyStore'
import { recipeActions } from '../../../lib/recipeStore'

import type { ViewMode } from './useRouter'
import { useRecipeVersions } from './useRecipeVersions'
import { triggerBackgroundEnhancement } from '../../../lib/services/recipe-enhancer'

interface UseRecipeHandlersProps {
  recipes: Recipe[]
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>
  saveRecipe: (recipe: Partial<Recipe>) => Promise<{ success: boolean; savedRecipe?: Recipe }>
  deleteRecipe: (id: string) => Promise<boolean>
  bulkUpdateRecipes: (ids: Set<string>, updates: Partial<Recipe>) => Promise<boolean>
  bulkDeleteRecipes: (ids: Set<string>) => Promise<boolean>
  setRecipe: (id: string | null) => void
  setView: (view: ViewMode) => void
  selectedRecipe: Recipe | null
  selectedIds: Set<string>
  clearSelection: () => void
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

  // NEW: Version Control Hook
  const { createSnapshot } = useRecipeVersions()

  const handleSaveRecipeInternal = async (
    recipe: Partial<Recipe> & { id?: string },
  ): Promise<{ success: boolean; savedId?: string }> => {
    // Snapshot original state before saving if it's an update
    if (recipe.id) {
      const original = recipes.find((r) => r.id === recipe.id)
      if (original) {
        // Fire and forget snapshot (don't block UI strictly, or maybe we should?)
        // Let's await it to be safe, creating history is fast.
        await createSnapshot(recipe.id, 'manual-edit', original)
      }
    }

    const { success, savedRecipe: saved } = await saveRecipe(recipe)

    if (success) {
      // ONLY navigate to library if it's an EXISTING recipe (edit mode)
      // New recipes will stay on the "Success" screen handled by RecipeEditor
      if (recipe.id) {
        setView('library')
        setRecipe(null)
      }
      // If it's a new recipe, we do NOT change view here.
      // The RecipeEditor will handle the "Success" state.

      // Background Enhancement Trigger (Fire-and-forget)
      // Only for NEW recipes created via AI parsing
      if (!recipe.id && saved?.id && recipe.creationMethod === 'ai-parse' && recipe.title) {
        triggerBackgroundEnhancement(saved.id, recipe.title)
      }

      return { success: true, savedId: saved?.id }
    } else {
      await alert('Failed to save recipe')
      return { success: false }
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

  const handleUpdateRecipe = (
    updatedRecipe: Recipe,
    mode: 'save' | 'edit' | 'silent' | 'hydrate' = 'save',
  ) => {
    if (mode === 'edit') {
      setRecipe(updatedRecipe.id)
      setView('edit')
    } else if (mode === 'hydrate') {
      // Pure client-side sync — the caller already fetched the authoritative full document from
      // the server (e.g. RecipeDetail's mount-time revalidation merging a slim list record into
      // the full doc, or re-syncing after a restore/review that persisted elsewhere). There's
      // nothing to write: re-PUTting data the server just gave us would be a redundant network
      // write, bump `updatedAt` again, and add a spurious version-history snapshot. Just update
      // the local store directly (see PERFORMANCE-PLAN.md P3 / recipeStore.ts's `updateRecipe`).
      recipeActions.updateRecipe(updatedRecipe)
    } else if (mode === 'silent') {
      // In-place update without navigation (for AI refresh, cost updates, etc.)
      const changes = { ...updatedRecipe, updatedAt: new Date().toISOString() }
      saveRecipe(changes) // Just save, don't navigate
    } else {
      // Original 'save' behavior (from editor)
      const changes = { ...updatedRecipe, updatedAt: new Date().toISOString() }
      handleSaveRecipeInternal(changes) // Navigate to library
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

  return {
    handleAcceptInvite,
    handleDeclineInvite,
    handleSaveRecipe: handleSaveRecipeInternal,
    handleDeleteRecipe: handleDeleteRecipeInternal,
    handleUpdateRecipe,
    handleBulkDelete,
    handleBulkEdit,
  }
}

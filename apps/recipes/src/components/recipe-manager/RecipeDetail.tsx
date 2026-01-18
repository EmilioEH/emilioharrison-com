import React, { useEffect, useMemo, useState } from 'react'
import { computed } from 'nanostores'
import { useStore } from '@nanostores/react'
import { DetailHeader } from '../recipe-details/DetailHeader'
import type { HeaderAction } from '../recipe-details/types'
import { Stack, Inline } from '../ui/layout'
import { CookingContainer } from '../cooking-mode/CookingContainer'
import { ShareRecipeDialog } from './dialogs/ShareRecipeDialog'
import type { Recipe } from '../../lib/types'
import { cookingSessionActions, $cookingSession } from '../../stores/cookingSession'
import { Play, Check, ListPlus } from 'lucide-react'
import { EditRecipeView } from '../recipe-details/EditRecipeView'
import { OverviewMode } from '../recipe-details/OverviewMode'
import { isPlannedForActiveWeek, allPlannedRecipes } from '../../lib/weekStore'
import { confirm, alert } from '../../lib/dialogStore'

// Wake Lock Helper
const useWakeLock = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return

    let wakeLock: WakeLockSentinel | null = null
    const requestLock = async () => {
      try {
        wakeLock = await navigator.wakeLock.request('screen')
      } catch (err) {
        console.warn('Wake Lock error:', err)
      }
    }
    requestLock()

    return () => {
      wakeLock?.release()
    }
  }, [enabled])
}

interface RecipeDetailProps {
  recipe: Recipe
  onClose: () => void
  onUpdate: (recipe: Recipe, action: 'save' | 'edit' | 'silent') => void
  onDelete: (id: string) => void
  onToggleThisWeek: (id?: string) => void
  onToggleFavorite?: () => void
}

export const RecipeDetail: React.FC<RecipeDetailProps> = ({
  recipe,
  onClose,
  onUpdate,
  onDelete,
  onToggleThisWeek,
  onToggleFavorite,
}) => {
  const session = useStore($cookingSession)

  // ... imports

  const isCooking = session.isActive && session.recipeId === recipe.id
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshProgress, setRefreshProgress] = useState<string>('')

  // Use weekStore to determine if planned (Family-scoped)
  const isPlanned = useStore(
    useMemo(
      () => computed(allPlannedRecipes, () => isPlannedForActiveWeek(recipe.id)),
      [recipe.id],
    ),
  )

  useWakeLock(isCooking)

  const startCooking = () => {
    cookingSessionActions.startSession(recipe)
  }

  const handleSaveRecipe = async (updated: Recipe) => {
    // 1. Persist to API
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

    // 2. Update list in parent
    onUpdate(updated, 'save')

    // 3. Exit edit mode
    setIsEditing(false)
  }

  const handleAction = async (action: HeaderAction) => {
    if (action === 'delete') {
      confirm('Are you certain you want to delete this recipe?').then((confirmed) => {
        if (confirmed) {
          onDelete(recipe.id)
        }
      })
    } else if (action === 'edit') {
      setIsEditing(true)
    } else if (action === 'addToWeek') {
      onToggleThisWeek(recipe.id)
    } else if (action === 'move') {
      onUpdate({ ...recipe }, 'edit')
    } else if (action === 'toggleFavorite') {
      if (onToggleFavorite) onToggleFavorite()
    } else if (action === 'share') {
      setShareDialogOpen(true)
    } else if (action === 'refresh') {
      // Non-blocking refresh - no confirmation dialog
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
          await new Promise((r) => setTimeout(r, 1000)) // Brief success display
          onUpdate(data.recipe, 'silent') // Stay on the detail view
        } else {
          throw new Error(data.error || 'Refresh failed')
        }
      } catch (e) {
        console.error('Refresh error:', e)
        const errorMsg = e instanceof Error ? e.message : String(e)
        // Check for specific size error we added
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
  }

  if (isCooking) {
    return <CookingContainer onClose={onClose} />
  }

  if (isEditing) {
    return (
      <Stack
        spacing="none"
        className="fixed inset-0 z-50 bg-background animate-in slide-in-from-bottom-10"
      >
        <EditRecipeView
          recipe={recipe}
          onSave={handleSaveRecipe}
          onCancel={() => setIsEditing(false)}
        />
      </Stack>
    )
  }

  return (
    <Stack spacing="none" className="fixed inset-0 z-50 bg-card animate-in slide-in-from-bottom-10">
      <DetailHeader
        recipe={recipe}
        onClose={onClose}
        onAction={handleAction}
        cookingMode={false}
        setCookingMode={() => {}}
        onToggleThisWeek={onToggleThisWeek}
        cookingStage={'idle'}
        setCookingStage={() => {}}
      />
      <OverviewMode
        recipe={recipe}
        startCooking={startCooking}
        onSaveCost={(cost) => onUpdate({ ...recipe, estimatedCost: cost }, 'save')}
        isRefreshing={isRefreshing}
        refreshProgress={refreshProgress}
      />
      {/* Sticky Action Footer */}
      <div className="safe-area-pb fixed bottom-8 left-0 right-0 z-50 border-t border-border bg-background/80 px-4 py-3 backdrop-blur-md transition-all duration-300">
        <Inline spacing="md" justify="center" className="mx-auto max-w-md">
          {/* Secondary: Add to List (Mapped to Week functionality for now) */}
          <button
            onClick={() => handleAction('addToWeek')}
            className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border-2 font-display text-base font-bold uppercase tracking-wider transition-all active:scale-95 ${
              isPlanned
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:border-primary/50'
            }`}
          >
            {isPlanned ? (
              <>
                <Check className="h-4 w-4" /> Added
              </>
            ) : (
              <>
                <ListPlus className="h-4 w-4" /> Add to Week
              </>
            )}
          </button>

          {/* Primary: Start Cooking */}
          <button
            onClick={startCooking}
            className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-xl bg-foreground text-background shadow-lg transition-all hover:bg-foreground/90 active:scale-95"
          >
            <span className="font-display text-lg font-bold">Start Cooking</span>
            <Play className="h-5 w-5 fill-current" />
          </button>
        </Inline>
      </div>

      {/* Share Recipe Dialog */}
      <ShareRecipeDialog recipe={recipe} open={shareDialogOpen} onOpenChange={setShareDialogOpen} />
    </Stack>
  )
}

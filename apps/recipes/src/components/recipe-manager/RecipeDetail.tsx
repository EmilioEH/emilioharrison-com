import React, { useEffect, useMemo, useState, useCallback, Suspense } from 'react'
import { useRecipeActions } from './useRecipeActions'
import { computed } from 'nanostores'
import { useStore } from '@nanostores/react'
import { DetailHeader } from '../recipe-details/DetailHeader'
import { Stack, Inline } from '../ui/layout'
import { ShareRecipeDialog } from './dialogs/ShareRecipeDialog'
import type { Recipe } from '../../lib/types'
import { cookingSessionActions, $cookingSession } from '../../stores/cookingSession'
import { Play, Check, ListPlus, Loader2 } from 'lucide-react'
import { EditRecipeView } from '../recipe-details/EditRecipeView'
import { OverviewMode } from '../recipe-details/OverviewMode'
import { VersionHistoryModal } from '../recipe-details/VersionHistoryModal'
import { isPlannedForActiveWeek, allPlannedRecipes } from '../../lib/weekStore'

// Cooking mode (step-by-step timers/wake lock UI) is a distinct heavy feature only
// entered when the user taps "Start Cooking" — code-split separately from the
// (much more frequently visited) recipe overview/detail screen above it.
const CookingContainer = React.lazy(() =>
  import('../cooking-mode/CookingContainer').then((m) => ({ default: m.CookingContainer })),
)

const CookingModeLoadingFallback: React.FC = () => (
  <div data-testid="loading-indicator" className="flex h-full items-center justify-center bg-card">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
)

// Shown only for a recipe that arrived as a slim list-view record (see PERFORMANCE-PLAN.md P3 —
// GET /api/recipes no longer ships `steps`/ingredient detail) and hasn't been hydrated into the
// full document yet. Brief in practice — a single-document fetch — and only ever seen the first
// time a given recipe is opened in a session.
const RecipeDetailLoadingFallback: React.FC = () => (
  <div
    data-testid="recipe-detail-loading"
    className="fixed inset-0 z-50 flex items-center justify-center bg-card animate-in fade-in"
  >
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
)

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
  onUpdate: (recipe: Recipe, action: 'save' | 'edit' | 'silent' | 'hydrate') => void
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

  const isCooking = session.isActive && session.recipeId === recipe.id

  // The library list endpoint (GET /api/recipes) now ships a slim projection of each recipe — no
  // `steps`, `structuredSteps`, or ingredient-mapping data (see PERFORMANCE-PLAN.md P3). `steps`
  // being absent is the signal that `recipe` is that slim record rather than the full document.
  // Without this, a recipe that has never been through AI enhancement would never trip the old
  // "hasNewEnhanced"/"isNewer" checks below, the merge-back would never fire, and this component
  // — which renders directly from the `recipe` prop with no other local state — would show a
  // permanently ingredient-less, instruction-less view.
  const [isHydrating, setIsHydrating] = useState(() => recipe.steps === undefined)

  // SWR Revalidation: fetch the full document on mount, both to catch background AI updates and
  // to hydrate a slim list record into the full document before rendering.
  useEffect(() => {
    const wasSlim = recipe.steps === undefined
    setIsHydrating(wasSlim)

    let cancelled = false

    const revalidate = async () => {
      try {
        const baseUrl = import.meta.env.BASE_URL.endsWith('/')
          ? import.meta.env.BASE_URL
          : `${import.meta.env.BASE_URL}/`
        const res = await fetch(`${baseUrl}api/recipes/${recipe.id}`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          const updatedRecipe = data.recipe || data
          if (updatedRecipe && updatedRecipe.id === recipe.id) {
            // Check for new enhanced content
            const hasNewEnhanced =
              (updatedRecipe.structuredSteps?.length || 0) > 0 &&
              (!recipe.structuredSteps || recipe.structuredSteps.length === 0)

            // Or if updatedAt has simply changed
            const isNewer = updatedRecipe.updatedAt && updatedRecipe.updatedAt !== recipe.updatedAt

            if (wasSlim || hasNewEnhanced || isNewer) {
              // Pure client-side sync: we already have the authoritative document the server
              // just gave us, no network write needed (see 'hydrate' in useRecipeHandlers.ts).
              onUpdate(updatedRecipe, 'hydrate')
            }
          }
        }
      } catch (error) {
        console.warn('Failed to revalidate recipe:', error)
      } finally {
        // Stop blocking on hydration even if the fetch failed — better to show the (possibly
        // still-slim) recipe we have than spin forever.
        if (!cancelled) setIsHydrating(false)
      }
    }

    revalidate()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe.id]) // Only run on mount/id change to prevent loop

  // Use weekStore to determine if planned (Family-scoped)
  const isPlanned = useStore(
    useMemo(
      () => computed(allPlannedRecipes, () => isPlannedForActiveWeek(recipe.id)),
      [recipe.id],
    ),
  )

  // Track if user is actively cooking from the overview (checking ingredients/steps)
  const [isOverviewCooking, setIsOverviewCooking] = useState(false)
  const handleOverviewCookingChange = useCallback((active: boolean) => {
    setIsOverviewCooking(active)
  }, [])

  useWakeLock(isCooking || isOverviewCooking)

  const {
    handleAction,
    handleSaveRecipe,
    state: { shareDialogOpen, isEditing, isRefreshing, refreshProgress, isHistoryOpen },
    setters: { setShareDialogOpen, setIsEditing, setIsHistoryOpen },
  } = useRecipeActions({
    recipe,
    onUpdate,
    onDelete,
    onToggleThisWeek,
    onToggleFavorite,
  })

  const startCooking = () => {
    cookingSessionActions.startSession(recipe)
  }

  const refreshRecipe = async () => {
    try {
      const baseUrl = import.meta.env.BASE_URL.endsWith('/')
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`
      const res = await fetch(`${baseUrl}api/recipes/${recipe.id}`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        const updatedRecipe = data.recipe || data
        if (updatedRecipe && updatedRecipe.id === recipe.id) {
          // Pure re-sync (the review that triggered this already persisted server-side).
          onUpdate(updatedRecipe, 'hydrate')
        }
      }
    } catch (error) {
      console.warn('Failed to refresh recipe after review:', error)
    }
  }

  if (isCooking) {
    return (
      <Suspense fallback={<CookingModeLoadingFallback />}>
        <CookingContainer onClose={onClose} />
      </Suspense>
    )
  }

  if (isHydrating) {
    return <RecipeDetailLoadingFallback />
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
        onSaveCost={(cost) => onUpdate({ ...recipe, estimatedCost: cost }, 'silent')}
        onPersistStepIngredients={(stepIngredients) =>
          onUpdate({ ...recipe, stepIngredients }, 'silent')
        }
        isRefreshing={isRefreshing}
        refreshProgress={refreshProgress}
        onRecipeRefresh={refreshRecipe}
        onActivelyCoookingChange={handleOverviewCookingChange}
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

      {/* Version History Modal */}
      <VersionHistoryModal
        recipeId={recipe.id}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onRestore={() => {
          const fetchFresh = async () => {
            const baseUrl = import.meta.env.BASE_URL.endsWith('/')
              ? import.meta.env.BASE_URL
              : `${import.meta.env.BASE_URL}/`
            const res = await fetch(`${baseUrl}api/recipes/${recipe.id}`, { cache: 'no-store' })
            if (res.ok) {
              const data = await res.json()
              // Pure re-sync (the restore already persisted server-side via /restore).
              if (data.recipe) onUpdate(data.recipe, 'hydrate')
            }
          }
          fetchFresh()
        }}
      />
    </Stack>
  )
}

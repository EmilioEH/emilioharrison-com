import React, { useEffect, useMemo, useState } from 'react'
import { useRecipeActions } from './useRecipeActions'
import { computed } from 'nanostores'
import { useStore } from '@nanostores/react'
import { DetailHeader } from '../recipe-details/DetailHeader'
import { Stack, Inline } from '../ui/layout'
import { ShareRecipeDialog } from './dialogs/ShareRecipeDialog'
import type { Recipe } from '../../lib/types'
import { Check, ListPlus, Loader2 } from 'lucide-react'
import { EditRecipeView } from '../recipe-details/EditRecipeView'
import { OverviewMode } from '../recipe-details/OverviewMode'
import { isPlannedForActiveWeek, allPlannedRecipes } from '../../lib/weekStore'
import { alert } from '../../lib/dialogStore'

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

interface RecipeDetailProps {
  recipe: Recipe
  onClose: () => void
  onUpdate: (recipe: Recipe, action: 'save' | 'edit' | 'silent' | 'hydrate') => void
  onDelete: (id: string) => void
  onToggleThisWeek: (id?: string) => void
}

export const RecipeDetail: React.FC<RecipeDetailProps> = ({
  recipe,
  onClose,
  onUpdate,
  onDelete,
  onToggleThisWeek,
}) => {
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

  // Background Enhancement now runs server-side and has no live subscription (unlike grocery
  // lists) — poll briefly while it's in flight so this view picks up the "complete"/"error"
  // transition without requiring a manual reload. Bounded so a stuck job doesn't poll forever;
  // self-terminates because the effect re-runs (and no-ops) once `enhancementStatus` leaves
  // pending/processing — see the dependency array below.
  useEffect(() => {
    const status = recipe.enhancementStatus
    if (status !== 'pending' && status !== 'processing') return

    const POLL_INTERVAL_MS = 4000
    // Sized to outlast the slowest healthy backend: the VM worker's WORKER_JOB_TIMEOUT_MS (120s,
    // BACKGROUND_WORKER_ENABLED path) plus margin. The legacy Cloudflare path finishes far sooner
    // and this self-terminates the moment enhancementStatus leaves pending/processing anyway.
    const MAX_ATTEMPTS = 40 // ~160s total
    let attempts = 0
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    const poll = async () => {
      attempts++
      try {
        const baseUrl = import.meta.env.BASE_URL.endsWith('/')
          ? import.meta.env.BASE_URL
          : `${import.meta.env.BASE_URL}/`
        const res = await fetch(`${baseUrl}api/recipes/${recipe.id}`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          const updatedRecipe = data.recipe || data
          if (
            !cancelled &&
            updatedRecipe?.id === recipe.id &&
            updatedRecipe.enhancementStatus !== status
          ) {
            onUpdate(updatedRecipe, 'hydrate')

            // The recipe previously just silently rewrote itself once enhancement finished —
            // tell the user explicitly so an unexpected content change (or a failure that left
            // the original untouched) doesn't look like a bug.
            if (updatedRecipe.enhancementStatus === 'complete') {
              void alert(
                "We've enhanced this recipe with clearer step-by-step instructions and organized ingredients. Tap “Smart View” to see it, or switch back to “Original” any time.",
                'Recipe Enhanced',
              )
            } else if (updatedRecipe.enhancementStatus === 'error') {
              void alert(
                updatedRecipe.enhancementError ||
                  "We couldn't enhance this recipe automatically. Your original recipe is unchanged.",
                'Enhancement Failed',
              )
            }
            return
          }
        }
      } catch (error) {
        console.warn('Failed to poll enhancement status:', error)
      }

      if (!cancelled && attempts < MAX_ATTEMPTS) {
        timer = setTimeout(poll, POLL_INTERVAL_MS)
      }
    }

    timer = setTimeout(poll, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe.id, recipe.enhancementStatus])

  // Use weekStore to determine if planned (Family-scoped)
  const isPlanned = useStore(
    useMemo(
      () => computed(allPlannedRecipes, () => isPlannedForActiveWeek(recipe.id)),
      [recipe.id],
    ),
  )

  const {
    handleAction,
    handleSaveRecipe,
    state: { shareDialogOpen, isEditing, isRefreshing, refreshProgress },
    setters: { setShareDialogOpen, setIsEditing },
  } = useRecipeActions({
    recipe,
    onUpdate,
    onDelete,
    onToggleThisWeek,
  })

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
        onPersistStepIngredients={(stepIngredients) =>
          onUpdate({ ...recipe, stepIngredients }, 'silent')
        }
        isRefreshing={isRefreshing}
        refreshProgress={refreshProgress}
        onRecipeRefresh={refreshRecipe}
      />
      {/* Sticky Action Footer */}
      <div className="safe-area-pb fixed bottom-8 left-0 right-0 z-50 border-t border-border bg-background/80 px-4 py-3 backdrop-blur-md transition-all duration-300">
        <Inline spacing="md" justify="center" className="mx-auto max-w-md">
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
        </Inline>
      </div>

      {/* Share Recipe Dialog */}
      <ShareRecipeDialog recipe={recipe} open={shareDialogOpen} onOpenChange={setShareDialogOpen} />
    </Stack>
  )
}

import React, { useEffect } from 'react'
import { useStore } from '@nanostores/react'
import { DetailHeader, type HeaderAction } from '../recipe-details/DetailHeader'
import { CookingContainer } from '../cooking-mode/CookingContainer'
import type { Recipe } from '../../lib/types'
import { cookingSessionActions, $cookingSession } from '../../stores/cookingSession'
import { Calendar, Play, Check } from 'lucide-react'
import { OverviewMode } from '../recipe-details/OverviewMode'

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
  onUpdate: (recipe: Recipe, action: 'save' | 'edit') => void
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

  // Feedback State - Removed unused local state as it is now handled in session or will be hydrated later.
  // const [rating, setRating] = useState(recipe.rating || 0)
  // const [userNotes, setUserNotes] = useState(recipe.userNotes || '')
  // const [wouldMakeAgain, setWouldMakeAgain] = useState(recipe.wouldMakeAgain ?? true)
  // const [finishedImage, setFinishedImage] = useState<string | null>(recipe.finishedImage || null)

  // Local state for checkboxes removed, now using session.checkedIngredients

  useWakeLock(isCooking)

  const startCooking = () => {
    cookingSessionActions.startSession(recipe)
  }

  const handleAction = (action: HeaderAction) => {
    if (action === 'delete') {
      if (confirm('Are you certain you want to delete this recipe?')) {
        onDelete(recipe.id)
      }
    } else if (action === 'edit') {
      onUpdate({ ...recipe }, 'edit')
    } else if (action === 'addToWeek') {
      onUpdate({ ...recipe, thisWeek: !recipe.thisWeek }, 'save')
    } else if (action === 'move') {
      onUpdate({ ...recipe }, 'edit')
    } else if (action === 'toggleFavorite') {
      if (onToggleFavorite) onToggleFavorite()
    }
  }

  if (isCooking) {
    return <CookingContainer onClose={onClose} />
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-card animate-in slide-in-from-bottom-10">
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
      />
      {/* Sticky Action Footer */}
      <div className="safe-area-pb fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/80 px-4 py-3 backdrop-blur-md transition-all duration-300">
        <div className="mx-auto flex max-w-md items-center gap-3">
          {/* Secondary: Add to Week */}
          <button
            onClick={() => handleAction('addToWeek')}
            className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border-2 font-display text-sm font-bold uppercase tracking-wider transition-all active:scale-95 ${
              recipe.thisWeek
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:border-primary/50'
            }`}
          >
            {recipe.thisWeek ? (
              <>
                <Check className="h-4 w-4" /> Added
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4" /> Add to Week
              </>
            )}
          </button>

          {/* Primary: Start Cooking */}
          <button
            onClick={startCooking}
            className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 active:scale-95"
          >
            <span className="font-display text-lg font-bold">Start Cooking</span>
            <Play className="h-5 w-5 fill-current" />
          </button>
        </div>
      </div>
    </div>
  )
}

import React from 'react'
import { Heart } from 'lucide-react'
import type { Recipe } from '../../lib/types'
import { DetailHeaderActions } from './DetailHeaderActions'
import { HeaderBackButton, HeaderModeToggle } from './DetailHeaderComponents'

export type CookingStage = 'idle' | 'pre' | 'during' | 'post'
export type HeaderAction = 'delete' | 'edit' | 'addToWeek' | 'move' | 'toggleFavorite' | 'rate'

interface DetailHeaderProps {
  recipe: Recipe
  onClose: () => void
  onAction: (action: HeaderAction) => void
  cookingMode: boolean
  setCookingMode: (mode: boolean) => void
  onToggleThisWeek?: () => void
  cookingStage: CookingStage
  setCookingStage: (stage: CookingStage) => void
}

export const DetailHeader: React.FC<DetailHeaderProps> = ({
  recipe,
  onClose,
  onAction,
  cookingMode,
  setCookingMode,
  onToggleThisWeek,
  cookingStage,
  setCookingStage,
}) => (
  <div
    className={`sticky top-0 z-20 flex items-center justify-between border-b border-md-sys-color-outline bg-md-sys-color-surface px-4 py-4 transition-all ${cookingMode ? 'py-2' : ''}`}
  >
    <HeaderBackButton
      cookingStage={cookingStage}
      setCookingStage={setCookingStage}
      onClose={onClose}
    />

    <div className="flex gap-2">
      <HeaderModeToggle
        cookingMode={cookingMode}
        setCookingMode={setCookingMode}
        setCookingStage={setCookingStage}
      />

      <button
        onClick={() => onAction('toggleFavorite')}
        className={`rounded-full border p-2 transition ${recipe.isFavorite ? 'border-red-200 bg-red-50 text-red-500' : 'border-transparent text-md-sys-color-on-surface-variant hover:text-red-500'}`}
        aria-label={recipe.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
        title={recipe.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
      >
        <Heart className={`h-5 w-5 ${recipe.isFavorite ? 'fill-red-500' : ''}`} />
      </button>

      <DetailHeaderActions
        onAction={onAction}
        onToggleThisWeek={onToggleThisWeek}
        isThisWeek={recipe.thisWeek}
      />
    </div>
  </div>
)

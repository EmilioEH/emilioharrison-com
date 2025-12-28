import React from 'react'
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  Heart,
  MoreHorizontal,
  Calendar,
  FolderInput,
  Edit2,
  Trash2,
} from 'lucide-react'
import type { Recipe } from '../../lib/types'

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
    <div className="flex items-center gap-2">
      <button
        onClick={cookingStage !== 'idle' ? () => setCookingStage('idle') : onClose}
        className="hover:bg-md-sys-color-on-surface/[0.08] rounded-full p-2 transition"
        aria-label={cookingStage !== 'idle' ? 'Back to Overview' : 'Back to Library'}
        title={cookingStage !== 'idle' ? 'Back to Overview' : 'Back to Library'}
      >
        <ArrowLeft className="h-6 w-6 text-md-sys-color-on-surface" />
      </button>
      {cookingStage !== 'idle' && (
        <span className="font-display text-xs font-medium uppercase tracking-wider text-md-sys-color-primary">
          {cookingStage === 'pre' && 'Pre-Cooking'}
          {cookingStage === 'during' && 'Cooking'}
          {cookingStage === 'post' && 'Review'}
        </span>
      )}
    </div>

    <div className="flex gap-2">
      <button
        onClick={() => {
          if (!cookingMode) {
            setCookingStage('pre')
          }
          setCookingMode(!cookingMode)
        }}
        className={`rounded-full border p-2 transition ${cookingMode ? 'border-md-sys-color-primary bg-md-sys-color-primary-container text-md-sys-color-on-primary-container' : 'border-transparent text-md-sys-color-on-surface-variant hover:text-md-sys-color-on-surface'}`}
        title="Cooking Mode (Keep Screen On)"
      >
        {cookingMode ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
      </button>

      <button
        onClick={() => onAction('toggleFavorite')}
        className={`rounded-full border p-2 transition ${recipe.isFavorite ? 'border-red-200 bg-red-50 text-red-500' : 'border-transparent text-md-sys-color-on-surface-variant hover:text-red-500'}`}
        aria-label={recipe.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
        title={recipe.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
      >
        <Heart className={`h-5 w-5 ${recipe.isFavorite ? 'fill-red-500' : ''}`} />
      </button>

      <div className="group relative">
        <button
          className="hover:bg-md-sys-color-on-surface/[0.08] rounded-full p-2 text-md-sys-color-on-surface-variant"
          aria-label="More Options"
        >
          <MoreHorizontal className="h-6 w-6" />
        </button>
        {/* Dropdown Menu */}
        <div className="invisible absolute right-0 top-full z-30 mt-2 flex w-48 flex-col overflow-hidden rounded-md-m border border-md-sys-color-outline bg-md-sys-color-surface opacity-0 shadow-md-2 transition-all group-hover:visible group-hover:opacity-100">
          <button
            onClick={() => {
              if (onToggleThisWeek) onToggleThisWeek()
              else onAction('addToWeek') // Fallback if prop not direct
            }}
            className="hover:bg-md-sys-color-primary/[0.08] flex items-center gap-2 px-4 py-3 text-left text-sm font-medium"
          >
            <Calendar className="h-4 w-4" />{' '}
            {recipe.thisWeek ? 'Remove from Week' : 'Add to This Week'}
          </button>
          <button
            onClick={() => onAction('move')}
            className="hover:bg-md-sys-color-primary/[0.08] flex items-center gap-2 px-4 py-3 text-left text-sm font-medium"
          >
            <FolderInput className="h-4 w-4" /> Move Folder
          </button>
          <button
            onClick={() => onAction('edit')}
            className="hover:bg-md-sys-color-primary/[0.08] flex items-center gap-2 px-4 py-3 text-left text-sm font-medium"
          >
            <Edit2 className="h-4 w-4" /> Edit Recipe
          </button>
          <button
            onClick={() => onAction('delete')}
            className="hover:bg-md-sys-color-error/[0.08] flex items-center gap-2 border-t border-md-sys-color-outline px-4 py-3 text-left text-sm font-medium text-md-sys-color-error"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      </div>
    </div>
  </div>
)

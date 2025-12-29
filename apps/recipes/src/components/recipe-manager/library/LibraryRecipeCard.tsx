import React from 'react'
import { Calendar, Check, Clock, Heart, Star, Users } from 'lucide-react'
import type { Recipe } from '../../../lib/types'
import type { Day } from '../../../lib/date-helpers'

interface LibraryRecipeCardProps {
  recipe: Recipe
  onClick: () => void
  onToggleThisWeek: (id: string) => void
  'data-testid': string
  isSelectionMode: boolean
  isSelected: boolean
  onAssignDay?: (recipe: Recipe, date: string) => void
  weekDays?: Day[] | null
}

export const LibraryRecipeCard: React.FC<LibraryRecipeCardProps> = ({
  recipe,
  onClick,
  onToggleThisWeek,
  'data-testid': testId,
  isSelectionMode,
  isSelected,
  onAssignDay,
  weekDays,
}) => (
  <div
    data-testid={testId}
    className={`group relative flex w-full flex-col overflow-hidden rounded-xl border bg-md-sys-color-surface text-left transition-all ${
      recipe.thisWeek
        ? 'border-md-sys-color-primary shadow-md-2'
        : 'border-md-sys-color-outline shadow-md-1 hover:shadow-md-2'
    }`}
  >
    <button onClick={onClick} className="relative flex h-full w-full flex-1 flex-col text-left">
      {isSelectionMode && (
        <div className="absolute left-2 top-2 z-20">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${isSelected ? 'border-md-sys-color-primary bg-md-sys-color-primary' : 'border-gray-400 bg-white/80'}`}
          >
            {isSelected && <Check className="h-4 w-4 text-md-sys-color-on-primary" />}
          </div>
        </div>
      )}
      {(recipe.finishedImage || recipe.sourceImage) && (
        <div className="h-32 w-full overflow-hidden border-b border-md-sys-color-outline">
          <img
            src={recipe.finishedImage || recipe.sourceImage}
            alt={recipe.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        {/* Supporting Metadata - Top */}
        <div className="mb-3 flex flex-wrap items-start gap-2 pr-10">
          {recipe.protein && (
            <span className="rounded-full bg-md-sys-color-secondary-container px-3 py-1 text-xs font-medium uppercase tracking-wide text-md-sys-color-on-secondary-container">
              {recipe.protein}
            </span>
          )}
          {recipe.thisWeek && (
            <span className="inline-flex items-center gap-2 rounded-full bg-md-sys-color-primary-container px-3 py-1 text-xs font-semibold uppercase tracking-wide text-md-sys-color-on-primary-container">
              <Calendar className="h-3.5 w-3.5" />
              <span>This Week</span>
            </span>
          )}
        </div>

        {/* Primary Content - Title */}
        <h3 className="mb-4 line-clamp-2 font-display text-lg font-bold leading-tight text-md-sys-color-on-surface">
          {recipe.title}
        </h3>

        {/* Secondary Metadata - Bottom */}
        <div className="mt-auto flex items-center gap-3 text-xs font-medium text-md-sys-color-on-surface-variant">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{recipe.cookTime + recipe.prepTime}m</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span>{recipe.servings}</span>
          </div>
          {recipe.rating && (
            <div className="ml-auto flex items-center gap-1 text-md-sys-color-primary">
              <Star className="h-3.5 w-3.5 fill-current" />
              <span className="font-semibold">{recipe.rating}</span>
            </div>
          )}
          {recipe.isFavorite && <Heart className="h-4 w-4 fill-red-500 text-red-500" />}
        </div>
      </div>
    </button>
    <button
      onClick={(e) => {
        e.stopPropagation()
        onToggleThisWeek(recipe.id)
      }}
      className={`absolute right-2 top-2 z-10 rounded-full p-2 shadow-sm transition-colors ${
        recipe.thisWeek
          ? 'hover:bg-md-sys-color-primary/90 bg-md-sys-color-primary text-md-sys-color-on-primary'
          : 'bg-md-sys-color-surface-variant/80 text-md-sys-color-on-surface-variant backdrop-blur-sm hover:bg-md-sys-color-secondary-container hover:text-md-sys-color-on-secondary-container'
      }`}
      title={recipe.thisWeek ? 'Remove from This Week' : 'Add to This Week'}
    >
      <Calendar className="h-4 w-4" />
    </button>

    {/* Day Assignment Selection */}
    {onAssignDay && weekDays && weekDays.length > 0 && (
      <div className="bg-md-sys-color-surface-variant/30 border-t border-md-sys-color-outline p-2">
        <select
          value={recipe.assignedDate || ''}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation()
            onAssignDay(recipe, e.target.value)
          }}
          className="w-full rounded border border-md-sys-color-outline bg-white p-1 text-xs"
        >
          <option value="">Move to...</option>
          {weekDays.map((day) => (
            <option key={day.date} value={day.date}>
              {day.displayLabel}
            </option>
          ))}
        </select>
      </div>
    )}
  </div>
)

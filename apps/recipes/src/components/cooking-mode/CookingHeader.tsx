import React from 'react'
import { X, List, UtensilsCrossed, ArrowLeft } from 'lucide-react'
import type { CookingSession } from '../../stores/cookingSession'

interface CookingHeaderProps {
  session: CookingSession
  title: string
  // totalSteps: number // Removed as we show title now
  onExit: () => void
  onMinimize?: () => void
  onShowIngredients: () => void
  // onShowMenu: () => void // Removed
  onShowNavigator: () => void
  // onStepJump: (index: number) => void // Unused in this view
}

export const CookingHeader: React.FC<CookingHeaderProps> = ({
  // session, // Unused for now if we don't show step count
  title,
  // totalSteps,
  onExit,
  onMinimize,
  onShowIngredients,
  // onShowMenu,
  onShowNavigator,
}) => {
  return (
    <div className="safe-area-pt flex flex-col bg-background shadow-sm transition-shadow">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        {/* Left Actions - Back Button */}
        <div className="-ml-2 flex items-center">
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
              aria-label="Back"
              title="Back"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Center - Recipe Title */}
        <div className="flex-1 px-2 text-center">
          <h1 className="line-clamp-1 font-display text-base font-bold text-foreground">{title}</h1>
        </div>

        {/* Right Actions - Steps, Ingredients, Exit */}
        <div className="-mr-2 flex items-center gap-1">
          <button
            onClick={onShowNavigator}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
            title="View All Steps"
            aria-label="View All Steps"
          >
            <List className="h-6 w-6" />
          </button>

          <button
            onClick={onShowIngredients}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95 md:hidden"
            title="Ingredients"
            aria-label="Ingredients"
          >
            <UtensilsCrossed className="h-6 w-6" />
          </button>

          <div className="mx-1 h-4 w-px bg-border/50" />

          <button
            onClick={onExit}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
            aria-label="Exit Cooking Mode"
            title="Exit Cooking Mode"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  )
}

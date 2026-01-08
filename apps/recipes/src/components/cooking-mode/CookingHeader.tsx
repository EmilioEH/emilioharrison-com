import React from 'react'
import { X, MoreHorizontal, List, Minus, UtensilsCrossed } from 'lucide-react'
import type { CookingSession } from '../../stores/cookingSession'

interface CookingHeaderProps {
  session: CookingSession
  totalSteps: number
  onExit: () => void
  onMinimize?: () => void
  onShowIngredients: () => void
  onShowMenu: () => void
  onShowNavigator: () => void
  onStepJump: (index: number) => void
}

export const CookingHeader: React.FC<CookingHeaderProps> = ({
  session,
  totalSteps,
  onExit,
  onMinimize,
  onShowIngredients,
  onShowMenu,
  onShowNavigator,
}) => {
  const currentStepNum = session.currentStepIdx + 1

  return (
    <div className="safe-area-pt flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        {/* Left Actions - Steps Button */}
        <div className="-ml-2">
          <button
            onClick={onShowNavigator}
            className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-transparent p-2 text-sm font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
            title="View All Steps"
          >
            <List className="h-6 w-6" />
            Steps
          </button>
        </div>

        {/* Center - Step Indicator */}
        <div className="font-display text-sm font-medium text-muted-foreground">
          Step {currentStepNum} of {totalSteps}
        </div>

        {/* Right Actions */}
        <div className="-mr-2 flex items-center">
          {/* Ingredients with Label - Mobile Only */}
          <button
            onClick={onShowIngredients}
            className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-transparent p-2 text-sm font-medium text-foreground transition-colors hover:bg-muted active:scale-95 md:hidden"
            title="Ingredients"
          >
            <UtensilsCrossed className="h-6 w-6" />
            <span className="sr-only sm:not-sr-only">Ingredients</span>
          </button>

          <div className="mx-1 h-4 w-px bg-border/50" />

          {onMinimize && (
            <button
              onClick={onMinimize}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
              aria-label="Minimize"
              title="Minimize (Keep Cooking)"
            >
              <Minus className="h-6 w-6" />
            </button>
          )}

          <button
            onClick={onShowMenu}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
            title="Options"
          >
            <MoreHorizontal className="h-6 w-6" />
          </button>

          <button
            onClick={onExit}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
            aria-label="Exit Cooking Mode"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  )
}

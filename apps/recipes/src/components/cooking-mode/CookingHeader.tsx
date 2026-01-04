import React from 'react'
import { X, MoreHorizontal, List } from 'lucide-react'
import type { CookingSession } from '../../stores/cookingSession'

interface CookingHeaderProps {
  session: CookingSession
  totalSteps: number
  onExit: () => void
  onShowIngredients: () => void
  onShowMenu: () => void
  onShowNavigator: () => void
}

export const CookingHeader: React.FC<CookingHeaderProps> = ({
  session,
  totalSteps,
  onExit,
  onShowIngredients,
  onShowMenu,
  onShowNavigator,
}) => {
  const currentStepNum = session.currentStepIdx + 1
  const progressPercent = (currentStepNum / totalSteps) * 100

  return (
    <div className="safe-area-pt flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        {/* Exit Button */}
        <button
          onClick={onExit}
          className="-ml-2 p-2 text-muted-foreground transition-transform hover:text-foreground active:scale-95"
          aria-label="Exit Cooking Mode"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Step Indicator */}
        <button
          onClick={onShowNavigator}
          className="font-display text-sm font-medium transition-colors hover:text-primary active:scale-95"
          title="Show All Steps"
        >
          Step {currentStepNum} of {totalSteps}
        </button>

        {/* Right Actions */}
        <div className="-mr-2 flex items-center gap-1">
          <button
            onClick={onShowIngredients}
            className="p-2 text-foreground transition-transform active:scale-95"
            title="Ingredients"
          >
            <List className="h-5 w-5" />
          </button>
          <button
            onClick={onShowMenu}
            className="p-2 text-foreground transition-transform active:scale-95"
            title="Options"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 w-full overflow-hidden bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  )
}

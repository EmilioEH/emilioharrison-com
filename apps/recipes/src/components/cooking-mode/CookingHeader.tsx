import React from 'react'
import { X, List, UtensilsCrossed, ArrowLeft } from 'lucide-react'
import type { CookingSession } from '../../stores/cookingSession'
import { Button } from '@/components/ui/button'

interface CookingHeaderProps {
  session: CookingSession
  title: string
  onExit: () => void
  onMinimize?: () => void
  onShowIngredients: () => void
  onShowNavigator: () => void
}

export const CookingHeader: React.FC<CookingHeaderProps> = ({
  onExit,
  onMinimize,
  onShowIngredients,
  onShowNavigator,
}) => {
  return (
    <div className="safe-area-pt flex flex-col bg-background shadow-sm transition-shadow">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        {/* Left - Back Button */}
        <div className="-ml-2">
          {onMinimize && (
            <Button onClick={onMinimize} variant="ghost" size="icon" aria-label="Back" title="Back">
              <ArrowLeft />
            </Button>
          )}
        </div>

        {/* Center - Action Buttons */}
        <div className="flex items-center gap-2">
          <Button onClick={onShowNavigator} variant="ghost" size="sm">
            <List />
            Instructions
          </Button>

          <Button onClick={onShowIngredients} variant="ghost" size="sm" className="md:hidden">
            <UtensilsCrossed />
            Ingredients
          </Button>
        </div>

        {/* Right - Exit Button */}
        <div className="-mr-2">
          <Button
            onClick={onExit}
            variant="ghost"
            size="icon"
            aria-label="Exit Cooking Mode"
            title="Exit Cooking Mode"
          >
            <X />
          </Button>
        </div>
      </div>
    </div>
  )
}

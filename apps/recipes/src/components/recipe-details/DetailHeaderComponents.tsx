import React from 'react'
import { ArrowLeft, Maximize2, Minimize2 } from 'lucide-react'
import type { CookingStage } from './types'

interface HeaderBackButtonProps {
  cookingStage: CookingStage
  setCookingStage: (stage: CookingStage) => void
  onClose: () => void
}

export const HeaderBackButton: React.FC<HeaderBackButtonProps> = ({
  cookingStage,
  setCookingStage,
  onClose,
}) => (
  <div className="flex items-center gap-2">
    <button
      onClick={cookingStage !== 'idle' ? () => setCookingStage('idle') : onClose}
      className="flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-foreground/[0.08]"
      aria-label={cookingStage !== 'idle' ? 'Back to Overview' : 'Back to Library'}
      title={cookingStage !== 'idle' ? 'Back to Overview' : 'Back to Library'}
    >
      <ArrowLeft className="h-6 w-6 text-foreground" />
    </button>
    {cookingStage !== 'idle' && (
      <span className="font-display text-xs font-medium uppercase tracking-wider text-primary">
        {cookingStage === 'pre' && 'Pre-Cooking'}
        {cookingStage === 'during' && 'Cooking'}
        {cookingStage === 'post' && 'Review'}
      </span>
    )}
  </div>
)

interface HeaderModeToggleProps {
  cookingMode: boolean
  setCookingMode: (mode: boolean) => void
  setCookingStage: (stage: CookingStage) => void
}

export const HeaderModeToggle: React.FC<HeaderModeToggleProps> = ({
  cookingMode,
  setCookingMode,
  setCookingStage,
}) => (
  <button
    onClick={() => {
      if (!cookingMode) {
        setCookingStage('pre')
      }
      setCookingMode(!cookingMode)
    }}
    className={`flex h-11 w-11 items-center justify-center rounded-full border transition ${cookingMode ? 'bg-primary-container text-primary-foreground-container border-primary' : 'text-foreground-variant border-transparent hover:text-foreground'}`}
    title="Cooking Mode (Keep Screen On)"
  >
    {cookingMode ? <Minimize2 className="h-6 w-6" /> : <Maximize2 className="h-6 w-6" />}
  </button>
)

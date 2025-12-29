import React from 'react'
import { ArrowLeft, Maximize2, Minimize2 } from 'lucide-react'
import type { CookingStage } from '../../recipe-details/DetailHeader'

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
    className={`rounded-full border p-2 transition ${cookingMode ? 'border-md-sys-color-primary bg-md-sys-color-primary-container text-md-sys-color-on-primary-container' : 'border-transparent text-md-sys-color-on-surface-variant hover:text-md-sys-color-on-surface'}`}
    title="Cooking Mode (Keep Screen On)"
  >
    {cookingMode ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
  </button>
)

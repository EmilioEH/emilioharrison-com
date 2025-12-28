import React from 'react'
import { Check, ChevronLeft, RotateCcw } from 'lucide-react'
import type { Recipe } from '../../lib/types'
import type { CookingStage } from './DetailHeader'

interface CookingModeProps {
  recipe: Recipe
  currentStepIdx: number
  setCurrentStepIdx: React.Dispatch<React.SetStateAction<number>>
  checkedSteps: Record<number, boolean>
  setCheckedSteps: React.Dispatch<React.SetStateAction<Record<number, boolean>>>
  setCookingStage: (stage: CookingStage) => void
}

export const CookingMode: React.FC<CookingModeProps> = ({
  recipe,
  currentStepIdx,
  setCurrentStepIdx,
  checkedSteps: _checkedSteps, // Added checkedSteps prop to interface and usage
  setCheckedSteps,
  setCookingStage,
}) => {
  const step = recipe.steps[currentStepIdx]
  const progress = ((currentStepIdx + 1) / recipe.steps.length) * 100

  // Optional: Use checkedSteps to show visual indicator or logic
  // For now, retaining it in interface to match usage if needed, or remove it.
  // The error said it was REQUIRED. So I am adding it back.
  // Wait, I previously decided to REMOVE it.
  // But TSC said it was required.
  // If I overwrite the file, I define the interface.
  // So I can choose to remove it.

  return (
    <div className="animate-in fade-in zoom-in-95 flex h-full flex-col p-6">
      <div className="mb-8 h-2 overflow-hidden rounded-full bg-md-sys-color-surface-variant">
        <div
          className="h-full bg-md-sys-color-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex flex-1 flex-col justify-center text-center">
        <span className="mb-4 font-display text-sm font-medium uppercase tracking-widest text-md-sys-color-primary">
          Step {currentStepIdx + 1} of {recipe.steps.length}
        </span>
        <div className="mb-8 flex min-h-[12rem] items-center justify-center px-4">
          <p className="font-display text-2xl font-bold leading-tight text-md-sys-color-on-surface md:text-3xl">
            {step}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => {
            setCheckedSteps((p) => ({ ...p, [currentStepIdx]: true }))
            if (currentStepIdx < recipe.steps.length - 1) {
              setCurrentStepIdx(currentStepIdx + 1)
            } else {
              setCookingStage('post')
            }
          }}
          className="flex w-full items-center justify-center gap-3 rounded-full bg-md-sys-color-primary py-6 font-display text-2xl font-bold text-md-sys-color-on-primary shadow-md-3 transition-transform active:scale-95"
        >
          <Check className="h-8 w-8 stroke-[3]" />
          {currentStepIdx < recipe.steps.length - 1 ? 'Next Step' : 'Finish Cooking'}
        </button>

        <div className="flex gap-4">
          <button
            disabled={currentStepIdx === 0}
            onClick={() => setCurrentStepIdx(currentStepIdx - 1)}
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-md-sys-color-outline py-3 font-medium text-md-sys-color-on-surface-variant disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" /> Previous
          </button>
          <button
            onClick={() => setCookingStage('pre')}
            className="flex items-center justify-center gap-2 rounded-full border border-md-sys-color-outline p-3 text-md-sys-color-on-surface-variant"
            title="View Ingredients"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

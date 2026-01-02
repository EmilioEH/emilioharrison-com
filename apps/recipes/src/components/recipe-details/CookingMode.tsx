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
  checkedSteps,
  setCheckedSteps,
  setCookingStage,
}) => {
  const step = recipe.steps[currentStepIdx]
  const progress = ((currentStepIdx + 1) / recipe.steps.length) * 100

  const maxChecked = Math.max(-1, ...Object.keys(checkedSteps).map(Number))
  const targetStep = Math.min(maxChecked + 1, recipe.steps.length - 1)
  const showJump = currentStepIdx < targetStep

  // Optional: Use checkedSteps to show visual indicator or logic
  // For now, retaining it in interface to match usage if needed, or remove it.
  // The error said it was REQUIRED. So I am adding it back.
  // Wait, I previously decided to REMOVE it.
  // But TSC said it was required.
  // If I overwrite the file, I define the interface.
  // So I can choose to remove it.

  return (
    <div className="flex h-full flex-col p-6 animate-in fade-in zoom-in-95">
      <div className="bg-card-variant mb-8 h-2 overflow-hidden rounded-full">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex flex-1 flex-col justify-center text-center">
        <span className="mb-2 font-display text-sm font-medium uppercase tracking-widest text-primary">
          Step {currentStepIdx + 1} of {recipe.steps.length}
        </span>
        <span className="mb-8 font-body text-xs font-medium text-muted-foreground opacity-80">
          Currently: {step.split(' ').slice(0, 5).join(' ')}...
        </span>
        <div className="mb-8 flex min-h-[12rem] items-center justify-center px-4">
          <p className="font-display text-2xl font-bold leading-tight text-foreground md:text-3xl">
            {step
              .split(
                /(\d+(?:[/.]\d+)?\s*(?:cups?|tbsp|tsp|oz|lbs?|g|kg|ml|l|cloves?|slices?|pieces?|pinch(?:es)?|cans?|jars?|bottles?|large|medium|small)?\b)/gi,
              )
              .map((part, i) =>
                // Simple heuristic: if it starts with a number, bold it.
                // The regex captures the number+unit group.
                /^\d/.test(part) ? (
                  <strong key={i} className="text-primary">
                    {part}
                  </strong>
                ) : (
                  part
                ),
              )}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {showJump && (
          <div className="absolute bottom-24 right-6 z-10">
            <button
              onClick={() => setCurrentStepIdx(targetStep)}
              className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 font-display text-sm font-bold text-primary-foreground shadow-lg transition-transform animate-in fade-in slide-in-from-bottom-2 active:scale-95"
            >
              Jump to Step {targetStep + 1} <ChevronLeft className="h-4 w-4 rotate-180" />
            </button>
          </div>
        )}
        <button
          onClick={() => {
            setCheckedSteps((p) => ({ ...p, [currentStepIdx]: true }))
            if (currentStepIdx < recipe.steps.length - 1) {
              setCurrentStepIdx(currentStepIdx + 1)
            } else {
              setCookingStage('post')
            }
          }}
          className="shadow-md-3 flex w-full items-center justify-center gap-3 rounded-full bg-primary py-6 font-display text-2xl font-bold text-primary-foreground transition-transform active:scale-95"
        >
          <Check className="h-8 w-8 stroke-[3]" />
          {currentStepIdx < recipe.steps.length - 1 ? 'Next Step' : 'Finish Cooking'}
        </button>

        <div className="flex gap-4">
          <button
            disabled={currentStepIdx === 0}
            onClick={() => setCurrentStepIdx(currentStepIdx - 1)}
            className="text-foreground-variant flex flex-1 items-center justify-center gap-2 rounded-full border border-border py-3 font-medium disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" /> Previous
          </button>
          <button
            onClick={() => setCookingStage('pre')}
            className="text-foreground-variant flex items-center justify-center gap-2 rounded-full border border-border p-3"
            title="View Ingredients"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

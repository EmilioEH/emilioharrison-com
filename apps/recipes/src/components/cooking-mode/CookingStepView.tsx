import React from 'react'
import { useStore } from '@nanostores/react'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { $cookingSession, cookingSessionActions } from '../../stores/cookingSession'
import { TimerControl } from './TimerControl'
import { getIngredientsForStep } from '../../utils/ingredientParsing'
import type { Recipe } from '../../lib/types'
import { Lightbulb } from 'lucide-react'

// Simple heuristic for tips
const getTipsForStep = (text: string): string | null => {
  const lower = text.toLowerCase()
  if (lower.includes('whisk')) return 'Tip: Whisk vigorously to incorporate air and remove lumps.'
  if (lower.includes('fold')) return 'Tip: Fold gently with a spatula to keep the mixture airy.'
  if (lower.includes('simmer')) return 'Tip: Simmer means gentle bubbles, not a rolling boil.'
  if (lower.includes('sear'))
    return 'Tip: Ensure the pan is very hot before adding meat to get a good crust.'
  if (lower.includes('rest')) return 'Tip: Letting meat rest allows juices to redistribute.'
  if (lower.includes('zest'))
    return 'Tip: Only grate the colored part of the skin, avoid the white pith.'
  return null
}
interface CookingStepViewProps {
  // We access recipe from store usually, but props can be safer for rendering
  recipe: Recipe
  onFinish?: () => void
}

export const CookingStepView: React.FC<CookingStepViewProps> = ({ recipe, onFinish }) => {
  const session = useStore($cookingSession)
  const stepIdx = session.currentStepIdx
  const step = recipe.steps[stepIdx]
  const currentStepNum = stepIdx + 1

  // Parse ingredients for this step
  const stepIngredients = getIngredientsForStep(step, recipe.ingredients)

  // Simple heuristic for timer duration (MVP)
  // Looks for "X minutes" or "X mins" in the text
  const timerMatch = step.match(/(\d+)\s*(?:minutes|mins|min)/i)
  const suggestedTimer = timerMatch ? parseInt(timerMatch[1]) : undefined

  const isLastStep = stepIdx === recipe.steps.length - 1

  const handleNext = () => {
    cookingSessionActions.completeStep(stepIdx)
    if (!isLastStep) {
      cookingSessionActions.goToStep(stepIdx + 1)
    } else {
      // Last step finished
      cookingSessionActions.completeStep(stepIdx)
      if (onFinish) onFinish()
    }
  }

  const handlePrev = () => {
    if (stepIdx > 0) {
      cookingSessionActions.goToStep(stepIdx - 1)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto pb-24 duration-300 animate-in slide-in-from-right-4">
      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* Timer Controls */}
        <TimerControl stepNumber={currentStepNum} suggestedDuration={suggestedTimer} />

        {/* Main Instruction */}
        <div className="flex min-h-[20vh] flex-col items-center justify-center gap-6">
          <p className="font-display text-3xl font-bold leading-tight text-foreground md:text-4xl">
            {step}
          </p>

          {(() => {
            const tip = getTipsForStep(step)
            if (!tip) return null
            return (
              <div className="flex items-center gap-3 rounded-xl bg-yellow-500/10 px-4 py-3 text-yellow-700 dark:text-yellow-400">
                <Lightbulb className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm font-medium">{tip}</span>
              </div>
            )
          })()}
        </div>

        {/* Contextual Ingredients */}
        {stepIngredients.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h4 className="mb-3 flex items-center gap-2 font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <span className="rounded-md bg-primary/20 p-1">🥘</span>
              Ingredients Needed
            </h4>
            <ul className="space-y-3">
              {stepIngredients.map((ing, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                  <span className="text-lg font-medium">
                    <b className="text-foreground">{ing.amount}</b>{' '}
                    <span className="text-muted-foreground">{ing.name}</span>
                    {ing.prep && (
                      <span className="italic text-muted-foreground opacity-70">, {ing.prep}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Sticky Navigation Footer */}
      <div className="safe-area-pb fixed bottom-0 left-0 right-0 z-10 flex gap-4 border-t border-border bg-background/80 p-4 backdrop-blur-xl">
        <button
          onClick={handlePrev}
          disabled={stepIdx === 0}
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-border text-foreground transition-all active:scale-95 disabled:border-transparent disabled:opacity-30"
          aria-label="Previous Step"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <button
          onClick={handleNext}
          className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary font-display text-lg font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 active:scale-95"
        >
          {isLastStep ? (
            <>
              Finish Cooking <Check className="h-5 w-5 stroke-[3]" />
            </>
          ) : (
            <>
              Next Step <ChevronRight className="h-5 w-5 stroke-[3]" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

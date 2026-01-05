import React from 'react'
import { useStore } from '@nanostores/react'
import { UtensilsCrossed } from 'lucide-react'
import { $cookingSession, cookingSessionActions } from '../../stores/cookingSession'
import { TimerControl } from './TimerControl'
import { getIngredientsForStep } from '../../utils/ingredientParsing'
import { Card, CardDescription } from '../ui/card'
import type { Recipe } from '../../lib/types'

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

  // Parse ingredients for this step: Check explicit mapping first, then fallback to heuristic
  const stepIngredients =
    recipe.stepIngredients && recipe.stepIngredients[stepIdx]
      ? recipe.stepIngredients[stepIdx].indices.map((idx) => recipe.ingredients[idx])
      : getIngredientsForStep(step, recipe.ingredients)

  // Simple heuristic for timer duration (MVP)
  // Looks for "X minutes" or "X mins" in the text
  const timerMatch = step.match(/(\d+)\s*(?:minutes|mins|min)/i)
  const suggestedTimer = timerMatch ? parseInt(timerMatch[1]) : undefined

  const isLastStep = stepIdx === recipe.steps.length - 1
  const prevStepText = stepIdx > 0 ? recipe.steps[stepIdx - 1] : null
  const nextStepText = !isLastStep ? recipe.steps[stepIdx + 1] : null

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
        {/* Main Instruction Area */}
        <div className="flex min-h-[40vh] flex-col justify-center gap-8 py-4">
          {/* Previous Step Preview */}
          {prevStepText && (
            <Card
              onClick={handlePrev}
              className="cursor-pointer border-dashed bg-muted/30 p-4 opacity-50 transition-all hover:opacity-80 hover:shadow-md"
            >
              <span className="mb-1 block font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Step {currentStepNum - 1}
              </span>
              <CardDescription className="line-clamp-2 text-sm">{prevStepText}</CardDescription>
            </Card>
          )}

          {/* Current Step */}
          <div className="flex flex-col items-center gap-6 py-4 text-center">
            <p className="font-display text-3xl font-bold leading-tight text-foreground md:text-4xl">
              {step}
            </p>
          </div>

          {/* Next Step Preview */}
          {nextStepText && (
            <Card
              onClick={handleNext}
              className="cursor-pointer border-dashed bg-muted/30 p-4 opacity-50 transition-all hover:opacity-80 hover:shadow-md"
            >
              <span className="mb-1 block font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Step {currentStepNum + 1}
              </span>
              <CardDescription className="line-clamp-2 text-sm">{nextStepText}</CardDescription>
            </Card>
          )}
        </div>

        {/* Contextual Ingredients */}
        {stepIngredients.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h4 className="mb-3 flex items-center gap-2 font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <span className="rounded-md bg-primary/20 p-1">
                <UtensilsCrossed className="size-3.5 text-primary" />
              </span>
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
          className="flex h-14 min-w-[100px] items-center justify-center rounded-2xl border-2 border-border text-base font-bold text-foreground transition-all active:scale-95 disabled:border-transparent disabled:opacity-0"
        >
          Previous
        </button>

        <button
          onClick={handleNext}
          className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 active:scale-95"
        >
          {isLastStep ? 'Finish Cooking' : 'Next Step'}
        </button>
      </div>
    </div>
  )
}

import React from 'react'
import { useStore } from '@nanostores/react'
import { motion, AnimatePresence } from 'framer-motion'
import { UtensilsCrossed } from 'lucide-react'
import { $cookingSession, cookingSessionActions } from '../../stores/cookingSession'
import { TimerControl } from './TimerControl'
import { Stack, Inline } from '../ui/layout'
import { getIngredientsForStep } from '../../utils/ingredientParsing'
import type { Recipe } from '../../lib/types'

interface CookingStepViewProps {
  // We access recipe from store usually, but props can be safer for rendering
  recipe: Recipe
  onFinish?: () => void
  direction?: number
}

// Animation variants
const slideVariants = {
  enter: (direction: number) => ({
    y: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    y: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    y: direction < 0 ? '100%' : '-100%',
    opacity: 0,
  }),
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
}

export const CookingStepView: React.FC<CookingStepViewProps> = ({
  recipe,
  onFinish,
  direction = 0,
}) => {
  const session = useStore($cookingSession)
  const stepIdx = session.currentStepIdx
  const step = recipe.steps[stepIdx]
  const currentStepNum = stepIdx + 1

  // Parse ingredients for this step
  const stepIngredients =
    recipe.stepIngredients && recipe.stepIngredients[stepIdx]
      ? recipe.stepIngredients[stepIdx].indices.map((idx) => recipe.ingredients[idx])
      : getIngredientsForStep(step, recipe.ingredients)

  const isLastStep = stepIdx === recipe.steps.length - 1
  const prevStepText = stepIdx > 0 ? recipe.steps[stepIdx - 1] : null
  const nextStepText = !isLastStep ? recipe.steps[stepIdx + 1] : null

  // Smart timer parsing: "3-5 minutes" -> 4, "10 mins" -> 10
  const parseTimer = (text: string): number | undefined => {
    // Match range: "3 to 5 minutes", "3-5 mins"
    const rangeMatch = text.match(/(\d+)\s*(?:-|to)\s*(\d+)\s*(?:minutes|mins|min)/i)
    if (rangeMatch) {
      const min = parseInt(rangeMatch[1])
      const max = parseInt(rangeMatch[2])
      return Math.round((min + max) / 2)
    }
    // Match single: "10 minutes"
    const singleMatch = text.match(/(\d+)\s*(?:minutes|mins|min)/i)
    if (singleMatch) {
      return parseInt(singleMatch[1])
    }
    return undefined
  }

  const suggestedTimer = parseTimer(step)

  const handleNext = () => {
    cookingSessionActions.completeStep(stepIdx)
    if (!isLastStep) {
      cookingSessionActions.goToStep(stepIdx + 1)
    } else {
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
    <div className="flex h-full flex-col">
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={stepIdx}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 200, damping: 25, mass: 1 }}
            className="absolute inset-0 flex flex-col overflow-y-auto pb-6"
          >
            <Stack spacing="lg" className="flex-1 p-6">
              {/* Timer Controls */}
              <TimerControl stepNumber={currentStepNum} suggestedDuration={suggestedTimer} />

              {/* Main Instruction Area */}
              <div className="flex flex-1 flex-col justify-center py-4">
                <Stack spacing="xl" className="w-full">
                  {/* Previous Step Preview */}
                  {prevStepText && (
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="group w-full cursor-pointer rounded-xl border border-dashed border-border/50 bg-muted/20 p-4 text-left transition-all hover:bg-muted/40 active:scale-95"
                    >
                      <span className="mb-1 block font-display text-xs font-bold uppercase tracking-widest text-muted-foreground group-hover:text-primary">
                        Previous: Step {currentStepNum - 1}
                      </span>
                      <p className="line-clamp-1 text-sm text-muted-foreground opacity-60">
                        {prevStepText}
                      </p>
                    </button>
                  )}

                  {/* Current Step */}
                  <Stack spacing="lg" className="items-center py-4 text-center">
                    <p className="font-display text-3xl font-bold leading-tight text-foreground md:text-4xl">
                      {step}
                    </p>
                  </Stack>

                  {/* Next Step Preview */}
                  {nextStepText && (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="group w-full cursor-pointer rounded-xl border border-dashed border-border/50 bg-muted/20 p-4 text-left transition-all hover:bg-muted/40 active:scale-95"
                    >
                      <span className="mb-1 block font-display text-xs font-bold uppercase tracking-widest text-muted-foreground group-hover:text-primary">
                        Next: Step {currentStepNum + 1}
                      </span>
                      <p className="line-clamp-1 text-sm text-muted-foreground opacity-60">
                        {nextStepText}
                      </p>
                    </button>
                  )}
                </Stack>
              </div>

              {/* Contextual Ingredients */}
              {stepIngredients.length > 0 && (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                >
                  <h4 className="mb-3 flex items-center gap-2 font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    <span className="rounded-md bg-primary/20 p-1">
                      <UtensilsCrossed className="size-3.5 text-primary" />
                    </span>
                    Ingredients Needed
                  </h4>
                  <Stack as="ul" spacing="sm">
                    {stepIngredients.map((ing, i) => (
                      <motion.li key={i} variants={itemVariants} className="flex items-start gap-3">
                        <div className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                        <span className="text-lg font-medium">
                          <b className="text-foreground">{ing.amount}</b>{' '}
                          <span className="text-muted-foreground">{ing.name}</span>
                          {ing.prep && (
                            <span className="italic text-muted-foreground opacity-70">
                              , {ing.prep}
                            </span>
                          )}
                        </span>
                      </motion.li>
                    ))}
                  </Stack>
                </motion.div>
              )}
            </Stack>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Static Navigation Footer */}
      <div className="safe-area-pb z-10 border-t border-border bg-background/80 p-4 backdrop-blur-xl">
        <Inline spacing="md">
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
        </Inline>
      </div>
    </div>
  )
}

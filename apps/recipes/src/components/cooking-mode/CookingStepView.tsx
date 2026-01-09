import React from 'react'
import { useStore } from '@nanostores/react'
import { motion, AnimatePresence } from 'framer-motion'
import { UtensilsCrossed } from 'lucide-react'
import { $cookingSession, cookingSessionActions } from '../../stores/cookingSession'
import { TimerControl } from './TimerControl'
import { PrepStep } from './PrepStep'
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

  // STEP 0: PREP
  if (stepIdx === 0) {
    const handleNext = () => {
      cookingSessionActions.completeStep(0)
      if (recipe.steps.length === 0) {
        if (onFinish) onFinish()
      } else {
        cookingSessionActions.goToStep(1)
      }
    }

    return (
      <div className="flex h-full flex-col">
        <div className="relative flex-1 overflow-hidden">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key="prep"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 200, damping: 25, mass: 1 }}
              className="absolute inset-0 flex flex-col"
            >
              <PrepStep recipe={recipe} onNext={handleNext} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    )
  }

  // INSTRUCTION STEPS (Indices 1..N)
  // Shift index back by 1 to access recipe data
  const instructionIdx = stepIdx - 1
  const step = recipe.steps[instructionIdx]
  const currentStepNum = stepIdx // Display as Step 1 (Index 1) matches logic? No, if visual Step 1 is Index 1...
  // Wait, if Prep is Step 0.
  // Then Step 1 is "Index 1".
  // Recipe instruction #0 is at Index 1.
  // Display "Step 1" makes sense.
  // But logic needs instruction[instructionIdx].

  // Boundary check to fail gracefully if step is undefined (e.g. at end)
  if (!step) {
    // If we are at stepIdx = recipe.steps.length + 1? No we capped at length.
    // If recipe has 3 steps. max index is 3.
    // 0=Prep. 1=Inst0. 2=Inst1. 3=Inst2.
    // So instructionIdx = 3-1 = 2 (valid).
    // Works.
  }

  // Parse ingredients for this step
  const stepIngredients =
    recipe.stepIngredients && recipe.stepIngredients[instructionIdx]
      ? recipe.stepIngredients[instructionIdx].indices.map((idx) => recipe.ingredients[idx])
      : getIngredientsForStep(step, recipe.ingredients)

  const isLastStep = instructionIdx === recipe.steps.length - 1
  const prevStepText = instructionIdx > 0 ? recipe.steps[instructionIdx - 1] : 'Prep Ingredients'
  const nextStepText = !isLastStep ? recipe.steps[instructionIdx + 1] : null

  // Smart timer parsing
  const parseTimer = (text: string): number | undefined => {
    // ... (keep regex logic)
    const rangeMatch = text.match(/(\d+)\s*(?:-|to)\s*(\d+)\s*(?:minutes|mins|min)/i)
    if (rangeMatch) {
      const min = parseInt(rangeMatch[1])
      const max = parseInt(rangeMatch[2])
      return Math.round((min + max) / 2)
    }
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
    cookingSessionActions.goToStep(stepIdx - 1) // Logic works, goes to 0 (Prep) if needed
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

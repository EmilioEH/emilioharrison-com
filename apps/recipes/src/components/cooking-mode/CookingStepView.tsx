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
  recipe: Recipe
  onFinish?: () => void
  direction?: number
}

// Carousel position variants - using pixel-based offsets for consistent spacing
const PREVIEW_CARD_HEIGHT = 80 // Approximate height of preview cards
const GAP = 24 // Space between cards

const carouselVariants = {
  previous: {
    y: -(PREVIEW_CARD_HEIGHT + GAP + 60), // Position above current
    scale: 1,
    opacity: 0.6,
    zIndex: 1,
  },
  current: {
    y: 0,
    scale: 1,
    opacity: 1,
    zIndex: 10,
  },
  next: {
    y: PREVIEW_CARD_HEIGHT + GAP + 60, // Position below current
    scale: 1,
    opacity: 0.6,
    zIndex: 1,
  },
  exitUp: {
    y: -(PREVIEW_CARD_HEIGHT * 2 + GAP * 2 + 100),
    opacity: 0,
    zIndex: 0,
  },
  exitDown: {
    y: PREVIEW_CARD_HEIGHT * 2 + GAP * 2 + 100,
    opacity: 0,
    zIndex: 0,
  },
  enterFromTop: {
    y: -(PREVIEW_CARD_HEIGHT * 2 + GAP * 2 + 100),
    opacity: 0,
    zIndex: 0,
  },
  enterFromBottom: {
    y: PREVIEW_CARD_HEIGHT * 2 + GAP * 2 + 100,
    opacity: 0,
    zIndex: 0,
  },
}

// Prep step slide variants (keep original for prep)
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

// Preview card for previous/next steps (styled like original buttons)
interface PreviewCardProps {
  stepText: string
  stepNumber: number
  label: 'Previous' | 'Next'
  onClick: () => void
}

const PreviewCard: React.FC<PreviewCardProps> = ({ stepText, stepNumber, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group w-full cursor-pointer rounded-xl border border-dashed border-border/50 bg-muted/20 p-4 text-left transition-all hover:bg-muted/40 active:scale-95"
  >
    <span className="mb-1 block font-display text-xs font-bold uppercase tracking-widest text-muted-foreground group-hover:text-primary">
      {label}: Step {stepNumber}
    </span>
    <p className="line-clamp-1 text-sm text-muted-foreground opacity-60">{stepText}</p>
  </button>
)

// Current step content (plain text like original)
interface CurrentStepContentProps {
  stepText: string
  stepNumber: number
  recipe: Recipe
  instructionIdx: number
}

const CurrentStepContent: React.FC<CurrentStepContentProps> = ({
  stepText,
  stepNumber,
  recipe,
  instructionIdx,
}) => {
  // Get ingredients for this step
  const stepIngredients =
    recipe.stepIngredients && recipe.stepIngredients[instructionIdx]
      ? recipe.stepIngredients[instructionIdx].indices.map((idx) => recipe.ingredients[idx])
      : getIngredientsForStep(stepText, recipe.ingredients)

  // Smart timer parsing
  const parseTimer = (text: string): number | undefined => {
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

  const suggestedTimer = parseTimer(stepText)

  return (
    <Stack spacing="lg" className="w-full">
      {/* Timer Controls */}
      <TimerControl stepNumber={stepNumber} suggestedDuration={suggestedTimer} />

      {/* Current Step - Plain Text */}
      <Stack spacing="lg" className="items-center py-4 text-center">
        <p className="font-display text-3xl font-bold leading-tight text-foreground md:text-4xl">
          {stepText}
        </p>
      </Stack>

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
                    <span className="italic text-muted-foreground opacity-70">, {ing.prep}</span>
                  )}
                </span>
              </motion.li>
            ))}
          </Stack>
        </motion.div>
      )}
    </Stack>
  )
}

export const CookingStepView: React.FC<CookingStepViewProps> = ({
  recipe,
  onFinish,
  direction = 0,
}) => {
  const session = useStore($cookingSession)
  const stepIdx = session.currentStepIdx

  // STEP 0: PREP - Keep original behavior
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

  // INSTRUCTION STEPS with Carousel
  const instructionIdx = stepIdx - 1
  const step = recipe.steps[instructionIdx]

  if (!step) return null

  const isLastStep = instructionIdx === recipe.steps.length - 1
  const isFirstInstruction = instructionIdx === 0

  // Navigation handlers
  const handleNext = () => {
    cookingSessionActions.completeStep(stepIdx)
    if (!isLastStep) {
      cookingSessionActions.goToStep(stepIdx + 1)
    } else {
      if (onFinish) onFinish()
    }
  }

  const handlePrev = () => {
    cookingSessionActions.goToStep(stepIdx - 1)
  }

  // Determine which cards to show
  const prevStepText = isFirstInstruction ? 'Prep Ingredients' : recipe.steps[instructionIdx - 1]
  const nextStep = isLastStep ? null : recipe.steps[instructionIdx + 1]

  // Calculate positions for animation
  const getInitialPosition = (pos: 'previous' | 'current' | 'next') => {
    if (direction > 0) {
      // Moving forward: new cards enter from bottom
      if (pos === 'previous') return 'current'
      if (pos === 'current') return 'next'
      if (pos === 'next') return 'enterFromBottom'
    } else if (direction < 0) {
      // Moving backward: new cards enter from top
      if (pos === 'previous') return 'enterFromTop'
      if (pos === 'current') return 'previous'
      if (pos === 'next') return 'current'
    }
    return pos
  }

  return (
    <div className="flex h-full flex-col">
      {/* Carousel Container */}
      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto p-6">
          <div className="relative flex w-full max-w-2xl flex-col items-center">
            <AnimatePresence mode="sync" initial={false}>
              {/* Previous Step Preview */}
              <motion.div
                key={`prev-${stepIdx}`}
                initial={getInitialPosition('previous')}
                animate="previous"
                exit="exitUp"
                variants={carouselVariants}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute w-full"
              >
                <PreviewCard
                  stepText={prevStepText}
                  stepNumber={stepIdx - 1}
                  label="Previous"
                  onClick={handlePrev}
                />
              </motion.div>

              {/* Current Step - Main Content */}
              <motion.div
                key={`current-${stepIdx}`}
                initial={getInitialPosition('current')}
                animate="current"
                exit={direction > 0 ? 'exitUp' : 'exitDown'}
                variants={carouselVariants}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="w-full"
              >
                <CurrentStepContent
                  stepText={step}
                  stepNumber={stepIdx}
                  recipe={recipe}
                  instructionIdx={instructionIdx}
                />
              </motion.div>

              {/* Next Step Preview */}
              {nextStep && (
                <motion.div
                  key={`next-${stepIdx}`}
                  initial={getInitialPosition('next')}
                  animate="next"
                  exit="exitDown"
                  variants={carouselVariants}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="absolute w-full"
                >
                  <PreviewCard
                    stepText={nextStep}
                    stepNumber={stepIdx + 1}
                    label="Next"
                    onClick={handleNext}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Static Navigation Footer */}
      <div className="safe-area-pb z-10 border-t border-border bg-background/80 p-4 backdrop-blur-xl">
        <Inline spacing="md">
          <button
            type="button"
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

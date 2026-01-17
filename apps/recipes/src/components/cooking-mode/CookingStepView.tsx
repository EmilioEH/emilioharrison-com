import React from 'react'
import { useStore } from '@nanostores/react'
import { motion, AnimatePresence } from 'framer-motion'
import { UtensilsCrossed, Check } from 'lucide-react'
import { $cookingSession, cookingSessionActions } from '../../stores/cookingSession'
import { TimerControl } from './TimerControl'
import { PrepStep } from './PrepStep'
import { Stack, Inline } from '../ui/layout'
import { cn } from '../../lib/utils'
import { getIngredientsForStep } from '../../utils/ingredientParsing'
import type { Recipe, StructuredStep } from '../../lib/types'

interface CookingStepViewProps {
  recipe: Recipe
  onFinish?: () => void
  direction?: number
}

// Carousel position variants - using pixel-based offsets for consistent spacing

const getVariantForOffset = (offset: number) => {
  if (offset === 0) return 'center'
  if (offset === -1) return 'top'
  if (offset === 1) return 'bottom'
  if (offset < -1) return 'hiddenTop'
  if (offset > 1) return 'hiddenBottom'
  return 'hidden'
}

const carouselVariants = {
  center: {
    y: '-50%',
    scale: 1,
    opacity: 1,
    zIndex: 10,
    display: 'block',
  },
  top: {
    y: 'calc(-50% - 250px)', // Gap (24) + Height (approx 200) + Extra
    scale: 1,
    opacity: 0.6,
    zIndex: 1,
    display: 'block',
  },
  bottom: {
    y: 'calc(-50% + 250px)',
    scale: 1,
    opacity: 0.6,
    zIndex: 1,
    display: 'block',
  },
  hiddenTop: {
    y: 'calc(-50% - 500px)',
    opacity: 0,
    zIndex: 0,
    transitionEnd: { display: 'none' },
  },
  hiddenBottom: {
    y: 'calc(-50% + 500px)',
    opacity: 0,
    zIndex: 0,
    transitionEnd: { display: 'none' },
  },
  hidden: {
    opacity: 0,
    zIndex: 0,
    display: 'none',
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
  structuredStep?: StructuredStep
}

const CurrentStepContent: React.FC<CurrentStepContentProps> = ({
  stepText,
  stepNumber,
  recipe,
  instructionIdx,
  structuredStep,
}) => {
  // Get ingredients for this step
  const stepIngredients =
    recipe.stepIngredients && recipe.stepIngredients[instructionIdx]
      ? recipe.stepIngredients[instructionIdx].indices.map((idx) => recipe.ingredients[idx])
      : getIngredientsForStep(stepText, recipe.ingredients)

  // Substep State
  // We use local state for now. In a perfect world, this would be in cookingSession store,
  // but for V1 we'll let it be ephemeral per visual instance.
  const [completedSubsteps, setCompletedSubsteps] = React.useState<Record<number, boolean>>({})

  const toggleSubstep = (idx: number) => {
    setCompletedSubsteps((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }))
  }

  // Effect: Auto-mark substeps if the main step is somehow "done" (not applicable here as we navigate away)
  // But maybe we want to play a sound when all are done? usage for later.

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

  // Determine font size based on length
  const getFontSize = (text: string) => {
    const len = text.length
    if (len < 50) return 'text-3xl md:text-4xl text-center'
    if (len < 120) return 'text-2xl md:text-3xl text-center'
    if (len < 250) return 'text-xl md:text-2xl text-left'
    return 'text-lg md:text-xl text-left'
  }

  const mainTextClass = getFontSize(stepText)
  const hasSubsteps = structuredStep?.substeps && structuredStep.substeps.length > 0

  return (
    <Stack spacing="lg" className="w-full">
      {/* Timer Controls */}
      <TimerControl stepNumber={stepNumber} suggestedDuration={suggestedTimer} />

      {/* Main Instruction Text (Show only if no substeps OR as a header) */}
      {/* Design choice: If we have substeps, the main text serves as the "Goal" or "Summary".
          If it's short, it's a Title. If it's long, it might be redundant with substeps.
          Let's show it, but maybe smaller if we have substeps?
          Actually, the Mockup showed "Prepare the Aromatics" as title, then the list.
          Here 'stepText' IS the full text. `structuredStep.title` is the short one.
      */}

      {structuredStep?.title && (
        <h2 className="text-center font-display text-2xl font-bold text-foreground">
          {structuredStep.title}
        </h2>
      )}

      {!hasSubsteps && (
        <Stack spacing="lg" className="items-center py-4">
          <p className={`font-display font-bold leading-tight text-foreground ${mainTextClass}`}>
            {structuredStep?.highlightedText ? (
              <span
                dangerouslySetInnerHTML={{
                  __html: structuredStep.highlightedText.replace(
                    /\*\*(.*?)\*\*/g,
                    '<span class="text-primary">$1</span>',
                  ),
                }}
              />
            ) : (
              stepText
            )}
          </p>
        </Stack>
      )}

      {/* Nested Substeps Checklist */}
      {hasSubsteps && (
        <Stack spacing="md" className="mt-4 w-full">
          {(structuredStep?.substeps || []).map(
            (sub: { text: string; action: string; targets: string[] }, i: number) => {
              const isChecked = completedSubsteps[i]
              return (
                <motion.button
                  key={i}
                  onClick={() => toggleSubstep(i)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={cn(
                    'active:scale-98 group flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all',
                    isChecked
                      ? 'border-primary/20 bg-primary/5'
                      : 'border-border bg-card hover:border-primary/50',
                  )}
                >
                  {/* Custom Checkbox */}
                  <div
                    className={cn(
                      'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                      isChecked
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground/30 text-transparent group-hover:border-primary/50',
                    )}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </div>

                  {/* Substep Text with Highlighted Action */}
                  <span
                    className={cn(
                      'flex-1 text-lg font-medium leading-snug',
                      isChecked
                        ? 'text-muted-foreground line-through opacity-80'
                        : 'text-foreground',
                    )}
                  >
                    {/* Highlight the Action Verb if it exists at start of string or in text */}
                    {sub.action ? (
                      <span>
                        {sub.text
                          .split(new RegExp(`(${sub.action})`, 'i'))
                          .map((part: string, idx: number) =>
                            part.toLowerCase() === sub.action.toLowerCase() ? (
                              <span key={idx} className={isChecked ? '' : 'text-primary'}>
                                {part}
                              </span>
                            ) : (
                              part
                            ),
                          )}
                      </span>
                    ) : (
                      sub.text
                    )}
                  </span>
                </motion.button>
              )
            },
          )}
        </Stack>
      )}

      {/* Contextual Ingredients (Only show if NOT in substep mode, or at bottom?) 
          Actually, substeps usually mention ingredients. But mapping is still useful.
      */}
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
  // We offset instructionIdx so that 0 matches the first instruction (which is step 1 in the global session)
  const currentInstructionIdx = stepIdx - 1
  const isLastStep = currentInstructionIdx === recipe.steps.length - 1

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

  // Jump handler (for preview cards)
  const handleJumpTo = (targetStepIdx: number) => {
    if (targetStepIdx === 0) {
      cookingSessionActions.goToStep(0)
    } else {
      cookingSessionActions.goToStep(targetStepIdx)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Carousel Container */}
      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto p-6">
          <div className="relative flex h-full w-full max-w-2xl flex-col items-center">
            {/* Render ALL steps (or windowed subset) but keep them in DOM with stable keys */},
            {/* Render ALL steps (or windowed subset) but keep them in DOM with stable keys */}
            {recipe.steps.map((stepText, idx) => {
              const offset = idx - currentInstructionIdx
              const variantName = getVariantForOffset(offset)

              // Global Step Index for this instruction (instruction 0 is step 1)
              const thisStepIdx = idx + 1

              return (
                <motion.div
                  key={`step-${idx}`} // STABLE KEY
                  animate={variantName}
                  initial={false} // Important: animate from current state not initial
                  variants={carouselVariants}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="absolute top-1/2 w-full"
                  style={{
                    pointerEvents: offset === 0 ? 'auto' : 'none', // Only current card is interactive
                  }}
                >
                  {/* 
                                Content Switching Logic:
                                - offset -1 (Top): Show Preview Card for THIS step
                                - offset 0 (Center): Show Full Content for THIS step
                                - offset 1 (Bottom): Show Preview Card for THIS step
                            */}

                  {/* CASE 1: Top Card (Previous) */}
                  {offset === -1 && (
                    <div className="pointer-events-auto">
                      <PreviewCard
                        stepText={stepText}
                        stepNumber={thisStepIdx}
                        label="Previous"
                        onClick={() => handleJumpTo(thisStepIdx)}
                      />
                    </div>
                  )}

                  {/* CASE 2: Prep Card (Special Case: If we are at first instruction, show Prep as previous) */}
                  {currentInstructionIdx === 0 && offset === 0 && (
                    <motion.div
                      className="absolute left-0 top-0 w-full"
                      animate="top"
                      variants={carouselVariants}
                    >
                      <div className="pointer-events-auto">
                        <PreviewCard
                          stepText="Prep Ingredients"
                          stepNumber={0}
                          label="Previous"
                          onClick={() => handleJumpTo(0)}
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* CASE 3: Center Card (Current) */}
                  {offset === 0 && (
                    <CurrentStepContent
                      stepText={stepText}
                      stepNumber={thisStepIdx}
                      recipe={recipe}
                      instructionIdx={idx}
                      structuredStep={recipe.structuredSteps?.[idx]}
                    />
                  )}

                  {/* CASE 4: Bottom Card (Next) */}
                  {offset === 1 && (
                    <div className="pointer-events-auto">
                      <PreviewCard
                        stepText={stepText}
                        stepNumber={thisStepIdx}
                        label="Next"
                        onClick={() => handleJumpTo(thisStepIdx)}
                      />
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Static Navigation Footer */}
      <div className="safe-area-pb z-10 border-t border-border bg-background/80 p-4 pb-12 backdrop-blur-xl">
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

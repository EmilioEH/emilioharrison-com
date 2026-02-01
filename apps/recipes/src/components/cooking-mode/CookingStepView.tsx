import React from 'react'
import { useStore } from '@nanostores/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, AlertTriangle } from 'lucide-react'
import {
  $cookingSession,
  cookingSessionActions,
  type CookingSession,
} from '../../stores/cookingSession'
import { TimerControl } from './TimerControl'
import { PrepStep } from './PrepStep'
import { Stack, Inline } from '../ui/layout'
import { cn } from '../../lib/utils'
import type { Recipe, StructuredStep } from '../../lib/types'

// Play a quick "ding" sound when completing a step
const playStepCompleteSound = () => {
  try {
    const AudioCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtor) return

    const ctx = new AudioCtor()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    // Quick "ding" - higher pitch than timer beep, short duration
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1200, ctx.currentTime)
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)

    osc.start()
    osc.stop(ctx.currentTime + 0.2)
  } catch {
    // Silently fail if audio not supported
  }
}

// Error Boundary to gracefully handle crashes in step content
interface StepErrorBoundaryProps {
  stepText: string
  stepNumber: number
  children: React.ReactNode
}

interface StepErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class StepErrorBoundary extends React.Component<StepErrorBoundaryProps, StepErrorBoundaryState> {
  constructor(props: StepErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): StepErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[CookingMode] Step rendering error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI: Show the step text in a simple format
      return (
        <Stack spacing="lg" className="w-full">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <Inline spacing="sm" className="mb-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Display Error</span>
            </Inline>
            <p className="text-sm text-muted-foreground">
              There was an issue displaying this step. Showing plain text:
            </p>
          </div>
          <Stack spacing="lg" className="items-center py-4">
            <h2 className="text-center font-display text-lg font-bold text-foreground">
              Step {this.props.stepNumber}
            </h2>
            <p className="text-center font-display text-xl font-bold leading-tight text-foreground">
              {this.props.stepText}
            </p>
          </Stack>
        </Stack>
      )
    }

    return this.props.children
  }
}

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
    y: 0,
    scale: 1,
    opacity: 1,
    zIndex: 10,
    display: 'block',
  },
  top: {
    y: '-250px',
    scale: 1,
    opacity: 0.6,
    zIndex: 1,
    display: 'block',
  },
  bottom: {
    y: '250px',
    scale: 1,
    opacity: 0.6,
    zIndex: 1,
    display: 'block',
  },
  hiddenTop: {
    y: '-500px',
    opacity: 0,
    zIndex: 0,
    transitionEnd: { display: 'none' },
  },
  hiddenBottom: {
    y: '500px',
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

// ...

// In the component logic (around line 432):
// <div className="relative flex w-full max-w-2xl flex-1 flex-col items-center"> <!-- Removed justify-center -->

// In the map loop (around line 450):
/*
 return (
    <motion.div
        key={`step-${idx}`}
        layout // Enable layout animations for smooth position switching
        animate={variantName}
        initial={false}
        variants={carouselVariants}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={cn(
            "w-full transition-[position]", // Add width
            offset === 0 ? "relative my-auto" : "absolute top-1/2" // Switch positioning
        )}
        style={{
            pointerEvents: offset === 0 ? 'auto' : 'none',
        }}
    >
*/

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
    className="group mt-4 w-full cursor-pointer rounded-xl border border-dashed border-border/60 bg-muted/30 p-4 text-left transition-all hover:bg-muted/50 active:scale-95"
  >
    <span className="mb-1 block font-display text-xs font-bold uppercase tracking-widest text-foreground/70 group-hover:text-primary">
      {label}: Step {stepNumber}
    </span>
    <p className="line-clamp-1 text-sm text-foreground/60">{stepText}</p>
  </button>
)

// Current step content (plain text like original)
interface CurrentStepContentProps {
  stepText: string
  stepNumber: number
  recipe: Recipe
  instructionIdx: number
  structuredStep?: StructuredStep
  session: CookingSession // Proper type for session
}

import { renderHighlightedInstruction } from '../../lib/instruction-utils'

const CurrentStepContent: React.FC<CurrentStepContentProps> = ({
  stepText,
  stepNumber,
  recipe,
  instructionIdx,
  structuredStep,
  session,
}) => {
  // Use shared highlighting utility
  const renderContent = (text: string) => {
    return renderHighlightedInstruction(
      text,
      Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
      Array.isArray(recipe.stepIngredients?.[instructionIdx]?.indices)
        ? recipe.stepIngredients[instructionIdx].indices
        : [],
    )
  }

  // Substep State using global store
  const toggleSubstep = (subIdx: number) => {
    cookingSessionActions.toggleSubstep(instructionIdx, subIdx)
  }

  // Find the group header for this step (if Smart View grouping exists)
  const currentGroup = recipe.stepGroups?.find(
    (group) => instructionIdx >= group.startIndex && instructionIdx <= group.endIndex,
  )
  const displayTitle = currentGroup?.header || structuredStep?.title

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

  // Parse substeps - they may be stored as JSON string in Firestore
  type Substep = { text: string; action: string; targets: string[] }
  const getSubsteps = (): Substep[] => {
    const raw = structuredStep?.substeps
    if (!raw) return []
    if (Array.isArray(raw)) return raw as Substep[]
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
    return []
  }

  const substeps = getSubsteps()
  const hasSubsteps = substeps.length > 0

  return (
    <Stack spacing="lg" className="w-full">
      {/* ... */}
      {displayTitle && (
        <h2 className="text-center font-display text-2xl font-bold text-foreground">
          {displayTitle}
        </h2>
      )}

      {!hasSubsteps && (
        <Stack spacing="lg" className="items-center py-4">
          <p className={`font-display font-bold leading-tight text-foreground ${mainTextClass}`}>
            {renderContent(structuredStep?.highlightedText || stepText)}
          </p>
        </Stack>
      )}

      {/* Nested Substeps Checklist */}
      {hasSubsteps && (
        <Stack spacing="md" className="mt-4 w-full">
          {substeps.map((sub, i) => {
            const isChecked = session.checkedSubsteps[`${instructionIdx}-${i}`] || false
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
                  <Check
                    className="h-3.5 w-3.5"
                    strokeWidth={3}
                    stroke="currentColor"
                    fill="none"
                  />
                </div>

                {/* Substep Text with Highlighted Action & Ingredients */}
                <span
                  className={cn(
                    'flex-1 text-lg font-medium leading-snug',
                    isChecked ? 'text-muted-foreground line-through opacity-80' : 'text-foreground',
                  )}
                >
                  {renderContent(sub.text)}
                </span>
              </motion.button>
            )
          })}
        </Stack>
      )}

      <TimerControl stepNumber={stepNumber} suggestedDuration={suggestedTimer} />

      {/* Contextual Ingredients (Moved to Sticky Drawer) */}
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
      playStepCompleteSound()
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
    playStepCompleteSound()
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
        <div className="absolute inset-0 flex flex-col items-center overflow-y-auto px-6 pb-24 pt-4">
          <div className="relative flex w-full max-w-2xl flex-1 flex-col items-center">
            {/* Render ALL steps (or windowed subset) but keep them in DOM with stable keys */}
            {recipe.steps.map((stepText, idx) => {
              const offset = idx - currentInstructionIdx
              const variantName = getVariantForOffset(offset)

              // Global Step Index for this instruction (instruction 0 is step 1)
              const thisStepIdx = idx + 1

              return (
                <motion.div
                  key={`step-${idx}`} // STABLE KEY
                  layout
                  animate={variantName}
                  initial={false} // Important: animate from current state not initial
                  variants={carouselVariants}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className={cn(
                    'w-full transition-[position]',
                    offset === 0 ? 'relative my-auto' : 'absolute top-1/2',
                  )}
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

                  {/* CASE 1: Top Card (Previous) - Hidden on mobile to prevent overlap */}
                  {offset === -1 && (
                    <div className="pointer-events-auto hidden md:block">
                      <PreviewCard
                        stepText={stepText}
                        stepNumber={thisStepIdx}
                        label="Previous"
                        onClick={() => handleJumpTo(thisStepIdx)}
                      />
                    </div>
                  )}

                  {/* CASE 2: Prep Card (Special Case - Hidden on mobile) */}
                  {currentInstructionIdx === 0 && offset === 0 && (
                    <motion.div
                      className="absolute left-0 top-0 hidden w-full md:block"
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
                    <StepErrorBoundary stepText={stepText} stepNumber={thisStepIdx}>
                      <CurrentStepContent
                        stepText={stepText}
                        stepNumber={thisStepIdx}
                        recipe={recipe}
                        instructionIdx={idx}
                        structuredStep={recipe.structuredSteps?.[idx]}
                        session={session}
                      />
                    </StepErrorBoundary>
                  )}

                  {/* CASE 4: Bottom Card (Next) - Hidden on mobile to prevent overlap */}
                  {offset === 1 && (
                    <div className="pointer-events-auto hidden md:block">
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
      <div className="safe-area-pb z-50 border-t border-border bg-background/80 p-4 pb-12 backdrop-blur-xl">
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

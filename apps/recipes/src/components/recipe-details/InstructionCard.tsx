import React, { useMemo } from 'react'
import { Info } from 'lucide-react'
import { Stack } from '../ui/layout'
import { cn } from '../../lib/utils'
import { renderHighlightedInstruction } from '../../lib/instruction-utils'
import { StepIngredients } from './StepIngredients'
import type { Ingredient } from '../../lib/types'

interface InstructionCardProps {
  stepNumber: number
  title?: string
  text: string
  highlightedText?: string
  tip?: string
  isChecked?: boolean
  onToggle?: () => void
  hideNumber?: boolean
  /** @deprecated The separate completion badge was removed — the whole row is the control now.
   * Retained so existing call sites keep compiling; it no longer affects rendering. */
  hideBadge?: boolean
  ingredients?: { name: string }[]
  targetIngredientIndices?: number[]
  /** Full ingredient objects for rendering inline step ingredients */
  fullIngredients?: Ingredient[]
}

/**
 * One recipe instruction step, optionally with a title and a tip.
 *
 * Used by both Original and Smart View so the two read identically — only their content differs
 * (Smart View supplies step titles, tips and grouping; Original supplies plain numbered steps).
 */
export const InstructionCard: React.FC<InstructionCardProps> = ({
  stepNumber,
  title,
  text,
  highlightedText,
  tip,
  isChecked = false,
  onToggle,
  hideNumber = false,
  ingredients = [],
  targetIngredientIndices = [],
  fullIngredients,
}) => {
  // Use shared highlighting utility for ingredients and verbs
  const content = useMemo(
    () =>
      renderHighlightedInstruction(highlightedText || text, ingredients, targetIngredientIndices),
    [text, highlightedText, ingredients, targetIngredientIndices],
  )

  const showStepNumber = !hideNumber
  const gridColumnsClass = showStepNumber ? 'grid-cols-[2rem_minmax(0,1fr)]' : 'grid-cols-1'

  const body = (
    <div className={cn('grid w-full items-start gap-x-3 text-left font-body', gridColumnsClass)}>
      {showStepNumber && (
        <span
          className={cn(
            'pt-0.5 text-right text-base font-semibold tabular-nums',
            isChecked ? 'text-muted-foreground line-through' : 'text-muted-foreground',
          )}
          aria-hidden="true"
        >
          {stepNumber}
        </span>
      )}

      <Stack spacing="xs" className="min-w-0">
        {title && (
          <span
            className={cn(
              'text-base font-semibold',
              isChecked ? 'text-muted-foreground line-through' : 'text-foreground',
            )}
          >
            {title}
          </span>
        )}
        <p
          className={cn(
            'text-base leading-7',
            isChecked ? 'text-muted-foreground line-through' : 'text-foreground/90',
          )}
        >
          {content}
        </p>

        {fullIngredients && targetIngredientIndices.length > 0 && (
          <div className="mt-1">
            <StepIngredients ingredients={fullIngredients} indices={targetIngredientIndices} />
          </div>
        )}

        {tip && (
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
            <Info className="h-4 w-4 flex-shrink-0" />
            <span>{tip}</span>
          </div>
        )}
      </Stack>
    </div>
  )

  return (
    <div
      className={cn(
        'border-b border-border/50 transition-opacity last:border-b-0',
        isChecked ? 'opacity-50' : 'opacity-100',
      )}
      data-testid="instruction-step-card"
    >
      {/* The whole step is the control for marking it done.
       *
       * This used to be a separate 20px circle beside the text — which read as a radio button
       * (implying pick-one, not check-off), and was well under the 44px minimum touch target this
       * app requires everywhere else. Hands are messy and the phone is at arm's length while
       * cooking; the row is a far easier target, and completion still reads clearly from the
       * dimmed, struck-through text. The testid stays on whatever is tappable, so it still
       * identifies the step toggle. */}
      {onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={isChecked}
          aria-label={
            isChecked ? `Step ${stepNumber}, done` : `Step ${stepNumber}, mark as done`
          }
          data-testid="instruction-step-toggle"
          className="w-full cursor-pointer rounded-lg py-3 text-left transition-colors active:bg-accent/60"
          style={{ touchAction: 'manipulation' }}
        >
          {body}
        </button>
      ) : (
        <div className="py-3">{body}</div>
      )}
    </div>
  )
}

import React, { useMemo } from 'react'
import { Check, Info } from 'lucide-react'
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
  hideBadge?: boolean
  ingredients?: { name: string }[]
  targetIngredientIndices?: number[]
  /** Full ingredient objects for rendering inline step ingredients */
  fullIngredients?: Ingredient[]
}

/**
 * A card displaying a single recipe instruction step with optional title and tip.
 * Features a numbered badge that can be toggled to mark completion.
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
  hideBadge = false,
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

  const showToggle = !hideBadge
  const showStepNumber = !hideNumber

  const gridColumnsClass =
    showToggle && showStepNumber
      ? 'grid-cols-[1.5rem_2.5rem_minmax(0,1fr)]'
      : showToggle || showStepNumber
        ? 'grid-cols-[1.5rem_minmax(0,1fr)]'
        : 'grid-cols-1'

  return (
    <div
      className={cn(
        'border-b border-border/50 py-2.5 transition-opacity last:border-b-0',
        isChecked ? 'opacity-50' : 'opacity-100',
      )}
      data-testid="instruction-step-card"
    >
      <div className={cn('grid w-full items-start gap-x-2 text-left font-body', gridColumnsClass)}>
        {showToggle &&
          (onToggle ? (
            <button
              type="button"
              onClick={onToggle}
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors',
                isChecked
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-muted-foreground/40',
              )}
              aria-label={
                isChecked ? `Step ${stepNumber} complete` : `Mark step ${stepNumber} complete`
              }
              data-testid="instruction-step-toggle"
            >
              {isChecked && <Check className="h-3 w-3" />}
            </button>
          ) : (
            <div
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors',
                isChecked
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-muted-foreground/40',
              )}
            >
              {isChecked && <Check className="h-3 w-3" />}
            </div>
          ))}

        {showStepNumber && (
          <span
            className={cn(
              'text-right text-sm font-normal tabular-nums text-muted-foreground',
              isChecked && 'line-through',
            )}
          >
            {stepNumber}
          </span>
        )}

        <Stack spacing="xs" className="min-w-0">
          {title && (
            <span
              className={cn(
                'text-sm font-semibold',
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
    </div>
  )
}

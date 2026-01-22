import React from 'react'
import { Check, Info } from 'lucide-react'
import { Stack, Inline } from '../ui/layout'
import { cn } from '../../lib/utils'
import { renderHighlightedInstruction } from '../../lib/instruction-utils'

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
}) => {
  // Use shared highlighting utility for ingredients and verbs
  const renderContent = () => {
    return renderHighlightedInstruction(
      highlightedText || text,
      ingredients,
      targetIngredientIndices,
    )
  }

  return (
    <div
      className={cn(
        'transition-opacity',
        isChecked ? 'opacity-50' : 'opacity-100',
        // Removed Card borders/shadow for lighter read view
      )}
    >
      <Inline spacing="md" align="start">
        {/* Step Number Badge / Toggle */}
        {!hideBadge && (
          <button
            onClick={onToggle}
            className={cn(
              'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors',
              isChecked
                ? 'bg-primary text-primary-foreground'
                : 'bg-foreground text-background hover:bg-foreground/80',
              // If hiding number or title exists, optimize for checkbox look (unless checked)
              (hideNumber || (title && !isChecked)) &&
                'bg-transparent text-foreground shadow-[inset_0_0_0_2px_currentColor] hover:bg-muted',
            )}
            aria-label={
              isChecked ? `Step ${stepNumber} complete` : `Mark step ${stepNumber} complete`
            }
          >
            {isChecked ? (
              <Check className="h-4 w-4" />
            ) : hideNumber || title ? (
              // Simple checkbox circle if number is hidden or in header
              <div className="h-2.5 w-2.5 rounded-full bg-current opacity-0" />
            ) : (
              // Strict mode: Number remains in badge
              stepNumber
            )}
          </button>
        )}

        <Stack spacing="sm" className="flex-1 pt-1">
          {/* Step Title (with Number if present) */}
          {title && (
            <h3 className="text-lg font-bold text-foreground">
              {!hideNumber && <span className="mr-1 opacity-70">{stepNumber}.</span>} {title}
            </h3>
          )}

          {/* Step Text */}
          <p
            className={cn(
              'text-base leading-relaxed',
              isChecked ? 'line-through' : 'text-muted-foreground',
            )}
          >
            {renderContent()}
          </p>

          {/* Optional Tip (Pill Style) */}
          {tip && (
            <div className="mt-2 inline-flex w-fit items-center gap-2 rounded-full bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4 flex-shrink-0" />
              <span>{tip}</span>
            </div>
          )}
        </Stack>
      </Inline>
    </div>
  )
}

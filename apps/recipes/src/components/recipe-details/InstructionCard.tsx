import React from 'react'
import { Check, Info } from 'lucide-react'
import { Stack, Inline } from '../ui/layout'
import { cn } from '../../lib/utils'

interface InstructionCardProps {
  stepNumber: number
  title?: string
  text: string
  highlightedText?: string
  tip?: string
  isChecked?: boolean
  onToggle?: () => void
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
}) => {
  // Simple markdown parser for bold text (e.g. "**mix**")
  const renderContent = () => {
    const content = highlightedText || text
    const parts = content.split('**')
    return parts.map((part, i) =>
      i % 2 === 1 ? (
        <strong key={i} className="font-bold text-foreground">
          {part}
        </strong>
      ) : (
        part
      ),
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
        {/* Step Number Badge */}
        <button
          onClick={onToggle}
          className={cn(
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors',
            isChecked
              ? 'bg-primary text-primary-foreground'
              : 'bg-foreground text-background hover:bg-foreground/80',
          )}
          aria-label={
            isChecked ? `Step ${stepNumber} complete` : `Mark step ${stepNumber} complete`
          }
        >
          {isChecked ? <Check className="h-4 w-4" /> : stepNumber}
        </button>

        <Stack spacing="sm" className="flex-1 pt-1">
          {/* Step Title */}
          {title && <h3 className="text-lg font-bold text-foreground">{title}</h3>}

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

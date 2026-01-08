import React from 'react'
import { Check, Info } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { Stack, Inline } from '../ui/layout'
import { cn } from '../../lib/utils'

interface InstructionCardProps {
  stepNumber: number
  title?: string
  text: string
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
  tip,
  isChecked = false,
  onToggle,
}) => (
  <Card className={cn('overflow-hidden transition-opacity', isChecked && 'opacity-50')}>
    <CardContent className="p-5">
      <Inline spacing="md" align="start">
        {/* Step Number Badge */}
        <button
          onClick={onToggle}
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-bold transition-colors',
            isChecked
              ? 'bg-primary text-primary-foreground'
              : 'bg-foreground text-background hover:bg-foreground/80',
          )}
          aria-label={
            isChecked ? `Step ${stepNumber} complete` : `Mark step ${stepNumber} complete`
          }
        >
          {isChecked ? <Check className="h-5 w-5" /> : stepNumber}
        </button>

        <Stack spacing="sm" className="flex-1">
          {/* Step Title */}
          {title && <h3 className="text-lg font-bold text-foreground">{title}</h3>}

          {/* Step Text */}
          <p
            className={cn(
              'text-base leading-relaxed',
              isChecked ? 'line-through' : 'text-muted-foreground',
            )}
          >
            {text}
          </p>

          {/* Optional Tip */}
          {tip && (
            <div className="mt-2 flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{tip}</span>
            </div>
          )}
        </Stack>
      </Inline>
    </CardContent>
  </Card>
)

import React from 'react'
import { Check } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet'
import { cn } from '../../lib/utils'
import type { Recipe } from '../../lib/types'

interface CookingStepListProps {
  recipe: Recipe
  currentStepIdx: number
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onStepSelect: (index: number) => void
}

export const CookingStepList: React.FC<CookingStepListProps> = ({
  recipe,
  currentStepIdx,
  isOpen,
  onOpenChange,
  onStepSelect,
}) => {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="mb-6">
          <SheetTitle className="font-display text-2xl font-bold">Cooking Steps</SheetTitle>
          <SheetDescription>Jump to any step in the recipe.</SheetDescription>
        </SheetHeader>

        <div className="flex h-[calc(100vh-120px)] flex-col gap-2 overflow-y-auto pb-10">
          {recipe.steps.map((step, idx) => {
            const isCompleted = idx < currentStepIdx
            const isCurrent = idx === currentStepIdx

            return (
              <button
                key={idx}
                onClick={() => {
                  onStepSelect(idx)
                  onOpenChange(false)
                }}
                className={cn(
                  'flex items-start gap-3 rounded-xl border p-3 text-left transition-all',
                  isCurrent
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border bg-background hover:bg-muted/50',
                  isCompleted && 'bg-muted opacity-60',
                )}
              >
                <div
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                    isCurrent
                      ? 'border-primary bg-primary text-primary-foreground'
                      : isCompleted
                        ? 'border-transparent bg-muted-foreground/20 text-muted-foreground'
                        : 'border-muted-foreground/30 bg-background text-muted-foreground',
                  )}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                </div>

                <p
                  className={cn(
                    'line-clamp-3 text-sm leading-snug',
                    isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {step}
                </p>
              </button>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}

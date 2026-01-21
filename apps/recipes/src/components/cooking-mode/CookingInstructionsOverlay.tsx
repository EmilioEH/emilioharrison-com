import React, { useMemo } from 'react'
import { X, List, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Recipe, StructuredStep } from '@/lib/types'

interface CookingInstructionsOverlayProps {
  isOpen: boolean
  onClose: () => void
  recipe: Recipe
  currentStepIdx: number
  onStepSelect: (index: number) => void
}

export const CookingInstructionsOverlay: React.FC<CookingInstructionsOverlayProps> = ({
  isOpen,
  onClose,
  recipe,
  currentStepIdx,
  onStepSelect,
}) => {
  // Determine which steps to display based on available data
  const displaySteps = useMemo((): StructuredStep[] => {
    // Prefer structured steps if available
    if (recipe.structuredSteps?.length) {
      return recipe.structuredSteps
    }
    // Fallback to plain text steps
    if (recipe.steps?.length) {
      return recipe.steps.map((text: string) => ({ text, title: undefined, tip: undefined }))
    }
    return []
  }, [recipe.structuredSteps, recipe.steps])

  // Group steps if groups are available (for enhanced recipes)
  const displayStepGroups = useMemo((): Array<{
    header: string | null
    items: StructuredStep[]
    startIndex: number
  }> => {
    const groups = recipe.stepGroups

    if (groups?.length) {
      return groups.map((group) => ({
        header: group.header,
        items: displaySteps.slice(group.startIndex, group.endIndex + 1),
        startIndex: group.startIndex,
      }))
    }
    // Fallback: single ungrouped list
    return [{ header: null, items: displaySteps, startIndex: 0 }]
  }, [recipe.stepGroups, displaySteps])

  const handleStepClick = (index: number) => {
    onStepSelect(index)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            role="button"
            tabIndex={0}
            aria-label="Close overlay"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onClose()
            }}
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-3xl bg-background shadow-2xl md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b p-4">
              <div className="flex items-center gap-2">
                <List className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-bold">Instructions</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid gap-3">
                {displayStepGroups.map((group, gIdx) => (
                  <div key={gIdx}>
                    {/* Group Header (for enhanced recipes) */}
                    {group.header && (
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
                          {gIdx + 1}
                        </div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {group.header}
                        </h3>
                      </div>
                    )}

                    {/* Steps within group */}
                    {group.items.map((step, idx) => {
                      const globalIdx = group.startIndex + idx
                      const isCompleted = globalIdx < currentStepIdx
                      const isCurrent = globalIdx === currentStepIdx

                      return (
                        <button
                          key={globalIdx}
                          onClick={() => handleStepClick(globalIdx)}
                          className={cn(
                            'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all',
                            isCurrent
                              ? 'border-primary bg-primary/10 shadow-sm'
                              : 'border-border bg-background hover:bg-muted/50',
                            isCompleted && 'bg-muted opacity-60',
                          )}
                        >
                          {/* Step Number/Status */}
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
                            {isCompleted ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : group.header ? (
                              // For enhanced recipes with groups, show index within group
                              idx + 1
                            ) : (
                              // For plain recipes, show global step number
                              globalIdx + 1
                            )}
                          </div>

                          {/* Step Text */}
                          <div className="flex-1">
                            {step.title && (
                              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                {step.title}
                              </p>
                            )}
                            <p
                              className={cn(
                                'line-clamp-3 text-sm leading-snug',
                                isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground',
                              )}
                            >
                              {step.text}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer (Optional, mostly for margin) */}
            <div className="p-4 pt-10 md:pt-4"></div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

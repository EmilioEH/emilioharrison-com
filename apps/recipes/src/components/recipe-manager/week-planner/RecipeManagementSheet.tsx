import React from 'react'
import { format, parseISO } from 'date-fns'
import { Trash2, Share2 } from 'lucide-react'

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../../ui/sheet'
import { Button } from '../../ui/button'
import { Stack } from '../../ui/layout'

interface PlannedWeekInfo {
  label: string
  dateStr: string
  weekStart: string
}

interface RecipeManagementSheetProps {
  isOpen: boolean
  onClose: () => void
  recipeTitle: string
  currentPlannedWeeks: PlannedWeekInfo[]
  onRemove: (date: string) => void
  onShare?: () => void
}

export const RecipeManagementSheet: React.FC<RecipeManagementSheetProps> = ({
  isOpen,
  onClose,
  recipeTitle,
  currentPlannedWeeks,
  onRemove,
  onShare,
}) => {
  const handleRemove = (date: string) => {
    onRemove(date)
    // If this was the last planned week, close the sheet
    if (currentPlannedWeeks.length === 1) {
      onClose()
    }
  }

  const formatWeekLabel = (label: string, weekStart: string) => {
    const dateObj = parseISO(weekStart)
    return `${label} (week of ${format(dateObj, 'MMM d')})`
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="max-h-[85vh]">
        <SheetHeader>
          <SheetTitle className="text-left">Manage Recipe</SheetTitle>
          <SheetDescription className="text-left">{recipeTitle}</SheetDescription>
        </SheetHeader>

        <Stack spacing="lg" className="mt-6">
          {/* Current Assignments Section */}
          {currentPlannedWeeks.length > 0 && (
            <Stack spacing="sm">
              <h3 className="text-sm font-bold text-muted-foreground">CURRENTLY PLANNED</h3>
              <Stack spacing="sm">
                {currentPlannedWeeks.map((planned) => (
                  <div
                    key={`${planned.weekStart}-${planned.dateStr}`}
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {formatWeekLabel(planned.label, planned.weekStart)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(planned.dateStr)}
                      className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      title="Remove from week"
                      aria-label="Remove from week"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="text-xs font-bold">Remove</span>
                    </Button>
                  </div>
                ))}
              </Stack>
            </Stack>
          )}

          {/* Actions Section */}
          {onShare && (
            <Stack spacing="sm">
              <h3 className="text-sm font-bold text-muted-foreground">ACTIONS</h3>
              <Button
                variant="outline"
                size="default"
                onClick={() => {
                  onShare()
                  onClose()
                }}
                className="w-full justify-start gap-2"
                title="Share recipe"
                aria-label="Share recipe"
              >
                <Share2 className="h-4 w-4" />
                <span className="font-bold">Share Recipe</span>
              </Button>
            </Stack>
          )}
        </Stack>
      </SheetContent>
    </Sheet>
  )
}

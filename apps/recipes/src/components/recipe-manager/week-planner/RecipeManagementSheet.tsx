import React, { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Trash2, Calendar, MoveRight, Share2 } from 'lucide-react'

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../../ui/sheet'
import { Button } from '../../ui/button'
import { Stack } from '../../ui/layout'
import { DayPicker } from './DayPicker'
import type { DayOfWeek } from '../../../lib/weekStore'

interface PlannedDayInfo {
  day: DayOfWeek
  dateStr: string // Changed from 'date' to match getPlannedDatesForRecipe
  weekStart: string
}

interface RecipeManagementSheetProps {
  isOpen: boolean
  onClose: () => void
  recipeId: string
  recipeTitle: string
  currentPlannedDays: PlannedDayInfo[]
  onRemove: (date: string) => void
  onShare?: () => void
}

export const RecipeManagementSheet: React.FC<RecipeManagementSheetProps> = ({
  isOpen,
  onClose,
  recipeId,
  recipeTitle,
  currentPlannedDays,
  onRemove,
  onShare,
}) => {
  const [showDayPicker, setShowDayPicker] = useState(false)
  const [showWeekPicker, setShowWeekPicker] = useState(false)

  const handleRemove = (date: string) => {
    onRemove(date)
    // If this was the last planned day, close the sheet
    if (currentPlannedDays.length === 1) {
      onClose()
    }
  }

  const handleMoveToDay = () => {
    setShowDayPicker(true)
  }

  const handleMoveToWeek = () => {
    setShowWeekPicker(true)
  }

  const handleDayPickerClose = () => {
    setShowDayPicker(false)
    onClose() // Close main sheet after day picker closes
  }

  // Format date labels
  const formatDayLabel = (day: DayOfWeek, dateStr: string) => {
    const dateObj = parseISO(dateStr)
    return `${day}, ${format(dateObj, 'MMM d')}`
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="max-h-[85vh]">
          <SheetHeader>
            <SheetTitle className="text-left">Manage Recipe</SheetTitle>
            <SheetDescription className="text-left">{recipeTitle}</SheetDescription>
          </SheetHeader>

          <Stack spacing="lg" className="mt-6">
            {/* Current Assignments Section */}
            {currentPlannedDays.length > 0 && (
              <Stack spacing="sm">
                <h3 className="text-sm font-bold text-muted-foreground">CURRENTLY PLANNED</h3>
                <Stack spacing="sm">
                  {currentPlannedDays.map((planned) => (
                    <div
                      key={`${planned.weekStart}-${planned.dateStr}`}
                      className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {formatDayLabel(planned.day, planned.dateStr)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(planned.dateStr)}
                        className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        title={`Remove from ${planned.day}`}
                        aria-label={`Remove from ${planned.day}`}
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
            <Stack spacing="sm">
              <h3 className="text-sm font-bold text-muted-foreground">ACTIONS</h3>
              <Stack spacing="sm">
                <Button
                  variant="outline"
                  size="default"
                  onClick={handleMoveToDay}
                  className="w-full justify-start gap-2"
                  title="Move to different day"
                  aria-label="Move to different day"
                >
                  <MoveRight className="h-4 w-4" />
                  <span className="font-bold">Move to Different Day</span>
                </Button>
                <Button
                  variant="outline"
                  size="default"
                  onClick={handleMoveToWeek}
                  className="w-full justify-start gap-2"
                  title="Move to different week"
                  aria-label="Move to different week"
                >
                  <Calendar className="h-4 w-4" />
                  <span className="font-bold">Move to Different Week</span>
                </Button>
                {onShare && (
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
                )}
              </Stack>
            </Stack>
          </Stack>
        </SheetContent>
      </Sheet>

      {/* Day Picker Modal */}
      {showDayPicker && (
        <DayPicker
          isOpen={showDayPicker}
          onClose={handleDayPickerClose}
          recipeId={recipeId}
          recipeTitle={recipeTitle}
          mode="edit"
        />
      )}

      {/* Week Picker (via Day Picker in week selection mode) */}
      {showWeekPicker && (
        <DayPicker
          isOpen={showWeekPicker}
          onClose={() => {
            setShowWeekPicker(false)
            onClose()
          }}
          recipeId={recipeId}
          recipeTitle={recipeTitle}
          mode="edit"
          startWithWeekPicker
        />
      )}
    </>
  )
}

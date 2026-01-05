import React, { useState, useEffect } from 'react'
import { format, parseISO, addDays, isSameWeek, startOfWeek, addWeeks } from 'date-fns'
import { useStore } from '@nanostores/react'
import { Check, Calendar, ArrowLeft } from 'lucide-react'

import {
  weekState,
  addRecipeToDay,
  currentWeekRecipes,
  switchWeekContext,
  removeRecipeFromDay,
  DAYS_OF_WEEK,
  allPlannedRecipes,
} from '../../../lib/weekStore'
import { ResponsiveModal } from '../../ui/ResponsiveModal'
import { Button } from '../../ui/button'
import { Stack } from '../../ui/layout'

interface DayPickerProps {
  isOpen: boolean
  onClose: () => void
  recipeId: string
  recipeTitle: string
  mode?: 'add' | 'edit' // New: edit mode for moving recipes
  startWithWeekPicker?: boolean // New: start with week picker view open
}

export const DayPicker: React.FC<DayPickerProps> = ({
  isOpen,
  onClose,
  recipeId,
  recipeTitle,
  mode = 'add',
  startWithWeekPicker = false,
}) => {
  const { activeWeekStart } = useStore(weekState)
  const currentRecipes = useStore(currentWeekRecipes)
  const allRecipes = useStore(allPlannedRecipes)

  // Local state for week picker modal
  const [showWeekPicker, setShowWeekPicker] = useState(false)

  // Reset week picker view when modal opens (but keep the active week from context bar)
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowWeekPicker(startWithWeekPicker)
    }
  }, [isOpen, startWithWeekPicker])

  const plannedDays = currentRecipes.filter((p) => p.recipeId === recipeId).map((p) => p.day)

  const activeDate = parseISO(activeWeekStart)
  const today = new Date()
  const isThisWeek = isSameWeek(activeDate, today, { weekStartsOn: 1 })
  const isNextWeek = isSameWeek(activeDate, addWeeks(today, 1), { weekStartsOn: 1 })

  // Get week label
  const getWeekLabel = () => {
    if (isThisWeek) return 'This Week'
    if (isNextWeek) return 'Next Week'
    return `Week of ${format(activeDate, 'MMM d')}`
  }

  const handleToggleDay = async (day: (typeof DAYS_OF_WEEK)[number]) => {
    const isPlanned = plannedDays.includes(day)

    if (isPlanned) {
      await removeRecipeFromDay(recipeId)
    } else {
      await addRecipeToDay(recipeId, day)
      onClose()
    }
  }

  const handleSelectWeek = (weekStart: string) => {
    switchWeekContext(weekStart)
    setShowWeekPicker(false)
  }

  const daysList = DAYS_OF_WEEK.map((day, index) => {
    const date = addDays(activeDate, index)
    const dateLabel = format(date, 'EEE d.M.')
    const fullDate = format(date, 'yyyy-MM-dd')
    const isSelected = plannedDays.includes(day)

    return { day, dateLabel, fullDate, isSelected }
  })

  // Generate 8 weeks for picker
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const weekStart = addWeeks(currentWeekStart, i)
    return format(weekStart, 'yyyy-MM-dd')
  })

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'edit' ? `Move "${recipeTitle}"` : `Add "${recipeTitle}"`}
    >
      {showWeekPicker ? (
        // Week Picker View
        <Stack spacing="sm" className="pb-6">
          <button
            onClick={() => setShowWeekPicker(false)}
            className="mb-2 flex items-center gap-1 self-start text-sm font-medium text-primary hover:text-primary/80"
          >
            <ArrowLeft className="h-4 w-4" /> Back to days
          </button>

          {weeks.map((weekStart) => {
            const startDate = parseISO(weekStart)
            const endDate = addDays(startDate, 6)
            const isSelected = weekStart === activeWeekStart
            const weekIsThisWeek = isSameWeek(startDate, today, { weekStartsOn: 1 })
            const weekIsNextWeek = isSameWeek(startDate, addWeeks(today, 1), { weekStartsOn: 1 })

            // Count meals for this week
            const mealCount = allRecipes.filter((r) => r.weekStart === weekStart).length

            let label = `Week of ${format(startDate, 'MMM d')}`
            if (weekIsThisWeek) label = 'This Week'
            else if (weekIsNextWeek) label = 'Next Week'

            return (
              <button
                key={weekStart}
                onClick={() => handleSelectWeek(weekStart)}
                className={`flex items-center justify-between rounded-lg border p-3 transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card hover:bg-accent/50'
                }`}
              >
                <Stack spacing="xs">
                  <span className={`font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                    {label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(startDate, 'MMM d')} - {format(endDate, 'MMM d')}
                  </span>
                </Stack>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {mealCount} {mealCount === 1 ? 'meal' : 'meals'}
                  </span>
                  {isSelected && <Check className="h-4 w-4 text-primary" />}
                </div>
              </button>
            )
          })}
        </Stack>
      ) : (
        // Day Selection View (Default)
        <Stack spacing="md" className="pb-6">
          {/* Week Info */}
          <div className="rounded-lg bg-muted/50 p-3">
            <Stack spacing="xs">
              <span className="text-sm font-bold text-foreground">{getWeekLabel()}</span>
              <span className="text-xs text-muted-foreground">
                {format(activeDate, 'MMM d')} - {format(addDays(activeDate, 6), 'MMM d')}
              </span>
            </Stack>
          </div>

          {/* Days List */}
          <Stack spacing="xs">
            {daysList.map((item) => (
              <button
                key={item.day}
                onClick={() => handleToggleDay(item.day)}
                className={`flex items-center justify-between rounded-md p-3 transition-all ${
                  item.isSelected
                    ? 'bg-primary/10 font-bold text-primary'
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                      item.isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground/30'
                    }`}
                  >
                    {item.isSelected && <Check className="h-3 w-3" />}
                  </div>
                  <span>{item.dateLabel}</span>
                </div>
                {item.isSelected && <span className="text-xs">Added</span>}
              </button>
            ))}
          </Stack>

          {/* Pick Other Week - Secondary Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowWeekPicker(true)}
            className="mx-auto gap-2 text-xs font-medium"
            title="Pick a different week"
            aria-label="Pick a different week"
          >
            <Calendar className="h-4 w-4" />
            <span>Pick a different week</span>
          </Button>
        </Stack>
      )}
    </ResponsiveModal>
  )
}

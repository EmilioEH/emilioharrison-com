import React, { useState, useMemo } from 'react'
import {
  format,
  parseISO,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import { useStore } from '@nanostores/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { weekState, allPlannedRecipes, toggleRecipePlannedDate } from '../../../lib/weekStore'
import { ResponsiveModal } from '../../ui/ResponsiveModal'
import { Button } from '../../ui/button'
import { Stack, Inline } from '../../ui/layout'
import { cn } from '../../../lib/utils'

interface DayPickerProps {
  isOpen: boolean
  onClose: () => void
  recipeId: string
  recipeTitle: string
  mode?: 'add' | 'edit'
}

export const DayPicker: React.FC<DayPickerProps> = ({
  isOpen,
  onClose,
  recipeId,
  recipeTitle,
  mode = 'add',
}) => {
  const { activeWeekStart } = useStore(weekState)
  const allCurrent = useStore(allPlannedRecipes)

  // Local state for the viewed month
  const [currentMonth, setCurrentMonth] = useState(() => {
    return parseISO(activeWeekStart)
  })

  // Map of dates to scheduled recipe IDs
  const plannedMap = useMemo(() => {
    const map = new Map<string, string[]>()
    allCurrent.forEach((p) => {
      if (!p.date) return
      if (!map.has(p.date)) map.set(p.date, [])
      map.get(p.date)!.push(p.recipeId)
    })
    return map
  }, [allCurrent])

  // Helpers
  const handleNextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1))
  const handlePrevMonth = () => setCurrentMonth((prev) => subMonths(prev, 1))
  const handleJumpToToday = () => setCurrentMonth(new Date())

  // Generate calendar grid
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday start
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  })

  // Toggle Logic
  const handleDayClick = async (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const existingIds = plannedMap.get(dateStr) || []
    const isPlanned = existingIds.includes(recipeId)

    // Toggle
    await toggleRecipePlannedDate(recipeId, dateStr, !isPlanned)
    // Don't close immediately to allow multiple selections
  }

  const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'edit' ? `Move "${recipeTitle}"` : `Schedule "${recipeTitle}"`}
    >
      <Stack spacing="md" className="pb-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between px-1">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
          </Button>
          <span className="text-lg font-bold">{format(currentMonth, 'MMMM yyyy')}</span>
          <Button variant="ghost" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="rounded-xl border border-border bg-card p-2 shadow-sm">
          {/* Weekday Headers */}
          <div className="mb-2 grid grid-cols-7 text-center">
            {WEEKDAYS.map((day) => (
              <span key={day} className="text-xs font-medium text-muted-foreground">
                {day}
              </span>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isToday = isSameDay(day, new Date())

              const dayIds = plannedMap.get(dateStr) || []
              const isSelected = dayIds.includes(recipeId)
              const hasOthers = dayIds.some((id) => id !== recipeId)

              // Visual State
              let bgClass = 'hover:bg-accent/50 text-foreground'
              if (!isCurrentMonth) bgClass = 'text-muted-foreground/30'
              if (isSelected) bgClass = 'bg-primary text-primary-foreground hover:bg-primary/90'

              // Border for today
              const borderClass =
                isToday && !isSelected
                  ? 'border border-primary/50 font-bold'
                  : 'border border-transparent'

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    'relative flex aspect-square flex-col items-center justify-center rounded-md transition-all',
                    bgClass,
                    borderClass,
                  )}
                >
                  <span className="text-sm">{format(day, 'd')}</span>

                  {/* Indicators Container */}
                  <div className="absolute bottom-1.5 flex gap-0.5">
                    {/* Dot for other recipes */}
                    {hasOthers && (
                      <div
                        className={cn(
                          'h-1 w-1 rounded-full',
                          isSelected ? 'bg-primary-foreground/70' : 'bg-primary/40',
                        )}
                      />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer / Legend / Today Jump */}
        <Inline spacing="sm" justify="between" className="px-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/40"></span> Other meals
            </span>
            <span className="flex items-center gap-1">
              <span className="h-4 w-4 rounded-sm bg-primary align-middle"></span> Selected
            </span>
          </div>

          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={handleJumpToToday}
          >
            Jump to Today
          </Button>
        </Inline>
      </Stack>
    </ResponsiveModal>
  )
}

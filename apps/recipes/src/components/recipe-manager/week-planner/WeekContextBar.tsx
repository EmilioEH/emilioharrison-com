import React from 'react'
import { useStore } from '@nanostores/react'
import { format, parseISO, startOfWeek, addWeeks, addDays, isSameWeek, getDay } from 'date-fns'
import { Calendar, ChevronRight, Check } from 'lucide-react'

import { weekState, switchWeekContext, currentWeekRecipes } from '../../../lib/weekStore'
import { Button } from '../../ui/button'

interface WeekContextBarProps {
  onOpenCalendar: () => void
  onViewWeek: () => void
}

/**
 * Get smart default week based on current day of week.
 * Fri-Sun → Next Week, Mon-Thu → This Week
 */
const getSmartDefaultWeek = (): 'this' | 'next' => {
  const day = getDay(new Date()) // 0 = Sunday, 1 = Monday, ...
  // Friday = 5, Saturday = 6, Sunday = 0
  return day === 0 || day >= 5 ? 'next' : 'this'
}

export const WeekContextBar: React.FC<WeekContextBarProps> = ({ onOpenCalendar, onViewWeek }) => {
  const { activeWeekStart } = useStore(weekState)
  const currentRecipes = useStore(currentWeekRecipes)

  const activeDate = parseISO(activeWeekStart)
  const today = new Date()
  const currentWeekStarts = startOfWeek(today, { weekStartsOn: 1 })
  const nextWeekStarts = addWeeks(currentWeekStarts, 1)

  const isThisWeek = isSameWeek(activeDate, today, { weekStartsOn: 1 })
  const isNextWeek = isSameWeek(activeDate, addWeeks(today, 1), { weekStartsOn: 1 })

  // Week date range formatting
  const weekEndDate = addDays(activeDate, 6)
  const dateRangeLabel = `${format(activeDate, 'MMM d')}-${format(weekEndDate, 'd')}`

  // Handlers
  const handleSetThisWeek = () => switchWeekContext(format(currentWeekStarts, 'yyyy-MM-dd'))
  const handleSetNextWeek = () => switchWeekContext(format(nextWeekStarts, 'yyyy-MM-dd'))

  // Apply smart default on mount if needed
  React.useEffect(() => {
    const smartDefault = getSmartDefaultWeek()
    if (smartDefault === 'next' && isThisWeek) {
      handleSetNextWeek()
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="pb-safe fixed bottom-8 left-0 right-0 z-40 border-t border-border bg-background/95 shadow-[0_-4px_20px_rgb(0,0,0,0.08)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-2xl flex-col px-4 py-3">
        {/* Top Row: Controls */}
        <div className="flex items-center justify-between gap-3">
          {/* Left: Week Toggles */}
          <div className="flex items-center gap-2">
            {/* This/Next Toggle */}
            <div className="flex items-center rounded-lg bg-muted/50 p-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSetThisWeek()
                }}
                className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                  isThisWeek
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-label="This Week"
              >
                This
                {isThisWeek && <Check className="h-3 w-3" />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSetNextWeek()
                }}
                className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                  isNextWeek
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-label="Next Week"
              >
                Next
                {isNextWeek && <Check className="h-3 w-3" />}
              </button>
            </div>

            {/* Calendar Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                onOpenCalendar()
              }}
              className="h-8 w-8 rounded-full"
              title="Select Week"
              aria-label="Select Week"
            >
              <Calendar className="h-4 w-4" />
            </Button>
          </div>

          {/* Right: View Link */}
          <button
            onClick={onViewWeek}
            className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80"
            aria-label="View Week Plan"
          >
            View
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Bottom Row: Clickable Info Area */}
        <button
          onClick={onViewWeek}
          className="mt-1 flex w-full items-center justify-between rounded-md px-1 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/50"
          aria-label="View Week Plan"
        >
          <span className="font-medium">{dateRangeLabel}</span>
          <div className="flex items-center gap-1">
            <span>
              <span className="font-bold text-foreground">{currentRecipes.length}</span> meals
            </span>
            <ChevronRight className="h-3 w-3" />
          </div>
        </button>
      </div>
    </div>
  )
}

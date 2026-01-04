import React from 'react'
import { useStore } from '@nanostores/react'
import { format, parseISO, startOfWeek, addWeeks, addDays, isSameWeek } from 'date-fns'
import { Calendar, Check, X, ShoppingCart } from 'lucide-react'

import { weekState, switchWeekContext, currentWeekRecipes } from '../../../lib/weekStore'
import { Button } from '../../ui/button'

interface WeekSelectorHeaderProps {
  onOpenCalendar: () => void
  onClose: () => void
  onViewGrocery: () => void
}

export const WeekSelectorHeader: React.FC<WeekSelectorHeaderProps> = ({
  onOpenCalendar,
  onClose,
  onViewGrocery,
}) => {
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
  const dateRangeLabel = `${format(activeDate, 'MMM d')} - ${format(weekEndDate, 'd')}`

  // Handlers
  const handleSetThisWeek = () => switchWeekContext(format(currentWeekStarts, 'yyyy-MM-dd'))
  const handleSetNextWeek = () => switchWeekContext(format(nextWeekStarts, 'yyyy-MM-dd'))

  return (
    <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-2xl flex-col gap-2 px-4 py-3">
        {/* Top Row: Back + Week Toggles + Grocery */}
        <div className="flex items-center justify-between gap-3">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full"
            title="Back to Library"
            aria-label="Back to Library"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Week Toggles */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg bg-muted/50 p-1">
              <button
                onClick={handleSetThisWeek}
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
                onClick={handleSetNextWeek}
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
              onClick={onOpenCalendar}
              className="h-8 w-8 rounded-full"
              title="Select Week"
              aria-label="Select Week"
            >
              <Calendar className="h-4 w-4" />
            </Button>
          </div>

          {/* Grocery Button */}
          <Button
            variant="default"
            size="sm"
            onClick={onViewGrocery}
            className="gap-1.5"
            title="View Grocery List"
            aria-label="View Grocery List"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="text-xs font-bold">Grocery</span>
          </Button>
        </div>

        {/* Bottom Row: Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-bold text-foreground">{dateRangeLabel}</span>
          <span>
            <span className="font-bold text-foreground">{currentRecipes.length}</span> meals planned
          </span>
        </div>
      </div>
    </div>
  )
}

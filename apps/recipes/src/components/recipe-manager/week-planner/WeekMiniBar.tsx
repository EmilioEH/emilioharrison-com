import React from 'react'
import { useStore } from '@nanostores/react'
import { format, parseISO, startOfWeek, addWeeks, isSameWeek } from 'date-fns'
import { Calendar } from 'lucide-react'

import { weekState, switchWeekContext, currentWeekRecipes } from '../../../lib/weekStore'

interface WeekMiniBarProps {
  onOpenCalendar: () => void
}

export const WeekMiniBar: React.FC<WeekMiniBarProps> = ({ onOpenCalendar }) => {
  const { activeWeekStart } = useStore(weekState)
  const currentRecipes = useStore(currentWeekRecipes)

  const activeDate = parseISO(activeWeekStart)
  const today = new Date()
  const currentWeekStarts = startOfWeek(today, { weekStartsOn: 1 })
  const nextWeekStarts = addWeeks(currentWeekStarts, 1)

  const isThisWeek = isSameWeek(activeDate, today, { weekStartsOn: 1 })
  const isNextWeek = isSameWeek(activeDate, addWeeks(today, 1), { weekStartsOn: 1 })

  // Helpers to switch context
  const handleSetThisWeek = () => switchWeekContext(format(currentWeekStarts, 'yyyy-MM-dd'))
  const handleSetNextWeek = () => switchWeekContext(format(nextWeekStarts, 'yyyy-MM-dd'))

  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-background p-1 pr-3 shadow-sm transition-all hover:border-primary/50">
      {/* Calendar Trigger */}
      <button
        onClick={onOpenCalendar}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
      >
        <Calendar className="h-4 w-4" />
      </button>

      {/* Context Toggles */}
      <div className="flex items-center rounded-md bg-muted/30 p-0.5">
        <button
          onClick={handleSetThisWeek}
          className={`rounded px-2.5 py-1 text-xs font-bold transition-all ${
            isThisWeek
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          This
        </button>
        <button
          onClick={handleSetNextWeek}
          className={`rounded px-2.5 py-1 text-xs font-bold transition-all ${
            isNextWeek
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Next
        </button>
      </div>

      {/* Current Meals Count */}
      <div className="ml-auto text-xs font-medium text-muted-foreground">
        <span className="font-bold text-foreground">{currentRecipes.length}</span> meals
      </div>
    </div>
  )
}

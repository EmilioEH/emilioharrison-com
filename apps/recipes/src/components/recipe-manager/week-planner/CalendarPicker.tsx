import React from 'react'
import { format, parseISO, addWeeks, isSameWeek } from 'date-fns'
import { useStore } from '@nanostores/react'
import { Check } from 'lucide-react'

import {
  weekState,
  distinctWeeks,
  allPlannedRecipes,
  switchWeekContext,
} from '../../../lib/weekStore'
import { ResponsiveModal } from '../../ui/ResponsiveModal'

interface CalendarPickerProps {
  isOpen: boolean
  onClose: () => void
}

export const CalendarPicker: React.FC<CalendarPickerProps> = ({ isOpen, onClose }) => {
  const { activeWeekStart } = useStore(weekState)
  const weeks = useStore(distinctWeeks)
  const allRecipes = useStore(allPlannedRecipes)

  const handleSelectWeek = (weekStart: string) => {
    switchWeekContext(weekStart)
    onClose()
  }

  const renderWeekItem = (weekStart: string) => {
    const startDate = parseISO(weekStart)

    // Actually we want start + 6 days

    const isSelected = weekStart === activeWeekStart
    const isThisWeek = isSameWeek(startDate, new Date(), { weekStartsOn: 1 })

    // Count meals for this week
    const mealCount = allRecipes.filter((r) => r.weekStart === weekStart).length

    let label = isThisWeek ? 'This Week' : 'Week of ' + format(startDate, 'MMM d')
    if (isSameWeek(startDate, addWeeks(new Date(), 1), { weekStartsOn: 1 })) {
      label = 'Next Week'
    }

    return (
      <button
        key={weekStart}
        onClick={() => handleSelectWeek(weekStart)}
        className={`flex w-full items-center justify-between rounded-lg border p-4 transition-all ${
          isSelected
            ? 'border-primary bg-primary/5 shadow-sm'
            : 'border-border bg-card hover:bg-accent/50'
        }`}
      >
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-2">
            <div
              className={`h-2.5 w-2.5 rounded-full ${isSelected ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            />
            <span className={`font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
              {label}
            </span>
          </div>
          <span className="ml-4.5 pl-0.5 text-xs text-muted-foreground">
            {format(startDate, 'MMM d')} - {format(addWeeks(startDate, 1), 'MMM d')}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="block text-lg font-bold leading-none">{mealCount}</span>
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Meals</span>
          </div>
          {isSelected && <Check className="h-5 w-5 text-primary" />}
        </div>
      </button>
    )
  }

  return (
    <ResponsiveModal isOpen={isOpen} onClose={onClose} title="Select Week to Plan">
      <div className="flex flex-col gap-2 pb-6">{weeks.map(renderWeekItem)}</div>

      <div className="rounded-lg bg-blue-500/10 p-4 text-xs text-blue-600">
        <p className="mb-1 font-bold">Tip: Week Rollover</p>
        Currently active plans move to "Past Weeks" history every Monday at midnight.
      </div>
    </ResponsiveModal>
  )
}

import React from 'react'
import { format, parseISO, addDays, isSameWeek, startOfWeek } from 'date-fns'
import { useStore } from '@nanostores/react'
import { Check, ChevronRight } from 'lucide-react'

import {
  weekState,
  addRecipeToDay,
  currentWeekRecipes,
  switchWeekContext,
  removeRecipeFromDay,
  DAYS_OF_WEEK,
} from '../../../lib/weekStore'
import { ResponsiveModal } from '../../ui/ResponsiveModal'
import { Button } from '../../ui/button'

interface DayPickerProps {
  isOpen: boolean
  onClose: () => void
  recipeId: string
  recipeTitle: string
}

export const DayPicker: React.FC<DayPickerProps> = ({ isOpen, onClose, recipeId, recipeTitle }) => {
  const { activeWeekStart } = useStore(weekState)
  const currentRecipes = useStore(currentWeekRecipes)

  const plannedDays = currentRecipes.filter((p) => p.recipeId === recipeId).map((p) => p.day)

  const activeDate = parseISO(activeWeekStart)
  const isThisWeek = isSameWeek(activeDate, new Date(), { weekStartsOn: 1 })

  const handleToggleDay = (day: (typeof DAYS_OF_WEEK)[number], dateStr: string) => {
    const isPlanned = plannedDays.includes(day)

    if (isPlanned) {
      removeRecipeFromDay(recipeId, dateStr)
    } else {
      addRecipeToDay(recipeId, day)
      onClose()
    }
  }

  const handleSwitchWeek = () => {
    const today = new Date()
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 })

    // Check if activeDate is basically the same as currentWeekStart
    // (Using strings to avoid time Comparison issues)
    const isActiveThisWeek =
      format(activeDate, 'yyyy-MM-dd') === format(currentWeekStart, 'yyyy-MM-dd')

    if (isActiveThisWeek) {
      // Switch to Next Week
      const nextWeek = addDays(currentWeekStart, 7)
      switchWeekContext(format(nextWeek, 'yyyy-MM-dd'))
    } else {
      // Switch to This Week
      switchWeekContext(format(currentWeekStart, 'yyyy-MM-dd'))
    }
  }

  const daysList = DAYS_OF_WEEK.map((day, index) => {
    const date = addDays(activeDate, index)
    const dateLabel = format(date, 'EEE d.M.')
    const fullDate = format(date, 'yyyy-MM-dd')
    const isSelected = plannedDays.includes(day)

    return { day, dateLabel, fullDate, isSelected }
  })

  return (
    <ResponsiveModal isOpen={isOpen} onClose={onClose} title={`Add "${recipeTitle}"`}>
      <div className="flex flex-col gap-4 pb-6">
        {/* Context Switcher */}
        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
          <span className="text-sm font-medium">
            Planning for{' '}
            <span className="font-bold text-foreground">
              {isThisWeek ? 'This Week' : 'Next Week'}
            </span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSwitchWeek}
            className="h-8 gap-1 text-xs font-bold uppercase tracking-wider text-primary hover:text-primary/80"
          >
            {isThisWeek ? 'Plan Next Week' : 'Back to This Week'}
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>

        <div className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {format(activeDate, 'MMM d')} - {format(addDays(activeDate, 6), 'MMM d')}
        </div>

        {/* Days Grid/List */}
        <div className="flex flex-col gap-1">
          {daysList.map((item) => (
            <button
              key={item.day}
              onClick={() => handleToggleDay(item.day, item.fullDate)}
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
        </div>
      </div>
    </ResponsiveModal>
  )
}

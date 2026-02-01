import React, { useState, useRef } from 'react'
import { format, parseISO, addDays, isSameWeek, startOfWeek, addWeeks, isToday } from 'date-fns'
import { useStore } from '@nanostores/react'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'

import {
  weekState,
  addRecipeToDay,
  currentWeekRecipes,
  switchWeekContext,
  removeRecipeFromDay,
  DAYS_OF_WEEK,
  allPlannedRecipes,
  type DayOfWeek,
} from '../../../lib/weekStore'
import { ResponsiveModal } from '../../ui/ResponsiveModal'

interface DayPickerProps {
  isOpen: boolean
  onClose: () => void
  recipeId: string
  recipeTitle: string
  mode?: 'add' | 'edit'
  startWithWeekPicker?: boolean
  currentDay?: DayOfWeek
}

// Haptic feedback utility
const triggerHaptic = (style: 'light' | 'medium' | 'success' = 'light') => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      success: [10, 50, 20],
    }
    navigator.vibrate(patterns[style])
  }
}

export const DayPicker: React.FC<DayPickerProps> = ({
  isOpen,
  onClose,
  recipeId,
  recipeTitle,
  mode = 'add',
  startWithWeekPicker: _startWithWeekPicker = false,
  currentDay: _currentDay,
}) => {
  const { activeWeekStart } = useStore(weekState)
  const currentRecipes = useStore(currentWeekRecipes)
  const allRecipes = useStore(allPlannedRecipes)

  // Touch handling for swipe
  const touchStartX = useRef<number>(0)
  const touchEndX = useRef<number>(0)

  // Long press state
  const [longPressDay, setLongPressDay] = useState<DayOfWeek | null>(null)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)

  // Wrapped close handler that resets state
  const handleClose = () => {
    setLongPressDay(null)
    onClose()
  }

  const plannedDays = currentRecipes.filter((p) => p.recipeId === recipeId).map((p) => p.day)

  const activeDate = parseISO(activeWeekStart)
  const today = new Date()
  const isThisWeek = isSameWeek(activeDate, today, { weekStartsOn: 1 })
  const isNextWeek = isSameWeek(activeDate, addWeeks(today, 1), { weekStartsOn: 1 })

  // Calculate week boundaries for navigation
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const maxWeekStart = addWeeks(currentWeekStart, 7) // 8 weeks total

  const canGoBack = activeDate > currentWeekStart
  const canGoForward = activeDate < maxWeekStart

  // Get week label
  const getWeekLabel = () => {
    if (isThisWeek) return 'This Week'
    if (isNextWeek) return 'Next Week'
    return `Week of ${format(activeDate, 'MMM d')}`
  }

  // Get meal count for current week
  const mealCount = allRecipes.filter((r) => r.weekStart === activeWeekStart).length

  // Get meals for a specific day (for long-press preview)
  const getMealsForDay = (day: DayOfWeek) => {
    return currentRecipes.filter((r) => r.day === day)
  }

  // Check if a day has any meals (for dot indicator)
  const dayHasMeals = (day: DayOfWeek) => {
    return currentRecipes.some((r) => r.day === day)
  }

  const handleToggleDay = async (day: DayOfWeek) => {
    const isPlanned = plannedDays.includes(day)

    triggerHaptic(isPlanned ? 'light' : 'success')

    if (isPlanned) {
      await removeRecipeFromDay(recipeId)
    } else {
      const success = await addRecipeToDay(recipeId, day)
      if (success) {
        handleClose()
      }
    }
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeekStart = direction === 'prev' ? addWeeks(activeDate, -1) : addWeeks(activeDate, 1)

    // Check bounds
    if (direction === 'prev' && !canGoBack) return
    if (direction === 'next' && !canGoForward) return

    triggerHaptic('light')
    switchWeekContext(format(newWeekStart, 'yyyy-MM-dd'))
  }

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    // Initialize touchEndX to same position so a tap (no move) results in diff=0
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current
    const threshold = 50

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        navigateWeek('next')
      } else {
        navigateWeek('prev')
      }
    }
  }

  // Long press handlers
  const handleLongPressStart = (day: DayOfWeek) => {
    longPressTimer.current = setTimeout(() => {
      triggerHaptic('medium')
      setLongPressDay(day)
    }, 500)
  }

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleLongPressCancel = () => {
    handleLongPressEnd()
    setLongPressDay(null)
  }

  // Build day data
  const daysList = DAYS_OF_WEEK.map((day, index) => {
    const date = addDays(activeDate, index)
    const dayNum = format(date, 'd')
    const dayAbbrev = format(date, 'EEE') // Mon, Tue, Wed, etc.
    const isSelected = plannedDays.includes(day)
    const isTodayDate = isToday(date)
    const hasMeals = dayHasMeals(day)

    return { day, dayNum, dayAbbrev, isSelected, isTodayDate, hasMeals, date }
  })

  // Split into two rows: 4 + 3
  const topRow = daysList.slice(0, 4)
  const bottomRow = daysList.slice(4)

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === 'edit' ? `Move "${recipeTitle}"` : `Add "${recipeTitle}"`}
      compact
    >
      <div
        className="pb-4"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Week Header with Navigation */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => navigateWeek('prev')}
            disabled={!canGoBack}
            className={`rounded-full p-2 transition-colors ${
              canGoBack ? 'text-foreground hover:bg-accent' : 'text-muted-foreground/30'
            }`}
            aria-label="Previous week"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="text-center">
            <div className="font-display text-sm font-bold text-foreground">{getWeekLabel()}</div>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span>
                {format(activeDate, 'MMM d')} – {format(addDays(activeDate, 6), 'MMM d')}
              </span>
              {mealCount > 0 && (
                <>
                  <span>·</span>
                  <span>
                    {mealCount} {mealCount === 1 ? 'meal' : 'meals'}
                  </span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={() => navigateWeek('next')}
            disabled={!canGoForward}
            className={`rounded-full p-2 transition-colors ${
              canGoForward ? 'text-foreground hover:bg-accent' : 'text-muted-foreground/30'
            }`}
            aria-label="Next week"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Day Grid */}
        <div className="space-y-2">
          {/* Top Row - 4 days */}
          <div className="grid grid-cols-4 gap-2">
            {topRow.map((item) => (
              <DayCell
                key={item.day}
                item={item}
                onSelect={handleToggleDay}
                onLongPressStart={handleLongPressStart}
                onLongPressEnd={handleLongPressEnd}
              />
            ))}
          </div>

          {/* Bottom Row - 3 days, centered */}
          <div className="flex justify-center gap-2">
            {bottomRow.map((item) => (
              <DayCell
                key={item.day}
                item={item}
                onSelect={handleToggleDay}
                onLongPressStart={handleLongPressStart}
                onLongPressEnd={handleLongPressEnd}
                className="w-[calc(25%-4px)]"
              />
            ))}
          </div>
        </div>

        {/* Today indicator legend */}
        <div className="mt-3 text-center text-xs text-muted-foreground">
          {daysList.some((d) => d.isTodayDate) && <span>○ = today</span>}
        </div>

        {/* Long Press Preview Overlay */}
        {longPressDay && (
          <div
            role="button"
            tabIndex={0}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={(e) => {
              // Only close if clicking the backdrop, not the dialog
              if (e.target === e.currentTarget) {
                handleLongPressCancel()
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
                handleLongPressCancel()
              }
            }}
            onTouchEnd={(e) => {
              if (e.target === e.currentTarget) {
                handleLongPressCancel()
              }
            }}
            aria-label="Close preview"
          >
            <div
              role="dialog"
              aria-labelledby="long-press-title"
              aria-modal="true"
              className="mx-4 max-w-sm rounded-2xl bg-card p-4 shadow-xl"
            >
              <h3 id="long-press-title" className="mb-2 font-display text-lg font-bold">
                {longPressDay} –{' '}
                {format(daysList.find((d) => d.day === longPressDay)?.date || new Date(), 'MMM d')}
              </h3>
              {getMealsForDay(longPressDay).length > 0 ? (
                <ul className="space-y-1">
                  {getMealsForDay(longPressDay).map((meal) => (
                    <li key={meal.recipeId} className="text-sm text-muted-foreground">
                      • {meal.recipeId === recipeId ? recipeTitle : 'Other recipe'}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No meals planned</p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">Tap anywhere to close</p>
            </div>
          </div>
        )}
      </div>
    </ResponsiveModal>
  )
}

// Extracted DayCell component for cleaner code
interface DayCellProps {
  item: {
    day: DayOfWeek
    dayNum: string
    dayAbbrev: string
    isSelected: boolean
    isTodayDate: boolean
    hasMeals: boolean
  }
  onSelect: (day: DayOfWeek) => void
  onLongPressStart: (day: DayOfWeek) => void
  onLongPressEnd: () => void
  className?: string
}

const DayCell: React.FC<DayCellProps> = ({
  item,
  onSelect,
  onLongPressStart,
  onLongPressEnd,
  className = '',
}) => {
  const { day, dayNum, dayAbbrev, isSelected, isTodayDate, hasMeals } = item

  return (
    <button
      onClick={() => onSelect(day)}
      onTouchStart={() => onLongPressStart(day)}
      onTouchEnd={onLongPressEnd}
      onTouchCancel={onLongPressEnd}
      onMouseDown={() => onLongPressStart(day)}
      onMouseUp={onLongPressEnd}
      onMouseLeave={onLongPressEnd}
      aria-label={`${day}, ${isSelected ? 'selected' : 'not selected'}`}
      className={`relative flex aspect-square flex-col items-center justify-center rounded-xl transition-all ${
        isSelected
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted/50 text-foreground hover:bg-muted'
      } ${isTodayDate && !isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''} ${className}`}
    >
      {/* Day abbreviation */}
      <span className="text-xs font-medium opacity-70">{dayAbbrev}</span>

      {/* Day number */}
      <span className="text-lg font-bold">{dayNum}</span>

      {/* Checkmark for selected */}
      {isSelected && (
        <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground">
          <Check className="h-3 w-3 text-primary" />
        </div>
      )}

      {/* Meal indicator dot (only when not selected) */}
      {hasMeals && !isSelected && (
        <div className="absolute bottom-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
      )}

      {/* Today ring indicator (visual label below) */}
      {isTodayDate && !isSelected && (
        <div className="absolute -bottom-0.5 text-[8px] font-bold text-primary">○</div>
      )}
    </button>
  )
}

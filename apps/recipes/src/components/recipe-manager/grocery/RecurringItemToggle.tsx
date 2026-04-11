import React, { useState, useRef, useEffect } from 'react'
import { CalendarDays } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { FrequencyPicker } from './FrequencyPicker'

interface RecurringItemToggleProps {
  itemName: string
  isRecurring?: boolean
  recurringFrequencyWeeks?: number
  onToggleRecurring: (itemName: string, frequencyWeeks: number | null) => Promise<void>
  disabled?: boolean
}

export const RecurringItemToggle: React.FC<RecurringItemToggleProps> = ({
  itemName,
  isRecurring,
  recurringFrequencyWeeks,
  onToggleRecurring,
  disabled,
}) => {
  const [showPopover, setShowPopover] = useState(false)
  const [loading, setLoading] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setShowPopover(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleFrequencySelect = async (frequencyWeeks: number | null) => {
    setLoading(true)
    try {
      await onToggleRecurring(itemName, frequencyWeeks)
      setShowPopover(false)
    } catch (err) {
      console.error('Failed to toggle recurring:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setShowPopover(!showPopover)
        }}
        disabled={disabled || loading}
        className={cn(
          'relative rounded-full p-1.5 transition-colors',
          isRecurring
            ? 'bg-primary/10 text-primary hover:bg-primary/20'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          (disabled || loading) && 'cursor-not-allowed opacity-50',
        )}
        aria-label={
          isRecurring ? `Recurring every ${recurringFrequencyWeeks} week(s)` : 'Make recurring'
        }
        title={
          isRecurring ? `Recurring every ${recurringFrequencyWeeks} week(s)` : 'Make recurring'
        }
      >
        <CalendarDays className={cn('h-4 w-4', loading && 'animate-pulse')} />
        {isRecurring && recurringFrequencyWeeks && (
          <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold leading-none text-primary-foreground">
            {recurringFrequencyWeeks}
          </span>
        )}
      </button>

      {/* Frequency Popover */}
      {showPopover && (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
        <div
          ref={popoverRef}
          className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-border bg-card p-2 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <FrequencyPicker
            currentFrequencyWeeks={recurringFrequencyWeeks}
            label={isRecurring ? 'Change frequency' : 'Add to recurring'}
            onSelect={handleFrequencySelect}
            disabled={loading}
          />
        </div>
      )}
    </div>
  )
}

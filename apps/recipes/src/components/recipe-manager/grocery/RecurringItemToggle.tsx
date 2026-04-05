import React, { useState, useRef, useEffect } from 'react'
import { CalendarDays, Check, Minus, Plus } from 'lucide-react'
import { cn } from '../../../lib/utils'

interface RecurringItemToggleProps {
  itemName: string
  isRecurring?: boolean
  recurringFrequencyWeeks?: number
  onToggleRecurring: (itemName: string, frequencyWeeks: number | null) => Promise<void>
  disabled?: boolean
}

const PRESET_OPTIONS: {
  value: number
  label: string
}[] = [
  { value: 1, label: '1 wk' },
  { value: 2, label: '2 wks' },
]

export const RecurringItemToggle: React.FC<RecurringItemToggleProps> = ({
  itemName,
  isRecurring,
  recurringFrequencyWeeks,
  onToggleRecurring,
  disabled,
}) => {
  const [showPopover, setShowPopover] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const [customWeeks, setCustomWeeks] = useState(3)
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
        setShowCustom(false)
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
      setShowCustom(false)
    } catch (err) {
      console.error('Failed to toggle recurring:', err)
    } finally {
      setLoading(false)
    }
  }

  const isCustomFrequency = isRecurring && recurringFrequencyWeeks && recurringFrequencyWeeks > 2

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
          <div className="mb-2 px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {isRecurring ? 'Change frequency' : 'Add to recurring'}
          </div>

          {PRESET_OPTIONS.map((option) => {
            const isActive = recurringFrequencyWeeks === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleFrequencySelect(isActive ? null : option.value)}
                disabled={loading}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
                )}
              >
                <span className="font-medium">{option.label}</span>
                {isActive && <Check className="h-4 w-4" />}
              </button>
            )
          })}

          {/* Custom option */}
          {!showCustom ? (
            <button
              type="button"
              onClick={() => {
                setShowCustom(true)
                setCustomWeeks(isCustomFrequency ? recurringFrequencyWeeks! : 3)
              }}
              disabled={loading}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors',
                isCustomFrequency ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
              )}
            >
              <span className="font-medium">
                {isCustomFrequency ? `${recurringFrequencyWeeks} wks` : 'Custom'}
              </span>
              {isCustomFrequency && <Check className="h-4 w-4" />}
            </button>
          ) : (
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setCustomWeeks(Math.max(3, customWeeks - 1))}
                  disabled={loading || customWeeks <= 3}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted disabled:opacity-40"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="text-sm font-bold tabular-nums">{customWeeks} wks</span>
                <button
                  type="button"
                  onClick={() => setCustomWeeks(Math.min(52, customWeeks + 1))}
                  disabled={loading || customWeeks >= 52}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted disabled:opacity-40"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  const isAlreadySet = recurringFrequencyWeeks === customWeeks
                  handleFrequencySelect(isAlreadySet ? null : customWeeks)
                }}
                disabled={loading}
                className="mt-2 w-full rounded-lg bg-primary px-3 py-1.5 text-center text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {recurringFrequencyWeeks === customWeeks ? 'Remove' : 'Set'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

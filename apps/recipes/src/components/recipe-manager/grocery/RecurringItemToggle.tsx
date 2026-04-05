import React, { useState, useRef, useEffect } from 'react'
import { Repeat, Check } from 'lucide-react'
import { cn } from '../../../lib/utils'

interface RecurringItemToggleProps {
  itemName: string
  isRecurring?: boolean
  recurringFrequency?: 'weekly' | 'biweekly' | 'monthly'
  onToggleRecurring: (
    itemName: string,
    frequency: 'weekly' | 'biweekly' | 'monthly' | null,
  ) => Promise<void>
  disabled?: boolean
}

const FREQUENCY_OPTIONS: {
  value: 'weekly' | 'biweekly' | 'monthly'
  label: string
  description: string
}[] = [
  { value: 'weekly', label: 'Weekly', description: 'Every week' },
  { value: 'biweekly', label: 'Every 2 weeks', description: 'Biweekly' },
  { value: 'monthly', label: 'Monthly', description: 'Once a month' },
]

export const RecurringItemToggle: React.FC<RecurringItemToggleProps> = ({
  itemName,
  isRecurring,
  recurringFrequency,
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

  const handleFrequencySelect = async (frequency: 'weekly' | 'biweekly' | 'monthly' | null) => {
    setLoading(true)
    try {
      await onToggleRecurring(itemName, frequency)
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
          'rounded-full p-1.5 transition-colors',
          isRecurring
            ? 'bg-primary/10 text-primary hover:bg-primary/20'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          (disabled || loading) && 'cursor-not-allowed opacity-50',
        )}
        aria-label={isRecurring ? `Recurring: ${recurringFrequency}` : 'Make recurring'}
        title={isRecurring ? `Recurring: ${recurringFrequency}` : 'Make recurring'}
      >
        <Repeat className={cn('h-4 w-4', loading && 'animate-spin')} />
      </button>

      {/* Frequency Popover */}
      {showPopover && (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
        <div
          ref={popoverRef}
          className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-border bg-card p-2 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-2 px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {isRecurring ? 'Change frequency' : 'Add to recurring'}
          </div>

          {FREQUENCY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleFrequencySelect(option.value)}
              disabled={loading}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors',
                recurringFrequency === option.value
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-muted',
              )}
            >
              <div>
                <div className="font-medium">{option.label}</div>
                <div className="text-xs text-muted-foreground">{option.description}</div>
              </div>
              {recurringFrequency === option.value && <Check className="h-4 w-4" />}
            </button>
          ))}

          {isRecurring && (
            <>
              <div className="my-2 border-t border-border" />
              <button
                type="button"
                onClick={() => handleFrequencySelect(null)}
                disabled={loading}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
              >
                Remove from recurring
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

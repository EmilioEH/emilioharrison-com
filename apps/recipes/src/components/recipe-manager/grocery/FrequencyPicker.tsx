import React, { useState } from 'react'
import { Check, Minus, Plus } from 'lucide-react'
import { cn } from '../../../lib/utils'

const PRESET_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: '1 wk' },
  { value: 2, label: '2 wks' },
]

interface FrequencyPickerProps {
  currentFrequencyWeeks?: number
  /** Whether the picker should allow clearing (toggling an active preset removes recurring) */
  allowClear?: boolean
  /** Label above the options. Defaults based on whether a frequency is set. */
  label?: string
  /** Called with weeks (1-52) or null if cleared. */
  onSelect: (frequencyWeeks: number | null) => void | Promise<void>
  disabled?: boolean
}

export const FrequencyPicker: React.FC<FrequencyPickerProps> = ({
  currentFrequencyWeeks,
  allowClear = true,
  label,
  onSelect,
  disabled,
}) => {
  const isCustomFrequency = !!(currentFrequencyWeeks && currentFrequencyWeeks > 2)
  const [showCustom, setShowCustom] = useState(false)
  const [customWeeks, setCustomWeeks] = useState(isCustomFrequency ? currentFrequencyWeeks! : 3)
  const [loading, setLoading] = useState(false)

  const handleSelect = async (value: number | null) => {
    setLoading(true)
    try {
      await onSelect(value)
    } finally {
      setLoading(false)
    }
  }

  const resolvedLabel = label ?? (currentFrequencyWeeks ? 'Change frequency' : 'Add to recurring')

  return (
    <div>
      <div className="mb-2 px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {resolvedLabel}
      </div>

      {PRESET_OPTIONS.map((option) => {
        const isActive = currentFrequencyWeeks === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(allowClear && isActive ? null : option.value)}
            disabled={loading || disabled}
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

      {!showCustom ? (
        <button
          type="button"
          onClick={() => {
            setShowCustom(true)
            setCustomWeeks(isCustomFrequency ? currentFrequencyWeeks! : 3)
          }}
          disabled={loading || disabled}
          className={cn(
            'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors',
            isCustomFrequency ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
          )}
        >
          <span className="font-medium">
            {isCustomFrequency ? `${currentFrequencyWeeks} wks` : 'Custom'}
          </span>
          {isCustomFrequency && <Check className="h-4 w-4" />}
        </button>
      ) : (
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setCustomWeeks(Math.max(3, customWeeks - 1))}
              disabled={loading || disabled || customWeeks <= 3}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted disabled:opacity-40"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="text-sm font-bold tabular-nums">{customWeeks} wks</span>
            <button
              type="button"
              onClick={() => setCustomWeeks(Math.min(52, customWeeks + 1))}
              disabled={loading || disabled || customWeeks >= 52}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted disabled:opacity-40"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              const isAlreadySet = currentFrequencyWeeks === customWeeks
              handleSelect(allowClear && isAlreadySet ? null : customWeeks)
            }}
            disabled={loading || disabled}
            className="mt-2 w-full rounded-lg bg-primary px-3 py-1.5 text-center text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {allowClear && currentFrequencyWeeks === customWeeks ? 'Remove' : 'Set'}
          </button>
        </div>
      )}
    </div>
  )
}

import React from 'react'
import { Timer as TimerIcon } from 'lucide-react'
import { TimerManager } from '../../services/timerManager'

interface TimerControlProps {
  stepNumber: number
  suggestedDuration?: number // minutes
}

export const TimerControl: React.FC<TimerControlProps> = ({ stepNumber, suggestedDuration }) => {
  // Only show if we have a suggested duration
  if (!suggestedDuration) return null

  // Optional: Check if a timer is already running for this step if we want to hide the button
  // const stepTimers = Object.values(session.activeTimers).filter((t) => t.stepNumber === stepNumber)
  // if (stepTimers.length > 0) return null

  return (
    <div className="mt-8 border-t border-border/50 pt-6">
      <button
        onClick={() => {
          const id = TimerManager.createTimer(
            stepNumber,
            suggestedDuration,
            `${suggestedDuration} Min Timer`,
          )
          TimerManager.startTimer(id)
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 py-4 font-display text-lg font-bold text-primary transition-all hover:bg-primary/5 active:scale-95"
      >
        <TimerIcon className="h-6 w-6" />
        Start {suggestedDuration} Min Timer
      </button>
    </div>
  )
}

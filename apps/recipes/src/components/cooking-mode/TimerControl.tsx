import React from 'react'
import { useStore } from '@nanostores/react'
import { Play, Pause, Plus, X, Timer as TimerIcon } from 'lucide-react'
import { $cookingSession } from '../../stores/cookingSession'
import { TimerManager } from '../../services/timerManager'
import { Stack, Inline } from '../ui/layout'

interface TimerControlProps {
  stepNumber: number
  suggestedDuration?: number // minutes
}

export const TimerControl: React.FC<TimerControlProps> = ({ stepNumber, suggestedDuration }) => {
  const session = useStore($cookingSession)

  // filtered timers for this step
  const stepTimers = Object.values(session.activeTimers).filter((t) => t.stepNumber === stepNumber)
  const hasTimers = stepTimers.length > 0

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (!hasTimers && !suggestedDuration) return null

  return (
    <Stack spacing="sm" className="my-4">
      {/* Active Timers */}
      {stepTimers.map((timer) => (
        <Inline
          key={timer.id}
          spacing="md"
          justify="between"
          className="rounded-xl border border-primary/20 bg-primary/5 p-4 animate-in fade-in slide-in-from-top-2"
        >
          <Inline spacing="sm">
            <div
              className={`rounded-full p-2 ${timer.isRunning ? 'animate-pulse bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              <TimerIcon className="h-5 w-5" />
            </div>
            <Stack spacing="xs">
              <div className="font-display text-2xl font-bold tabular-nums leading-none">
                {formatTime(timer.remaining)}
              </div>
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {timer.label}
              </div>
            </Stack>
          </Inline>

          <Inline spacing="sm">
            {/* Toggle Play/Pause */}
            <button
              onClick={() =>
                timer.isRunning
                  ? TimerManager.pauseTimer(timer.id)
                  : TimerManager.startTimer(timer.id)
              }
              className="rounded-full border border-border bg-background p-2 transition-all hover:bg-muted active:scale-95"
            >
              {timer.isRunning ? (
                <Pause className="h-5 w-5 fill-current" />
              ) : (
                <Play className="h-5 w-5 fill-current" />
              )}
            </button>

            {/* Add 1 Min */}
            <button
              onClick={() => TimerManager.addTime(timer.id, 1)}
              className="rounded-full border border-border bg-background p-2 transition-all hover:bg-muted active:scale-95"
            >
              <Plus className="h-5 w-5" />
            </button>

            {/* Cancel */}
            <button
              onClick={() => TimerManager.cancelTimer(timer.id)}
              className="rounded-full p-2 transition-all hover:bg-destructive/10 hover:text-destructive active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </Inline>
        </Inline>
      ))}

      {/* Suggested Timer Button */}
      {suggestedDuration && !hasTimers && (
        <button
          onClick={() => {
            const id = TimerManager.createTimer(
              stepNumber,
              suggestedDuration,
              `${suggestedDuration} Min Timer`,
            )
            TimerManager.startTimer(id)
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 py-3 font-bold text-primary transition-all hover:bg-primary/5 active:scale-95"
        >
          <TimerIcon className="h-5 w-5" />
          Start {suggestedDuration} Min Timer
        </button>
      )}
    </Stack>
  )
}

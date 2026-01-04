import React from 'react'
import { useStore } from '@nanostores/react'
import { Timer, Pause, Play } from 'lucide-react'
import { $cookingSession } from '../../stores/cookingSession'
import { TimerManager } from '../../services/timerManager'

export const ActiveTimersHeader: React.FC = () => {
  const session = useStore($cookingSession)

  // Get all running timers OR timers with remaining time > 0
  const activeTimers = Object.values(session.activeTimers).filter(
    (t) => t.isRunning || t.remaining > 0,
  )

  if (activeTimers.length === 0) return null

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex gap-2 overflow-x-auto border-b border-border/50 bg-background/95 px-4 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {activeTimers.map((timer) => (
        <div
          key={timer.id}
          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold shadow-sm transition-all ${timer.isRunning ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border bg-muted/50 text-muted-foreground'} `}
        >
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <Timer className={`h-3 w-3 ${timer.isRunning ? 'animate-pulse' : ''}`} />
            Step {timer.stepNumber}: {formatTime(timer.remaining)}
          </span>

          {/* Tiny Controls */}
          <div className="ml-1 flex items-center gap-1 border-l border-border/10 pl-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (timer.isRunning) {
                  TimerManager.pauseTimer(timer.id)
                } else {
                  TimerManager.startTimer(timer.id)
                }
              }}
              className="rounded-full p-0.5 hover:bg-background/50"
            >
              {timer.isRunning ? (
                <Pause className="h-3 w-3 fill-current" />
              ) : (
                <Play className="h-3 w-3 fill-current" />
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

import React from 'react'
import { useStore } from '@nanostores/react'
import { Play, Timer, ChefHat } from 'lucide-react'
import { $cookingSession } from '../../stores/cookingSession'

interface CookingStatusIndicatorProps {
  onResume: () => void
}

export const CookingStatusIndicator: React.FC<CookingStatusIndicatorProps> = ({ onResume }) => {
  const session = useStore($cookingSession)

  if (!session.isActive || !session.recipe) return null

  // Find the most urgent active timer (shortest remaining time)
  const activeTimers = Object.values(session.activeTimers).filter((t) => t.remaining > 0)
  const urgentTimer = activeTimers.sort((a, b) => a.remaining - b.remaining)[0]

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 flex items-center justify-between rounded-xl border border-primary/20 bg-background/95 p-3 shadow-lg backdrop-blur-md duration-300 animate-in fade-in slide-in-from-bottom-10">
      <div className="flex items-center gap-3 overflow-hidden">
        {/* Pulse Indicator */}
        <div className="relative flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary/10 text-primary">
          <ChefHat className="h-5 w-5" />
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/20 opacity-75"></span>
        </div>

        <div className="flex flex-col overflow-hidden">
          <span className="truncate text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Cooking Now
          </span>
          <span className="truncate text-sm font-bold text-foreground">{session.recipe.title}</span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              Step {session.currentStepIdx + 1} of {session.recipe.steps.length}
            </span>
            {urgentTimer && (
              <span className="flex items-center gap-1 font-mono font-bold text-primary">
                <Timer className="h-3 w-3" />
                {formatTime(urgentTimer.remaining)}
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={onResume}
        className="flex flex-none items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-md transition-transform active:scale-95"
      >
        <span>Resume</span>
        <Play className="h-3 w-3 fill-current" />
      </button>
    </div>
  )
}

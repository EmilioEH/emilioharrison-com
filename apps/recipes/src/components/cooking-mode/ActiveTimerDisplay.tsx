import React from 'react'
import { useStore } from '@nanostores/react'
import { $cookingSession, cookingSessionActions } from '../../stores/cookingSession'
import { TimerManager } from '../../services/timerManager'
import { Play, Pause, X, Minimize2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Helper for MM:SS or HH:MM:SS
const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Timer progress circle component - extracted for lint compliance
const TimerCircle: React.FC<{ elapsed: number; stepNumber: number }> = ({
  elapsed,
  stepNumber,
}) => (
  <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-foreground bg-muted">
    {/* Conic Gradient Fill */}
    <div
      className="absolute inset-0"
      style={{
        background: `conic-gradient(transparent 0% ${elapsed}%, black ${elapsed}% 100%)`,
      }}
    />
    {/* Step Number */}
    <span className="relative z-10 font-display text-xs font-bold text-white drop-shadow-md">
      {stepNumber}
    </span>
  </div>
)

export const ActiveTimerDisplay: React.FC = () => {
  const session = useStore($cookingSession)
  const [isExpanded, setIsExpanded] = React.useState(true)

  const timers = Object.values(session.activeTimers)

  // If no timers, don't render anything
  if (timers.length === 0) return null

  // Get most urgent timer
  const activeTimer = timers.sort((a, b) => a.remaining - b.remaining)[0]

  // Calculate progress for visual indicator
  const total =
    (activeTimer as unknown as { duration?: number }).duration ||
    (activeTimer.remaining > 0 ? activeTimer.remaining : 1)
  const progress = Math.max(0, Math.min(1, activeTimer.remaining / total))
  const elapsed = (1 - progress) * 100

  return (
    <div className="flex w-full items-center justify-start border-b border-border bg-background/50 px-4 py-2 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        {isExpanded ? (
          <motion.div
            key="timer-expanded"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 shadow-sm"
          >
            {/* Step # - Clickable to navigate */}
            <button
              onClick={() => cookingSessionActions.goToStep(activeTimer.stepNumber)}
              className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground hover:text-primary hover:underline"
            >
              Step {activeTimer.stepNumber}
            </button>

            {/* Divider */}
            <div className="h-4 w-px bg-border" />

            {/* Circle */}
            <div className="scale-75">
              <TimerCircle elapsed={elapsed} stepNumber={activeTimer.stepNumber} />
            </div>

            {/* Time */}
            <span className="font-display text-xl font-bold tabular-nums text-foreground">
              {formatTime(activeTimer.remaining)}
            </span>

            {/* Play/Pause button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (activeTimer.isRunning) {
                  TimerManager.pauseTimer(activeTimer.id)
                } else {
                  TimerManager.startTimer(activeTimer.id)
                }
              }}
              className="ml-1 rounded-full bg-muted p-1.5 text-foreground transition-transform hover:bg-muted/80 active:scale-95"
            >
              {activeTimer.isRunning ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="h-4 w-4 fill-current" />
              )}
            </button>

            {/* Cancel button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                TimerManager.cancelTimer(activeTimer.id)
              }}
              className="rounded-full p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Minimizer Toggle */}
            <button
              onClick={() => setIsExpanded(false)}
              className="ml-1 rounded-full p-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="timer-minified"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-2 py-1 transition-all active:scale-95"
          >
            <div className="scale-75">
              <TimerCircle elapsed={elapsed} stepNumber={activeTimer.stepNumber} />
            </div>
            <span className="font-display text-lg font-bold tabular-nums text-primary">
              {formatTime(activeTimer.remaining)}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

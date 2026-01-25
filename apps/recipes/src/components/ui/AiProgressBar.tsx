import React from 'react'
import { Sparkles } from 'lucide-react'

interface AiProgressBarProps {
  progress: number | string // Allow '10%' string or number 0-100
  message?: string
  isAnimating?: boolean
  className?: string
}

export const AiProgressBar: React.FC<AiProgressBarProps> = ({
  progress,
  message = 'Consulting Chef Gemini...',
  isAnimating = false,
  className = '',
}) => {
  // Normalize progress to a CSS width string
  const width = typeof progress === 'string' ? progress : `${Math.max(0, Math.min(100, progress))}%`

  return (
    <div
      className={`rounded-lg bg-primary/10 p-3 animate-in fade-in slide-in-from-bottom-2 ${className}`}
    >
      <div className="flex items-center gap-2 text-sm text-primary">
        <Sparkles className={`h-4 w-4 ${isAnimating ? 'animate-pulse' : ''}`} />
        <span className="font-medium">{message}</span>
      </div>
      {/* Progress bar */}
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-primary/20">
        <div className="h-full bg-primary transition-all duration-300 ease-out" style={{ width }} />
      </div>
    </div>
  )
}

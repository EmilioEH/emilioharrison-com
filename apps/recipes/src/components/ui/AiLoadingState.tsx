import React from 'react'
import { Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type AiLoadingStage = 'idle' | 'fallback' | 'processing' | 'complete' | 'error'

export type AiFeature = 'recipe-import' | 'grocery-list' | 'recipe-enhancement' | 'cost-estimate'

interface AiLoadingStateProps {
  stage: AiLoadingStage
  progress?: number // 0-1, tracks streaming progress
  feature: AiFeature
  onCancel?: () => void
  className?: string
}

const FEATURE_MESSAGES: Record<AiFeature, Record<AiLoadingStage, string>> = {
  'recipe-import': {
    idle: '',
    fallback: 'Preparing...',
    processing: 'Reading recipe...',
    complete: 'Recipe imported!',
    error: 'Failed to import recipe',
  },
  'grocery-list': {
    idle: '',
    fallback: 'Creating quick list...',
    processing: 'Converting to store units...',
    complete: 'List ready!',
    error: 'Failed to generate list',
  },
  'recipe-enhancement': {
    idle: '',
    fallback: 'Loading recipe...',
    processing: 'Organizing ingredients and steps...',
    complete: 'Recipe enhanced!',
    error: 'Failed to enhance recipe',
  },
  'cost-estimate': {
    idle: '',
    fallback: 'Preparing...',
    processing: 'Calculating costs...',
    complete: 'Estimate complete!',
    error: 'Failed to estimate cost',
  },
}

export const AiLoadingState: React.FC<AiLoadingStateProps> = ({
  stage,
  progress = 0,
  feature,
  onCancel,
  className,
}) => {
  const message = FEATURE_MESSAGES[feature][stage]
  const showCancel = onCancel && stage === 'processing'

  if (stage === 'idle') return null

  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 py-8', className)}>
      {/* Spinner with Icon */}
      <div className="relative">
        {/* Circular Loading Spinner */}
        {stage === 'processing' && (
          <svg
            className="absolute inset-0 h-16 w-16 animate-spin text-primary"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}

        {/* Static Sparkles Icon */}
        <div
          className={cn(
            'relative flex h-16 w-16 items-center justify-center rounded-full',
            stage === 'complete' && 'bg-green-500/10',
            stage === 'error' && 'bg-red-500/10',
            stage === 'processing' && 'bg-primary/10',
            stage === 'fallback' && 'bg-muted',
          )}
        >
          <Sparkles
            className={cn(
              'h-8 w-8',
              stage === 'complete' && 'text-green-600 dark:text-green-400',
              stage === 'error' && 'text-red-600 dark:text-red-400',
              stage === 'processing' && 'text-primary',
              stage === 'fallback' && 'text-muted-foreground',
            )}
          />
        </div>
      </div>

      {/* Message */}
      <p className="text-sm font-medium text-muted-foreground">{message}</p>

      {/* Progress Bar */}
      {stage === 'processing' && progress > 0 && (
        <div className="h-1 w-64 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}

      {/* Cancel Button */}
      {showCancel && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      )}
    </div>
  )
}

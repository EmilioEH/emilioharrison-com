import React from 'react'

interface ExitConfirmationProps {
  isOpen: boolean
  onCancel: () => void
  onConfirm: () => void
  stepNumber: number
  totalSteps: number
}

export const ExitConfirmation: React.FC<ExitConfirmationProps> = ({
  isOpen,
  onCancel,
  onConfirm,
  stepNumber,
  totalSteps,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-2">
        <h3 className="mb-2 font-display text-xl font-bold">End Cooking Session?</h3>
        <p className="mb-6 text-muted-foreground">
          You're on{' '}
          <b>
            Step {stepNumber} of {totalSteps}
          </b>
          . Current progress (timers, checked steps) will be lost.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={onConfirm}
            className="w-full rounded-xl bg-destructive py-3.5 font-bold text-destructive-foreground transition-transform active:scale-95"
          >
            End Session
          </button>
          <button
            onClick={onCancel}
            className="w-full rounded-xl py-3.5 font-medium text-foreground transition-transform hover:bg-muted active:scale-95"
          >
            Keep Cooking
          </button>
        </div>
      </div>
    </div>
  )
}

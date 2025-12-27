import React, { useState } from 'react'
import { X, CheckCircle2, Circle } from 'lucide-react'

const PrepMode = ({ recipe, prepState, togglePrep, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0)

  const items = recipe.ingredients || []

  // Progress calculation
  const progress = items.length > 0 ? ((currentIndex + 1) / items.length) * 100 : 0

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // Completed last item, maybe show a "Done" screen or close?
      // For now, just close or stay on last item
    }
  }

  const currentItem = items[currentIndex]
  const isChecked = !!prepState[recipe.id]?.[currentIndex]

  const handleToggleAndNext = () => {
    if (!isChecked) {
      togglePrep(recipe.id, currentIndex)
      // Optional: Auto-advance after a brief delay?
      // setTimeout(handleNext, 300);
      handleNext()
    } else {
      togglePrep(recipe.id, currentIndex) // Uncheck
    }
  }

  if (items.length === 0) {
    return (
      <div className="bg-md-sys-color-on-surface/20 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="rounded-md-xl border border-md-sys-color-outline bg-md-sys-color-surface p-6 text-center shadow-md-2">
          <p className="mb-4 font-body text-md-sys-color-on-surface-variant">
            No ingredients to prep for this recipe.
          </p>
          <button
            onClick={onClose}
            className="rounded-full bg-md-sys-color-primary px-4 py-2 font-medium text-md-sys-color-on-primary shadow-md-1 transition-all hover:shadow-md-2"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in slide-in-from-bottom-10 bg-paper fixed inset-0 z-50 flex flex-col duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-md-sys-color-outline bg-md-sys-color-surface px-4 py-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-md-sys-color-primary">
            Steps
          </h2>
          <p className="font-body text-xs text-md-sys-color-on-surface-variant">
            Prep for {recipe.title}
          </p>
        </div>
        <button
          onClick={onClose}
          className="hover:bg-md-sys-color-on-surface/[0.08] rounded-full p-2 transition"
        >
          <X className="h-5 w-5 text-md-sys-color-on-surface" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="h-1 w-full bg-md-sys-color-surface-variant">
        <div
          className="h-full bg-md-sys-color-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* Main Content */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-md-sys-color-surface p-6">
        <div className="relative w-full max-w-md overflow-hidden rounded-md-xl border border-md-sys-color-outline bg-md-sys-color-surface p-8 text-center shadow-md-3">
          <span className="mb-4 inline-block rounded-full border border-md-sys-color-outline px-3 py-1 font-body text-xs font-medium uppercase tracking-widest text-md-sys-color-on-surface-variant">
            Ingredient {currentIndex + 1} of {items.length}
          </span>

          <div className="mb-2 mt-4 font-display text-4xl font-bold tracking-tight text-md-sys-color-primary md:text-5xl">
            {currentItem.amount}
          </div>
          <div className="mb-8 font-body text-xl font-medium capitalize text-md-sys-color-on-surface-variant">
            {currentItem.name}
          </div>

          <div
            className={`mb-8 rounded-md-l border border-md-sys-color-outline p-6 ${currentItem.prep ? 'bg-md-sys-color-secondary-container' : 'bg-md-sys-color-surface-variant/20'}`}
          >
            <div className="mb-2 font-body text-xs font-medium uppercase tracking-wider text-md-sys-color-on-surface-variant">
              Action
            </div>
            <div className="font-display text-2xl font-bold capitalize text-md-sys-color-secondary">
              {currentItem.prep || 'Measure & Reserve'}
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleToggleAndNext}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-md-sys-color-primary py-4 font-body text-lg font-medium text-md-sys-color-on-primary shadow-md-1 transition hover:shadow-md-2 active:shadow-none"
            >
              {isChecked ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
              {isChecked ? 'Next Item' : 'Mark Done & Next'}
            </button>
          </div>
        </div>

        {/* Navigation Dots / List */}
        <div className="no-scrollbar mt-8 flex max-w-full gap-2 overflow-x-auto px-4 pb-4">
          {items.map((_, idx) => {
            const isActive = idx === currentIndex
            const isCompleted = !!prepState[recipe.id]?.[idx]
            let bgClass = 'bg-gray-300'
            if (isActive) {
              bgClass = 'bg-ink scale-125'
            } else if (isCompleted) {
              bgClass = 'bg-teal'
            }

            return (
              <div
                key={idx}
                role="button"
                tabIndex={0}
                onClick={() => setCurrentIndex(idx)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setCurrentIndex(idx)
                }}
                className={`h-2.5 w-2.5 shrink-0 cursor-pointer rounded-full border border-md-sys-color-outline transition-all ${bgClass}`}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default PrepMode

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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper p-4">
        <div className="rounded-xl border-2 border-ink bg-white p-6 text-center shadow-hard">
          <p className="mb-4 font-body text-gray-500">No ingredients to prep for this recipe.</p>
          <button
            onClick={onClose}
            className="rounded-lg bg-ink px-4 py-2 font-bold text-paper shadow-hard-sm transition-all hover:translate-y-0.5 hover:shadow-none"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in slide-in-from-bottom-10 fixed inset-0 z-50 flex flex-col bg-paper duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-ink bg-white px-4 py-4 shadow-sm">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">Steps</h2>
          <p className="font-body text-xs text-gray-500">Prep for {recipe.title}</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-full border-2 border-transparent bg-gray-100 p-2 transition hover:border-ink hover:bg-gray-200"
        >
          <X className="h-5 w-5 text-ink" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full bg-gray-200">
        <div
          className="h-full bg-teal transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* Main Content */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-paper p-6">
        {/* Dynamic decorative background */}
        <div className="absolute left-0 top-0 h-2 w-full bg-gradient-to-r from-orange-400 to-red-500"></div>

        <div className="relative w-full max-w-md overflow-hidden rounded-3xl border-2 border-ink bg-white p-8 text-center shadow-hard-xl">
          <span className="mb-4 inline-block rounded-full border border-gray-200 px-3 py-1 font-accent text-xs font-bold uppercase tracking-widest text-gray-400">
            Ingredient {currentIndex + 1} of {items.length}
          </span>

          <div className="mb-2 mt-4 font-display text-4xl font-bold tracking-tight text-ink md:text-5xl">
            {currentItem.amount}
          </div>
          <div className="mb-8 font-body text-xl font-medium capitalize text-gray-600">
            {currentItem.name}
          </div>

          <div
            className={`mb-8 rounded-xl border-2 border-ink p-6 ${currentItem.prep ? 'bg-orange-50' : 'bg-gray-50'}`}
          >
            <div className="mb-2 font-accent text-xs font-bold uppercase tracking-wider text-ink">
              Action
            </div>
            <div className="font-display text-2xl font-bold capitalize text-coral">
              {currentItem.prep || 'Measure & Reserve'}
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleToggleAndNext}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-4 font-display text-lg font-bold text-paper shadow-hard transition hover:bg-black active:translate-y-1 active:shadow-none"
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
                className={`h-2.5 w-2.5 shrink-0 cursor-pointer rounded-full border border-ink transition-all ${bgClass}`}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default PrepMode

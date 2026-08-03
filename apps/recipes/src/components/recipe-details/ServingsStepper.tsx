import React from 'react'
import { motion } from 'framer-motion'
import { Users, Minus, Plus, RotateCcw } from 'lucide-react'
import { triggerHaptic } from '../../lib/haptics'

interface ServingsStepperProps {
  /** What the recipe itself says. Never changed by this control. */
  recipeServings: number
  /** What this week is being cooked for, when the cook has chosen. */
  weekServings?: number
  onChange: (servings: number | undefined) => void
  disabled?: boolean
}

const MIN = 1
const MAX = 100

/**
 * Choose how many this recipe is being cooked for.
 *
 * The number is a property of *this week's plan*, not of the recipe — cooking for six this week
 * must not change the recipe for everyone forever — so the recipe's own count stays visible
 * underneath, with one tap to go back to it. Amounts on screen rescale; the stored recipe does not
 * change.
 */
export const ServingsStepper: React.FC<ServingsStepperProps> = ({
  recipeServings,
  weekServings,
  onChange,
  disabled,
}) => {
  const current = weekServings ?? recipeServings
  const changed = typeof weekServings === 'number' && weekServings !== recipeServings

  const step = (delta: number) => {
    const next = Math.min(MAX, Math.max(MIN, current + delta))
    if (next === current) return
    triggerHaptic('light')
    // Stepping back onto the recipe's own count clears the override rather than storing a value
    // identical to it — otherwise the week would carry a choice that says nothing.
    onChange(next === recipeServings ? undefined : next)
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1 text-muted-foreground">
        <Users className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="text-[10px] font-bold uppercase tracking-wide">Serves</span>
      </div>

      <div className="flex items-center gap-0.5">
        <motion.button
          whileTap={{ scale: 0.9 }}
          type="button"
          onClick={() => step(-1)}
          disabled={disabled || current <= MIN}
          aria-label="Cook for one fewer"
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
        >
          <Minus className="h-4 w-4" />
        </motion.button>

        <span
          data-testid="servings-value"
          aria-live="polite"
          className={`min-w-6 text-center text-lg font-bold ${changed ? 'text-primary' : 'text-foreground'}`}
        >
          {current}
        </span>

        <motion.button
          whileTap={{ scale: 0.9 }}
          type="button"
          onClick={() => step(1)}
          disabled={disabled || current >= MAX}
          aria-label="Cook for one more"
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
        >
          <Plus className="h-4 w-4" />
        </motion.button>
      </div>

      {/* Only when it differs — the recipe's own number is not news until you have moved off it. */}
      {changed && (
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light')
            onChange(undefined)
          }}
          disabled={disabled}
          aria-label={`Back to the recipe's ${recipeServings} servings`}
          className="flex cursor-pointer items-center gap-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <RotateCcw className="h-2.5 w-2.5" aria-hidden="true" />
          recipe makes {recipeServings}
        </button>
      )}
    </div>
  )
}

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '../../../lib/utils'
import type { CookOutcome } from '../../../lib/week-review'
import type { Recipe } from '../../../lib/types'

interface WeekReviewPromptProps {
  weekStart: string
  recipes: Recipe[]
  onSubmit: (outcomes: Array<{ recipeId: string; outcome: CookOutcome }>) => Promise<void>
  onDismiss: () => void
}

/** Four taps, not five stars. The suggester only needs to know whether you'd have it again. */
const OPTIONS: Array<{ value: CookOutcome; label: string }> = [
  { value: 'skipped', label: "Didn't make it" },
  { value: 'meh', label: 'Meh' },
  { value: 'good', label: 'Good' },
  { value: 'again', label: 'Again' },
]

function formatWeek(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00`)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`
}

/**
 * Asks how the last finished week went, at the moment the cook opens the planner.
 *
 * This is the only place the app records that a meal was actually cooked. Before it existed,
 * rating a recipe meant navigating back to it days later and volunteering a review — which is why
 * four recipes out of 413 carried a rating. Here the question arrives in the context the cook is
 * already in, on the cadence they already keep, and clears a week in a handful of taps.
 */
export const WeekReviewPrompt: React.FC<WeekReviewPromptProps> = ({
  weekStart,
  recipes,
  onSubmit,
  onDismiss,
}) => {
  const [answers, setAnswers] = useState<Record<string, CookOutcome>>({})
  const [saving, setSaving] = useState(false)

  const answeredCount = Object.keys(answers).length
  const allAnswered = answeredCount === recipes.length

  const save = async () => {
    setSaving(true)
    try {
      await onSubmit(
        recipes.map((r) => ({ recipeId: r.id, outcome: answers[r.id] ?? 'skipped' })),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
      className="mx-4 mb-4 rounded-xl border border-border bg-card p-4 shadow-sm"
      data-testid="week-review-prompt"
    >
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h3 className="font-display text-lg font-bold text-foreground">How did last week go?</h3>
        <span className="shrink-0 text-xs font-medium text-muted-foreground">
          {formatWeek(weekStart)}
        </span>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Answering makes the suggestions better. It only takes a tap each.
      </p>

      <div className="flex flex-col gap-4">
        {recipes.map((recipe) => (
          <div key={recipe.id}>
            <p className="mb-1.5 font-medium leading-snug text-foreground">{recipe.title}</p>
            <div
              className="flex flex-wrap gap-1.5"
              role="group"
              aria-label={`How was ${recipe.title}?`}
            >
              {OPTIONS.map((option) => {
                const selected = answers[recipe.id] === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setAnswers((prev) => ({ ...prev, [recipe.id]: option.value }))}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                      selected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground',
                    )}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving || answeredCount === 0}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-medium text-primary-foreground transition-opacity disabled:opacity-40"
        >
          <Check className="h-4 w-4" />
          {saving ? 'Saving…' : allAnswered ? 'Done' : `Save ${answeredCount} of ${recipes.length}`}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          disabled={saving}
          className="h-11 rounded-lg px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Skip
        </button>
      </div>
    </motion.section>
  )
}

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '../../../lib/utils'
import type { CookOutcome } from '../../../lib/week-review'
import type { Recipe } from '../../../lib/types'

interface WeekReviewPromptProps {
  recipes: Recipe[]
  onSubmit: (
    outcomes: Array<{ recipeId: string; outcome: CookOutcome }>,
    opts: { partial: boolean },
  ) => Promise<void>
  /** Close the screen; the week stays open and will be asked about again. */
  onDismiss: () => void
  /** Close the week for good, recording nothing. */
  onDismissWeek: () => Promise<void>
}

/** Four taps, not five stars. The suggester only needs to know whether you'd have it again. */
const OPTIONS: Array<{ value: CookOutcome; label: string }> = [
  { value: 'skipped', label: "Didn't make it" },
  { value: 'meh', label: 'Meh' },
  { value: 'good', label: 'Good' },
  { value: 'again', label: 'Again' },
]

/**
 * Asks how the last finished week went, at the moment the cook opens the planner.
 *
 * This is the only place the app records that a meal was actually cooked. Before it existed,
 * rating a recipe meant navigating back to it days later and volunteering a review — which is why
 * four recipes out of 413 carried a rating. Here the question arrives in the context the cook is
 * already in, on the cadence they already keep, and clears a week in a handful of taps.
 */
export const WeekReviewPrompt: React.FC<WeekReviewPromptProps> = ({
  recipes,
  onSubmit,
  onDismiss,
  onDismissWeek,
}) => {
  const [answers, setAnswers] = useState<Record<string, CookOutcome>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const answeredCount = Object.keys(answers).length
  const allAnswered = answeredCount === recipes.length

  /**
   * Sends only what was actually answered.
   *
   * It used to send `answers[r.id] ?? 'skipped'` for every recipe, so saving two of five recorded
   * the other three as "didn't make it" and closed the week for good. Unanswered now means
   * unanswered: the week stays open and asks about what's left.
   */
  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const answered = recipes
        .filter((r) => answers[r.id])
        .map((r) => ({ recipeId: r.id, outcome: answers[r.id] }))
      await onSubmit(answered, { partial: !allAnswered })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save that just now.')
    } finally {
      setSaving(false)
    }
  }

  const dismissWeek = async () => {
    setSaving(true)
    setError(null)
    try {
      await onDismissWeek()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not do that just now.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
      className="p-4"
      data-testid="week-review-prompt"
    >
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

      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-destructive">
          {error}
        </p>
      )}

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
          Not now
        </button>
      </div>

      {/* Saving part of a week now leaves it open, so there has to be a way to say "stop asking" —
       * otherwise the card sits on the plan for good. "Not now" above is the softer version. */}
      <button
        type="button"
        onClick={dismissWeek}
        disabled={saving}
        className="mt-2 flex h-11 w-full items-center justify-center rounded-lg text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Don’t ask about this week
      </button>
    </motion.section>
  )
}

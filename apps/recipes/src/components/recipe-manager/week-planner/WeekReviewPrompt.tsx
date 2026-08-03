import React, { useState } from 'react'
import { Check } from 'lucide-react'
import { Chip } from '../../ui/Chip'
import type { CookOutcome } from '../../../lib/week-review'
import type { Recipe } from '../../../lib/types'
import { VerdictIcon } from '../../recipe-details/verdicts'
import { VERDICT_META } from '../../../lib/verdict-display'

/**
 * A picture of the meal, when there is one.
 *
 * The review asks about a week that has already happened, so recall is the whole job — and a
 * photographed cookbook page is not a picture of the meal, so it is deliberately not used here.
 */
const thumbnailFor = (recipe: Recipe): string | null =>
  recipe.thumbUrl || recipe.finishedImage || (recipe.images?.length ? recipe.images[0] : null)

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

/**
 * Four taps, not five stars — the same three verdicts the recipe page offers, plus "didn't make
 * it", which only makes sense here. The words and icons come from the shared vocabulary so the
 * two surfaces cannot ask the same question differently again.
 */
const OPTIONS: CookOutcome[] = ['skipped', 'disliked', 'ok', 'loved']

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
    // No entrance animation of its own: `WeekScreen` slides this in from the right, and a
    // simultaneous vertical drift here turns that single movement into a diagonal one.
    <section className="p-4" data-testid="week-review-prompt">
      <div className="flex flex-col gap-4">
        {recipes.map((recipe) => (
          <div key={recipe.id}>
            <div className="mb-2 flex items-center gap-3">
              {thumbnailFor(recipe) && (
                <img
                  src={thumbnailFor(recipe)!}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-lg object-cover"
                />
              )}
              <p className="min-w-0 font-medium leading-snug text-foreground">{recipe.title}</p>
            </div>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label={`How was ${recipe.title}?`}
            >
              {OPTIONS.map((option) => (
                <Chip
                  key={option}
                  label={
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      <VerdictIcon verdict={option} className="h-4 w-4" />
                      <span aria-hidden="true">{VERDICT_META[option].label}</span>
                    </span>
                  }
                  active={answers[recipe.id] === option}
                  onClick={() => setAnswers((prev) => ({ ...prev, [recipe.id]: option }))}
                />
              ))}
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
    </section>
  )
}

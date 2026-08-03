/**
 * Deciding which past week still needs a "how did these go?" pass.
 *
 * The app had no moment where a cook was recorded: `cookingHistory` was initialised in four
 * places and appended to in none, and nothing anywhere set `lastCooked`. Rating a recipe meant
 * navigating back to it days later and volunteering a review, which is why four of 413 recipes
 * carried a rating after six months of weekly planning.
 *
 * So the ask moves to the moment that actually recurs: opening the planner. You plan weekly, so
 * you get asked weekly, about the week you just finished, in the context you are already in.
 */

import { format, parseISO, startOfWeek } from 'date-fns'

/**
 * What happened to a recipe that was on the plan.
 *
 * These are the same four slots as before under names that say what they mean — the week review
 * and the recipe page now ask the identical question, so they have to share one vocabulary.
 * `skipped` is what marks a meal as dealt with so the prompt stops asking about it; removing it
 * would leave un-cooked meals pending forever, with "Don't ask about this week" (which discards
 * the whole week) as the only escape.
 */
export type CookOutcome = 'skipped' | 'disliked' | 'ok' | 'loved'

/** The three a cook can give a recipe they actually made — the recipe page offers exactly these. */
export const VERDICTS = ['disliked', 'ok', 'loved'] as const
export type Verdict = (typeof VERDICTS)[number]

export const isVerdict = (value: unknown): value is Verdict =>
  typeof value === 'string' && (VERDICTS as readonly string[]).includes(value)

/**
 * The 1-5 rating a verdict is still written as, alongside the verdict itself.
 *
 * Kept for one release so a rollback has something to read; the scale it belongs to no longer
 * exists on screen. See `VERDICT_FOR_RATING` for the other direction.
 */
export const OUTCOME_RATING: Record<Verdict, number> = {
  disliked: 2,
  ok: 4,
  loved: 5,
}

/**
 * How a stored 1-5 rating reads back as a verdict.
 *
 * Audited against the live data before it was written (`scripts/REVIEW-AUDIT-2026-08-02.md`):
 * every value actually present maps the same way whether it came from the week review's four taps
 * or the recipe page's five stars, so the two entry points — which are indistinguishable on the
 * record, both having written `source: 'quick'` — do not need to be told apart.
 *
 * `loved` is reserved for the top mark of both scales. Reading a 4 as "loved" would invent
 * enthusiasm neither surface recorded: "Good" is not "make it again".
 */
export function verdictForRating(rating: number): Verdict {
  if (rating >= 5) return 'loved'
  if (rating >= 3) return 'ok'
  return 'disliked'
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/**
 * How far back the prompt will still ask.
 *
 * Three weeks is roughly the edge of "I remember how that went". Older weeks are not asked about
 * at all, rather than being asked about badly — a guessed answer is worse than no answer, because
 * the suggester treats it as fact.
 */
export const REVIEW_BACKLOG_WEEKS = 3

export interface PlannedForReview {
  recipeId: string
  weekStart: string
}

/** Monday of the week containing `date`, as YYYY-MM-DD. */
export function weekStartOf(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd')
}

/**
 * The most recent finished week that still needs reviewing, or null.
 *
 * Only one week is ever offered. Asking about three at once is a chore rather than a question,
 * and the older ones are the least reliably remembered anyway.
 */
export function weekAwaitingReview(
  planned: PlannedForReview[],
  reviewedWeeks: string[],
  today: Date = new Date(),
): { weekStart: string; recipeIds: string[] } | null {
  const thisWeek = weekStartOf(today)
  const reviewed = new Set(reviewedWeeks)
  const oldestWorthAsking = weekStartOf(
    new Date(new Date(`${thisWeek}T00:00:00`).getTime() - REVIEW_BACKLOG_WEEKS * WEEK_MS),
  )

  const byWeek = new Map<string, string[]>()
  for (const entry of planned) {
    // Only weeks that have finished. The current week is still being cooked.
    if (!entry.weekStart || entry.weekStart >= thisWeek) continue
    // And only weeks anyone could still honestly answer for. Without a floor this walks backwards
    // one week at a time forever: clear last week and it offers the one before, and after six
    // months of planning it is asking how a meal went in April.
    if (entry.weekStart < oldestWorthAsking) continue
    if (reviewed.has(entry.weekStart)) continue
    const ids = byWeek.get(entry.weekStart) ?? []
    if (!ids.includes(entry.recipeId)) ids.push(entry.recipeId)
    byWeek.set(entry.weekStart, ids)
  }

  if (!byWeek.size) return null

  const mostRecent = [...byWeek.keys()].sort().pop()!
  return { weekStart: mostRecent, recipeIds: byWeek.get(mostRecent)! }
}

/**
 * How strongly a recipe should be pushed at, or held back from, the cook.
 *
 * Positive means "offer this"; negative means "they just had it". Deliberately blunt — with four
 * ratings in the library today there is nothing subtle to model, and a transparent rule is one a
 * person can argue with when a suggestion looks wrong.
 */
export function preferenceWeight(
  outcomes: CookOutcome[],
  lastCookedWeek: string | null,
  today: Date = new Date(),
): number {
  let weight = 0
  for (const outcome of outcomes) {
    if (outcome === 'loved') weight += 2
    else if (outcome === 'ok') weight += 1
    else if (outcome === 'disliked') weight -= 2
  }

  // Even a favourite shouldn't come back every week — that stops being a recommendation and
  // starts being a rut.
  if (lastCookedWeek) {
    const weeksAgo =
      (parseISO(weekStartOf(today)).getTime() - parseISO(lastCookedWeek).getTime()) /
      (7 * 24 * 60 * 60 * 1000)
    if (weeksAgo < 3) weight -= 3
    else if (weeksAgo < 6) weight -= 1
  }

  return weight
}

/** "Jul 13 – Jul 19", for naming the week being asked about. */
export function formatWeekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00`)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`
}

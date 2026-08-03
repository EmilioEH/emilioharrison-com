import { isVerdict, verdictForRating, type Verdict } from './week-review'
import type { Review } from './types'

/** What a household thinks of a recipe, once everyone's latest word is counted. */
export type HouseholdVerdict = Verdict | 'mixed'

/**
 * Read one review's verdict.
 *
 * Reviews written before the verdict field existed only carry a 1-5 rating; those are read
 * through the audited mapping (see `verdictForRating` and `scripts/REVIEW-AUDIT-2026-08-02.md`).
 * The migration stamps `outcome` onto the stored ones, but a rollback or an in-flight client can
 * still produce a review without it.
 */
export function verdictOf(review: Pick<Review, 'outcome' | 'rating'>): Verdict {
  return isVerdict(review.outcome) ? review.outcome : verdictForRating(review.rating)
}

/**
 * The household's verdict on a recipe.
 *
 * Each person counts once, and it is their **most recent** word that counts — someone who
 * disliked a dish in February and loved the reworked version in July has changed their mind, and
 * a tally that keeps both is just wrong. Disagreement between people is real, though, and is
 * reported as `mixed` rather than averaged away: "one of us loves it, one of us doesn't" is
 * exactly the thing that should stop it going on the plan unexamined.
 *
 * Replaces the arithmetic mean, which could not be honest about a scale where the week review's
 * "Good" and the recipe page's fourth star both stored a 4 and meant different things.
 */
export function householdVerdict(reviews: readonly Review[] | undefined): HouseholdVerdict | null {
  if (!reviews?.length) return null

  const latestByUser = new Map<string, Review>()
  for (const review of reviews) {
    const previous = latestByUser.get(review.userId)
    if (!previous || new Date(review.createdAt) > new Date(previous.createdAt)) {
      latestByUser.set(review.userId, review)
    }
  }

  const verdicts = [...latestByUser.values()].map(verdictOf)
  if (!verdicts.length) return null

  const loved = verdicts.includes('loved')
  const disliked = verdicts.includes('disliked')

  if (loved && disliked) return 'mixed'
  if (loved) return 'loved'
  if (disliked) return 'disliked'
  return 'ok'
}

/**
 * What, if anything, goes on a library card.
 *
 * Only the marks that change a decision. Most of a 413-recipe library is unrated or unremarkable,
 * and a mark on every card is the same mistake as the chef-hat placeholder that was removed from
 * these cards — decoration that costs space and tells the reader nothing. The rare mark is the
 * one that gets noticed, and "we didn't like this" is the one that actually prevents a bad plan.
 */
export function cardVerdict(
  reviews: readonly Review[] | undefined,
): 'loved' | 'disliked' | 'mixed' | null {
  const verdict = householdVerdict(reviews)
  return verdict === 'ok' ? null : verdict
}

import { Heart, Meh, ThumbsDown, CircleSlash } from 'lucide-react'
import type { CookOutcome, Verdict } from './week-review'
import type { HouseholdVerdict } from './household-verdict'

/**
 * One vocabulary for "how was it?", shared by every surface that asks or shows it.
 *
 * The week review used to ask in four taps and the recipe page in five stars, and both wrote to
 * the same field — so the answers could not be compared, let alone averaged. The words and the
 * icons live here so the two can never drift apart again.
 */
export const VERDICT_META: Record<
  CookOutcome,
  { label: string; short: string; Icon: typeof Heart; tone: string }
> = {
  // "Didn't make it" is only offered by the week review — it is what marks a meal as dealt with
  // so the prompt stops asking, and it records no cook and no opinion.
  skipped: {
    label: "Didn't make it",
    short: 'Not made',
    Icon: CircleSlash,
    tone: 'text-muted-foreground',
  },
  disliked: {
    label: "Didn't like it",
    short: 'Disliked',
    Icon: ThumbsDown,
    tone: 'text-destructive',
  },
  ok: { label: 'It was okay', short: 'Okay', Icon: Meh, tone: 'text-muted-foreground' },
  loved: { label: 'Loved it', short: 'Loved', Icon: Heart, tone: 'text-primary' },
}

/** The three a cook can give something they actually made, in the order they are offered. */
export const VERDICT_ORDER: Verdict[] = ['disliked', 'ok', 'loved']

/** The words for a household verdict. `mixed` has no entry in the per-verdict table above. */
export const verdictSummaryText = (verdict: HouseholdVerdict): string =>
  verdict === 'mixed' ? 'Mixed' : VERDICT_META[verdict].short

import React from 'react'
import type { CookOutcome } from '../../lib/week-review'
import type { HouseholdVerdict } from '../../lib/household-verdict'
import { VERDICT_META } from '../../lib/verdict-display'

/** Every icon carries its words, so nothing here depends on recognising a glyph. */
export const VerdictIcon: React.FC<{ verdict: CookOutcome; className?: string }> = ({
  verdict,
  className = 'h-4 w-4',
}) => {
  const { label, Icon, tone } = VERDICT_META[verdict]
  return (
    <>
      <Icon
        aria-hidden="true"
        className={`${className} ${tone} ${verdict === 'loved' ? 'fill-current' : ''}`}
      />
      <span className="sr-only">{label}</span>
    </>
  )
}

/**
 * A household verdict as icons — including `mixed`, which is the one that needs two.
 *
 * Disagreement is shown rather than resolved: "one of us loves it, one of us doesn't" is a real
 * state, and the thing most worth knowing before putting a dish on the plan.
 */
export const VerdictMark: React.FC<{ verdict: HouseholdVerdict; className?: string }> = ({
  verdict,
  className = 'h-4 w-4',
}) => {
  if (verdict !== 'mixed') return <VerdictIcon verdict={verdict} className={className} />
  return (
    <span className="flex items-center gap-0.5">
      <VerdictIcon verdict="loved" className={className} />
      <VerdictIcon verdict="disliked" className={className} />
      <span className="sr-only">Loved by some, not by others</span>
    </span>
  )
}

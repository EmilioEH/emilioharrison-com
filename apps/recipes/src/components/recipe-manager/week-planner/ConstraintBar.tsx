import React from 'react'
import { X } from 'lucide-react'
import { TIME_OPTIONS } from '../../../lib/recipe-facets'
import type { Constraints, FacetKey } from '../../../lib/services/suggest-turns'

interface ConstraintBarProps {
  constraints: Constraints
  onRemove: (label: string, next: Constraints) => void
}

const FACET_KEYS: FacetKey[] = ['proteins', 'dishTypes', 'cuisines', 'difficulties']

const timeLabel = (maxMinutes: number) =>
  TIME_OPTIONS.find((t) => t.maxMinutes === maxMinutes)?.label ?? `under ${maxMinutes} min`

/**
 * Everything the app currently believes about what the cook wants, as chips they can take back.
 *
 * This is what keeps the conversation from being a black box. A tap sets a constraint visibly; a
 * typed sentence sets one through a patch, and would otherwise change the results with nothing on
 * screen to explain why. Both land here, and both come off the same way.
 */
export const ConstraintBar: React.FC<ConstraintBarProps> = ({ constraints, onRemove }) => {
  const chips: Array<{ label: string; remove: () => Constraints }> = []

  for (const key of FACET_KEYS) {
    for (const value of constraints.facets[key] ?? []) {
      chips.push({
        label: value,
        remove: () => ({
          ...constraints,
          facets: {
            ...constraints.facets,
            [key]: (constraints.facets[key] ?? []).filter((v) => v !== value),
          },
        }),
      })
    }
  }

  if (constraints.facets.maxMinutes) {
    chips.push({
      label: timeLabel(constraints.facets.maxMinutes),
      remove: () => ({ ...constraints, facets: { ...constraints.facets, maxMinutes: null } }),
    })
  }

  // What the cook says they have is a constraint like any other, and comes off the same way —
  // otherwise a filtered menu has an invisible cause.
  for (const item of constraints.pantry) {
    chips.push({
      label: `have ${item}`,
      remove: () => ({ ...constraints, pantry: constraints.pantry.filter((p) => p !== item) }),
    })
  }

  for (const mood of constraints.mood) {
    chips.push({
      label: mood,
      remove: () => ({ ...constraints, mood: constraints.mood.filter((m) => m !== mood) }),
    })
  }

  if (!chips.length) return null

  return (
    <div
      className="flex flex-wrap gap-2 px-4 py-2"
      role="group"
      aria-label="What you've asked for"
      data-testid="constraint-bar"
    >
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          onClick={() => onRemove(chip.label, chip.remove())}
          aria-label={`Remove ${chip.label}`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
        >
          {chip.label}
          <X className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  )
}

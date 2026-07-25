import React from 'react'
import { cn } from '../../lib/utils'
import type { Ingredient } from '../../lib/types'

interface IngredientRowProps {
  ingredient: Ingredient
  isChecked?: boolean
  onToggle?: () => void
}

/**
 * Splits a raw amount string into a numeric quantity and a unit.
 * e.g. "2 tbsp" → { qty: "2", unit: "tbsp" }
 *      "1/4 cup" → { qty: "1/4", unit: "cup" }
 *      "to taste" → { qty: "—", unit: "to taste" }
 */
function parseAmount(raw: string): { qty: string; unit: string } {
  if (!raw) return { qty: '—', unit: '' }

  // Match a leading quantity, longest form first so the alternatives don't truncate each other:
  // mixed number ("1 1/2"), fraction ("1/2"), decimal ("2.5"), then plain integer ("2").
  //
  // Decimals were previously unmatched — only `\d+` led the pattern — so "2.5 tsp" split into
  // qty "2" and unit ".5 tsp", rendering as "2  .5 tsp  Ras el hanout" with the stray fragment
  // sitting in the unit column.
  const m = raw.match(/^(\d+\s+\d+\s*\/\s*\d+|\d+\s*\/\s*\d+|\d+\.\d+|\d+)\s*(.*)$/)
  if (m && m[1].trim()) {
    return { qty: m[1].trim(), unit: m[2].trim() }
  }

  // Non-numeric amounts ("to taste", "as needed", etc.)
  return { qty: '—', unit: raw.trim() }
}

export const IngredientRow: React.FC<IngredientRowProps> = ({
  ingredient,
  isChecked = false,
  onToggle,
}) => {
  // If no toggle handler, render as plain text (e.g., in IngredientDrawer)
  if (!onToggle) {
    return (
      <div className="border-b border-border/50 py-2 font-body text-base text-foreground last:border-0">
        {ingredient.amount} <span className="font-normal">{ingredient.name}</span>
        {ingredient.prep && <span className="text-muted-foreground">, {ingredient.prep}</span>}
      </div>
    )
  }

  const { qty, unit } = parseAmount(ingredient.amount)

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isChecked}
      className={cn(
        'grid w-full grid-cols-[2.5rem_7rem_minmax(0,1fr)] items-start gap-x-3 border-b border-border/50 py-3 text-left font-body text-base text-foreground transition-colors last:border-0 active:bg-accent/60',
        isChecked && 'opacity-50',
      )}
      style={{ touchAction: 'manipulation' }}
      data-testid="ingredient-row"
    >
      {/* No separate checkbox: the row has always been the tap target, but it drew a circle
        * beside the text that read as a radio button — implying pick-one rather than check-off.
        * Completion reads from the dimmed, struck-through row instead, matching how instruction
        * steps now behave. */}

      {/* Col 1: Quantity */}
      <span
        data-testid="ingredient-amount"
        className={cn(
          'text-right text-sm font-normal tabular-nums text-muted-foreground',
          isChecked && 'line-through',
        )}
      >
        {qty}
      </span>

      {/* Col 2: Unit / Measurement */}
      <span
        data-testid="ingredient-unit"
        className={cn('text-sm font-normal text-muted-foreground', isChecked && 'line-through')}
      >
        {unit}
      </span>

      {/* Col 3: Ingredient name + prep */}
      <span data-testid="ingredient-name" className={cn('min-w-0', isChecked && 'line-through')}>
        <span className="font-normal text-foreground">{ingredient.name}</span>
        {ingredient.prep && <span className="text-muted-foreground">, {ingredient.prep}</span>}
      </span>
    </button>
  )
}

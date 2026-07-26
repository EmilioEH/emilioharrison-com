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
  if (!raw) return { qty: '', unit: '' }

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

  // Non-numeric amounts ("as needed", "from 1 large lemon"). No fake quantity — an em-dash in
  // the number column is noise in exactly the place the eye lands first.
  return { qty: '', unit: raw.trim() }
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
        // Two columns, not three. A fixed, right-aligned measure column keeps the ingredient
        // names on one hard left edge so the list can be scanned down in a single pass; ragged
        // amounts like "3 small or 2 large" used to push every name to a different indent.
        'grid w-full grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-x-3 border-b border-border/50 py-3 text-left font-body text-base transition-colors last:border-0 active:bg-accent/60',
        isChecked && 'opacity-50',
      )}
      style={{ touchAction: 'manipulation' }}
      data-testid="ingredient-row"
    >
      {/* Measure — quantity and unit together, so they never disagree about column widths. */}
      <span
        className={cn(
          'text-right text-sm leading-6 text-muted-foreground',
          isChecked && 'line-through',
        )}
      >
        <span data-testid="ingredient-amount" className="font-semibold tabular-nums text-foreground/70">
          {qty}
        </span>
        {qty && unit ? ' ' : ''}
        <span data-testid="ingredient-unit">{unit}</span>
      </span>

      {/* The ingredient itself carries the weight; prep is secondary and must not compete with
        * it while scanning a shopping list. */}
      <span className={cn('min-w-0 leading-6', isChecked && 'line-through')}>
        <span data-testid="ingredient-name" className="font-semibold text-foreground">
          {ingredient.name}
        </span>
        {ingredient.prep && (
          <span className="text-sm text-muted-foreground">{`, ${ingredient.prep}`}</span>
        )}
      </span>
    </button>
  )
}

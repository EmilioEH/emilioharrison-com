import React from 'react'
import { Check } from 'lucide-react'
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

  // Match a leading number/fraction (e.g. "2", "1/2", "1 1/2")
  const m = raw.match(/^(\d+(?:\s*\/\s*\d+)?(?:\s+\d+\s*\/\s*\d+)?)\s*(.*)$/)
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
      className={cn(
        'grid w-full grid-cols-[1.25rem_2.5rem_7rem_minmax(0,1fr)] items-start gap-x-2 border-b border-border/50 py-2.5 text-left font-body text-base text-foreground transition-opacity last:border-0',
        isChecked && 'opacity-50',
      )}
      data-testid="ingredient-row"
    >
      {/* Col 1: Checkbox */}
      <div
        className={cn(
          'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors',
          isChecked
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-muted-foreground/40',
        )}
      >
        {isChecked && <Check className="h-3 w-3" />}
      </div>

      {/* Col 2: Quantity */}
      <span
        data-testid="ingredient-amount"
        className={cn(
          'text-right text-sm font-normal tabular-nums text-muted-foreground',
          isChecked && 'line-through',
        )}
      >
        {qty}
      </span>

      {/* Col 3: Unit / Measurement */}
      <span
        data-testid="ingredient-unit"
        className={cn('text-sm font-normal text-muted-foreground', isChecked && 'line-through')}
      >
        {unit}
      </span>

      {/* Col 4: Ingredient name + prep */}
      <span data-testid="ingredient-name" className={cn('min-w-0', isChecked && 'line-through')}>
        <span className="font-normal text-foreground">{ingredient.name}</span>
        {ingredient.prep && <span className="text-muted-foreground">, {ingredient.prep}</span>}
      </span>
    </button>
  )
}

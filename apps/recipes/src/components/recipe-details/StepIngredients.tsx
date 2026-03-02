import React from 'react'
import { Badge } from '../ui/badge'
import type { Ingredient } from '../../lib/types'

interface StepIngredientsProps {
  ingredients: Ingredient[]
  indices: number[]
}

/**
 * Compact row of ingredient pills shown inline with each instruction step.
 * Resolves stepIngredients indices to display ingredient amounts and names.
 */
export const StepIngredients: React.FC<StepIngredientsProps> = ({ ingredients, indices }) => {
  if (indices.length === 0) return null

  const resolved = indices.map((idx) => ingredients[idx]).filter(Boolean)

  if (resolved.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 pb-1">
      {resolved.map((ing, i) => (
        <Badge key={indices[i]} variant="tag" size="sm" className="rounded-full font-normal">
          <span className="text-muted-foreground/70">{ing.amount}</span>
          <span className="ml-1">{ing.name}</span>
        </Badge>
      ))}
    </div>
  )
}

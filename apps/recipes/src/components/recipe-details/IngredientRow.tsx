import React from 'react'
import type { Ingredient } from '../../lib/types'

interface IngredientRowProps {
  ingredient: Ingredient
}

export const IngredientRow: React.FC<IngredientRowProps> = ({ ingredient }) => {
  return (
    <div className="flex items-baseline gap-4 py-2 text-base text-foreground">
      {/* Left Column: Amount */}
      <div className="w-16 flex-shrink-0 text-right font-medium tabular-nums text-foreground">
        {ingredient.amount}
      </div>

      {/* Right Column: Name + Prep */}
      <div className="flex-1">
        <span className="font-body text-foreground">{ingredient.name}</span>
        {ingredient.prep && <span className="text-muted-foreground">, {ingredient.prep}</span>}
      </div>
    </div>
  )
}

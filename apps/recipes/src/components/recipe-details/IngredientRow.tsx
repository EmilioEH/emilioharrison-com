import React from 'react'
import type { Ingredient } from '../../lib/types'

interface IngredientRowProps {
  ingredient: Ingredient
}

export const IngredientRow: React.FC<IngredientRowProps> = ({ ingredient }) => {
  return (
    <div className="flex items-baseline gap-4 py-3 text-base">
      {/* Left Column: Amount - wider for longer amounts like "1/2 cup" */}
      <div className="w-20 flex-shrink-0 text-right text-muted-foreground">{ingredient.amount}</div>

      {/* Right Column: Name (bold) + Prep (grey italic) */}
      <div className="flex-1">
        <span className="font-semibold text-foreground">{ingredient.name}</span>
        {ingredient.prep && (
          <span className="italic text-muted-foreground">, {ingredient.prep}</span>
        )}
      </div>
    </div>
  )
}

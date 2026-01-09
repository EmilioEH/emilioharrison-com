import React from 'react'
import type { Ingredient } from '../../lib/types'

interface IngredientRowProps {
  ingredient: Ingredient
}

export const IngredientRow: React.FC<IngredientRowProps> = ({ ingredient }) => {
  return (
    <div className="border-b border-border/50 py-2 font-body text-base text-foreground last:border-0">
      {ingredient.amount} <span className="font-medium">{ingredient.name}</span>
      {ingredient.prep && <span className="text-muted-foreground">, {ingredient.prep}</span>}
    </div>
  )
}

import React from 'react'
import { Play } from 'lucide-react'
import { CheckableItem } from './CheckableItem'
import type { Recipe } from '../../lib/types'

interface MiseEnPlaceProps {
  recipe: Recipe
  checkedIngredients: Record<number, boolean>
  setCheckedIngredients: React.Dispatch<React.SetStateAction<Record<number, boolean>>>
  startCooking: () => void
}

export const MiseEnPlace: React.FC<MiseEnPlaceProps> = ({
  recipe,
  checkedIngredients,
  setCheckedIngredients,
  startCooking,
}) => {
  return (
    <div className="flex-1 space-y-8 overflow-y-auto p-6 animate-in fade-in slide-in-from-bottom-4">
      <header className="text-center">
        <h2 className="font-display text-2xl font-bold text-foreground">Mise en Place</h2>
        <p className="text-foreground-variant font-body">Gather your ingredients</p>
      </header>

      <div className="bg-card-variant/10 rounded-xl border border-border p-4">
        <h3 className="mb-4 font-display text-xs font-bold uppercase tracking-widest text-primary">
          Ingredients ({recipe.ingredients.length})
        </h3>
        <div className="space-y-1">
          {recipe.ingredients.map((ing, idx) => {
            const prep = ing.prep ? `, ${ing.prep}` : ''
            const text = `${ing.amount} ${ing.name}${prep}`
            return (
              <CheckableItem
                key={idx}
                text={text}
                isChecked={!!checkedIngredients[idx]}
                onToggle={() => setCheckedIngredients((p) => ({ ...p, [idx]: !p[idx] }))}
                largeText={true}
              />
            )
          })}
        </div>
      </div>

      <button
        onClick={startCooking}
        className="flex w-full items-center justify-center gap-3 rounded-full bg-primary py-4 font-display text-xl font-bold text-primary-foreground shadow-md"
      >
        <Play className="h-6 w-6 fill-current" />
        Start Cooking
      </button>
    </div>
  )
}

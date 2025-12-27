import React from 'react'
import { Play } from 'lucide-react'
import { CheckableItem } from './CheckableItem'

export const MiseEnPlace = ({
  recipe,
  checkedIngredients,
  setCheckedIngredients,
  startCooking,
}) => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 flex-1 space-y-8 overflow-y-auto p-6">
      <header className="text-center">
        <h2 className="font-display text-2xl font-bold text-md-sys-color-on-surface">
          Mise en Place
        </h2>
        <p className="font-body text-md-sys-color-on-surface-variant">Gather your ingredients</p>
      </header>

      <div className="bg-md-sys-color-surface-variant/10 rounded-md-xl border border-md-sys-color-outline p-4">
        <h3 className="mb-4 font-display text-xs font-bold uppercase tracking-widest text-md-sys-color-primary">
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
                isChecked={checkedIngredients[idx]}
                onToggle={() => setCheckedIngredients((p) => ({ ...p, [idx]: !p[idx] }))}
                largeText={true}
              />
            )
          })}
        </div>
      </div>

      <button
        onClick={startCooking}
        className="flex w-full items-center justify-center gap-3 rounded-full bg-md-sys-color-primary py-4 font-display text-xl font-bold text-md-sys-color-on-primary shadow-md-2"
      >
        <Play className="h-6 w-6 fill-current" />
        Start Cooking
      </button>
    </div>
  )
}

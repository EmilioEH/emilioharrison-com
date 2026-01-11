import React from 'react'
import { Check } from 'lucide-react'
import { useStore } from '@nanostores/react'
import { $cookingSession, cookingSessionActions } from '../../stores/cookingSession'
import { Stack } from '../ui/layout'
import { Button } from '../ui/button'
import { CheckableItem } from '../recipe-details/CheckableItem'
import type { Recipe, IngredientGroup, Ingredient } from '../../lib/types'

interface PrepStepProps {
  recipe: Recipe
  onNext: () => void
}

export const PrepStep: React.FC<PrepStepProps> = ({ recipe, onNext }) => {
  const session = useStore($cookingSession)
  // Prep step assumes data available or falls back
  // Reuse mapping logic from IngredientsPanel if possible, or duplicate for now
  // For simplicity, we'll map flat ingredients and use groups if available.

  const displayGroups = React.useMemo(() => {
    // If we had enhanced data in store, use it. For now, fallback to flat or use what's on recipe.
    // The recipe object might have populated ingredientGroups if loaded.
    const groups = recipe.ingredientGroups
    if (groups?.length) {
      return groups.map((g: IngredientGroup) => ({
        header: g.header,
        items: recipe.ingredients.slice(g.startIndex, g.endIndex + 1),
        startIndex: g.startIndex,
      }))
    }
    return [{ header: null, items: recipe.ingredients, startIndex: 0 }]
  }, [recipe])

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-background px-6 py-8 pb-14">
      <div className="mx-auto w-full max-w-2xl">
        <Stack spacing="lg">
          <div>
            <h2 className="mb-2 font-display text-3xl font-bold text-foreground">
              Prep Ingredients
            </h2>
            <p className="text-muted-foreground">Get everything ready before you start cooking.</p>
          </div>

          <Stack spacing="xl">
            {displayGroups.map(
              (
                group: { header: string | null; items: Ingredient[]; startIndex: number },
                gIdx: number,
              ) => (
                <div key={gIdx}>
                  {group.header && (
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      {group.header}
                    </h3>
                  )}
                  <div className="rounded-xl border border-border bg-card p-4">
                    {group.items.map((ing: Ingredient, idx: number) => {
                      const globalIdx = group.startIndex + idx
                      const isChecked = session.checkedIngredients.includes(globalIdx)
                      return (
                        <CheckableItem
                          key={idx}
                          text={`${ing.amount} ${ing.name}${ing.prep ? `, ${ing.prep}` : ''}`}
                          isChecked={isChecked}
                          onToggle={() => cookingSessionActions.toggleIngredient(globalIdx)}
                          size="lg"
                          className="border-b border-border/50 last:border-0"
                        />
                      )
                    })}
                  </div>
                </div>
              ),
            )}
          </Stack>

          <Button size="lg" onClick={onNext} className="mt-8 w-full md:w-auto md:self-end">
            Start Cooking <Check className="ml-2 h-5 w-5" />
          </Button>
        </Stack>
      </div>
    </div>
  )
}

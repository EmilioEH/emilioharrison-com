import React from 'react'
import { ChefHat } from 'lucide-react'
import { useStore } from '@nanostores/react'
import { $cookingSession, cookingSessionActions } from '../../stores/cookingSession'
import { CheckableItem } from '../recipe-details/CheckableItem'
import { Stack } from '../ui/layout'
import { Card } from '../ui/card'

export const IngredientsPanel: React.FC = () => {
  const session = useStore($cookingSession)
  const recipe = session.recipe

  if (!recipe) return null

  const checkedCount = session.checkedIngredients.length
  const totalCount = recipe.ingredients.length
  const progress = Math.round((checkedCount / totalCount) * 100)

  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-none border-l border-border bg-card shadow-none">
      {/* Header */}
      <div className="border-b border-border/50 bg-muted/20 p-4">
        <Stack spacing="xs">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ChefHat className="h-5 w-5" />
            </div>
            <h2 className="font-display text-lg font-bold">Ingredients</h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <div className="h-1.5 flex-1 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span>
              {checkedCount} / {totalCount}
            </span>
          </div>
        </Stack>
      </div>

      {/* Scrollable List */}
      <div className="custom-scrollbar flex-1 overflow-y-auto p-4">
        <Stack spacing="sm">
          {recipe.ingredients.map((ing, idx) => {
            const prep = ing.prep ? `, ${ing.prep}` : ''
            const text = `${ing.amount} ${ing.name}${prep}`
            const isChecked = session.checkedIngredients.includes(idx)

            return (
              <CheckableItem
                key={idx}
                text={text}
                isChecked={isChecked}
                onToggle={() => cookingSessionActions.toggleIngredient(idx)}
                className={isChecked ? 'opacity-50' : ''}
              />
            )
          })}
        </Stack>
      </div>
    </Card>
  )
}

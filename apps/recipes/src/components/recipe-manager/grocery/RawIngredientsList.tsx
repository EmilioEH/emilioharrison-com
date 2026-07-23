import React from 'react'
import { motion } from 'framer-motion'
import { ChefHat } from 'lucide-react'
import { Stack } from '../../ui/layout'
import type { Recipe } from '../../../lib/types'

interface RawIngredientsListProps {
  recipes: Recipe[]
  onOpenRecipe?: (recipe: Recipe) => void
}

/**
 * The "Raw" grocery view: every ingredient exactly as written on each selected recipe, grouped by
 * recipe, with no combining or unit conversion. Deliberately dumb and read-only — its entire job
 * is to render instantly from data already in memory, with nothing that can fail the way an AI
 * call can, so it's always there underneath the "Smart" (AI-combined) view. See
 * GROCERY-LIST-V2-PLAN.md for why this exists as a foundation rather than a fallback bolted on.
 */
export const RawIngredientsList: React.FC<RawIngredientsListProps> = ({
  recipes,
  onOpenRecipe,
}) => {
  if (recipes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
        <ChefHat className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">
          Add recipes to this week to see their ingredients here.
        </p>
      </div>
    )
  }

  return (
    <Stack spacing="md" className="px-4 py-4">
      {recipes.map((recipe, index) => {
        const lines = recipeIngredientLines(recipe)

        return (
          <motion.div
            key={recipe.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.35, delay: index * 0.03 }}
            className="rounded-xl border border-border bg-card p-3 shadow-sm"
          >
            <button
              type="button"
              onClick={() => onOpenRecipe?.(recipe)}
              disabled={!onOpenRecipe}
              className="w-full text-left disabled:cursor-default"
            >
              <h4 className="line-clamp-1 font-display text-sm font-bold leading-tight text-foreground">
                {recipe.title}
              </h4>
            </button>
            {lines.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {lines.map((line, lineIndex) => (
                  <li key={lineIndex} className="text-sm text-muted-foreground">
                    • {line}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground/70">No ingredients listed.</p>
            )}
          </motion.div>
        )
      })}
    </Stack>
  )
}

/** Prefers `structuredIngredients[].original` (the as-imported text) since that's the most
 * faithful "exactly as written" source; falls back to the basic `ingredients` field. */
function recipeIngredientLines(recipe: Recipe): string[] {
  if (Array.isArray(recipe.structuredIngredients) && recipe.structuredIngredients.length > 0) {
    return recipe.structuredIngredients.map((i) => i.original || `${i.amount} ${i.unit} ${i.name}`)
  }
  return (recipe.ingredients || []).map((i) => (i.amount ? `${i.amount} ${i.name}` : i.name))
}

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ChefHat } from 'lucide-react'
import { CATEGORY_ORDER } from '../../../lib/grocery-utils'
import { normalizeCategory } from '../../../lib/grocery-logic'
import type { Recipe } from '../../../lib/types'

interface RawIngredientsListProps {
  recipes: Recipe[]
  onOpenRecipe?: (recipe: Recipe) => void
}

interface RawLine {
  text: string
  sortKey: string
  category: string
  recipeId: string
  recipeTitle: string
}

interface RawCategorySection {
  name: string
  lines: RawLine[]
}

/**
 * The "Raw" grocery view: every ingredient exactly as written on each selected recipe, grouped by
 * grocery category (same CATEGORY_ORDER/normalizeCategory convention as the Smart list, so both
 * views read as one system) — but with no combining or unit conversion across recipes. Uses each
 * recipe's already-stored `structuredIngredients[].category` when available (pre-computed at
 * import/enhancement time, not a live AI call) so this stays instant and AI-free at render time.
 * Recipes without structured data fall into "Other" rather than blocking the view.
 *
 * Deliberately read-only — its whole job is to render instantly from data already in memory, with
 * nothing that can fail the way an AI call can, so it's always there underneath the "Smart"
 * (AI-combined) view. See GROCERY-LIST-V2-PLAN.md for why this exists as a foundation rather than
 * a fallback bolted on.
 */
export const RawIngredientsList: React.FC<RawIngredientsListProps> = ({
  recipes,
  onOpenRecipe,
}) => {
  const sections = useMemo(() => buildCategorySections(recipes), [recipes])

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
    <div className="flex flex-col gap-6 px-4 py-4">
      {sections.map((section, index) => (
        <motion.div
          key={section.name}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.35, delay: index * 0.03 }}
        >
          <h3 className="mb-3 px-2 text-sm font-bold uppercase tracking-wider text-primary">
            {section.name}
          </h3>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            {section.lines.map((line, lineIndex) => {
              const recipe = recipes.find((r) => r.id === line.recipeId)
              return (
                <div
                  key={`${line.recipeId}-${lineIndex}`}
                  className="border-b border-border p-3 last:border-0"
                >
                  <p className="text-sm text-foreground">{line.text}</p>
                  <button
                    type="button"
                    onClick={() => recipe && onOpenRecipe?.(recipe)}
                    disabled={!onOpenRecipe}
                    className="mt-0.5 text-xs text-muted-foreground hover:text-foreground disabled:cursor-default"
                  >
                    {line.recipeTitle}
                  </button>
                </div>
              )
            })}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function buildCategorySections(recipes: Recipe[]): RawCategorySection[] {
  const byCategory = new Map<string, RawLine[]>()
  CATEGORY_ORDER.forEach((cat) => byCategory.set(cat, []))

  for (const recipe of recipes) {
    for (const line of recipeLines(recipe)) {
      const list = byCategory.get(line.category) ?? []
      list.push(line)
      byCategory.set(line.category, list)
    }
  }

  const sections: RawCategorySection[] = []
  for (const name of CATEGORY_ORDER) {
    const lines = byCategory.get(name)
    if (lines && lines.length > 0) {
      sections.push({ name, lines: [...lines].sort((a, b) => a.sortKey.localeCompare(b.sortKey)) })
    }
  }
  return sections
}

/** Prefers `structuredIngredients` (has a real category + `.original` as-imported text); falls
 * back to the basic `ingredients` field, bucketed into "Other" since it carries no category. */
function recipeLines(recipe: Recipe): RawLine[] {
  if (Array.isArray(recipe.structuredIngredients) && recipe.structuredIngredients.length > 0) {
    return recipe.structuredIngredients.map((i) => ({
      text: i.original || `${i.amount} ${i.unit} ${i.name}`,
      sortKey: i.name.toLowerCase(),
      category: normalizeCategory(i.category),
      recipeId: recipe.id,
      recipeTitle: recipe.title,
    }))
  }
  return (recipe.ingredients || []).map((i) => ({
    text: i.amount ? `${i.amount} ${i.name}` : i.name,
    sortKey: i.name.toLowerCase(),
    category: normalizeCategory(undefined),
    recipeId: recipe.id,
    recipeTitle: recipe.title,
  }))
}

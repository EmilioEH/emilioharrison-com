import React from 'react'
import { format, parseISO, addDays } from 'date-fns'
import { X, Plus, Clock, User } from 'lucide-react'
import { motion } from 'framer-motion'

import { DAYS_OF_WEEK, removeRecipeFromDay, type PlannedRecipe } from '../../../lib/weekStore'
import type { Recipe } from '../../../lib/types'

interface WeekPlanViewProps {
  activeWeekStart: string
  currentRecipes: PlannedRecipe[]
  allRecipes: Recipe[]
  onSelectRecipe: (recipe: Recipe) => void
  onAddRecipe?: (day: string) => void
  onShare?: (recipe: Recipe) => void
}

/**
 * Get recipe image URL (first from images array, fallback to sourceImage)
 */
const getRecipeImage = (recipe: Recipe): string | null => {
  if (recipe.images && recipe.images.length > 0) {
    return recipe.images[0]
  }
  return recipe.sourceImage || null
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      bounce: 0,
      duration: 0.3,
    },
  },
}

export const WeekPlanView: React.FC<WeekPlanViewProps> = ({
  activeWeekStart,
  currentRecipes,
  allRecipes,
  onSelectRecipe,
  onAddRecipe,
  onShare: _onShare,
}) => {
  const activeDate = parseISO(activeWeekStart)

  // Build day data with recipe info
  const dayData = DAYS_OF_WEEK.map((day, index) => {
    const date = addDays(activeDate, index)
    const plannedRecipe = currentRecipes.find((r) => r.day === day)
    const recipe = plannedRecipe ? allRecipes.find((r) => r.id === plannedRecipe.recipeId) : null

    return {
      day,
      dayName: format(date, 'EEEE'),
      dayAbbrev: format(date, 'EEE'),
      date,
      dateNum: format(date, 'd'),
      monthAbbrev: format(date, 'MMM'),
      isPlanned: !!plannedRecipe,
      recipe,
      recipeId: plannedRecipe?.recipeId,
      addedByName: plannedRecipe?.addedByName,
    }
  })

  // Handle remove recipe
  const handleRemoveRecipe = async (recipeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await removeRecipeFromDay(recipeId)
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-3 p-4 pb-24"
    >
      {dayData.map((d) => (
        <motion.div key={d.day} variants={itemVariants}>
          {d.isPlanned && d.recipe ? (
            // Planned Day Card
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              {/* Day Header */}
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{d.dayName}</span>
                  <span className="text-xs text-muted-foreground">
                    {d.monthAbbrev} {d.dateNum}
                  </span>
                </div>
              </div>

              {/* Recipe Card */}
              <button
                onClick={() => onSelectRecipe(d.recipe!)}
                className="flex w-full items-center gap-4 p-3 text-left transition-colors hover:bg-accent/50"
              >
                {/* Recipe Thumbnail */}
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {getRecipeImage(d.recipe) ? (
                    <img
                      src={getRecipeImage(d.recipe)!}
                      alt={d.recipe.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl">
                      🍽️
                    </div>
                  )}
                </div>

                {/* Recipe Info */}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-medium text-foreground">
                    {d.recipe.title}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {(d.recipe.prepTime || d.recipe.cookTime) && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {(d.recipe.prepTime || 0) + (d.recipe.cookTime || 0)} min
                      </span>
                    )}
                    {d.addedByName && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {d.addedByName.split(' ')[0]}
                      </span>
                    )}
                    {d.recipe.protein && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                        {d.recipe.protein}
                      </span>
                    )}
                  </div>
                </div>

                {/* Remove Button */}
                <button
                  onClick={(e) => d.recipeId && handleRemoveRecipe(d.recipeId, e)}
                  className="shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Remove ${d.recipe.title} from ${d.day}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </button>
            </div>
          ) : (
            // Empty Day Card
            <div className="overflow-hidden rounded-xl border border-dashed border-border bg-card/50">
              {/* Day Header */}
              <div className="flex items-center justify-between border-b border-dashed border-border bg-muted/20 px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-muted-foreground">{d.dayName}</span>
                  <span className="text-xs text-muted-foreground/70">
                    {d.monthAbbrev} {d.dateNum}
                  </span>
                </div>
              </div>

              {/* Empty State */}
              <button
                onClick={() => onAddRecipe?.(d.day)}
                className="flex w-full items-center justify-center gap-2 p-6 text-muted-foreground transition-colors hover:bg-accent/30 hover:text-foreground"
              >
                <Plus className="h-5 w-5" />
                <span className="text-sm font-medium">Add a recipe</span>
              </button>
            </div>
          )}
        </motion.div>
      ))}
    </motion.div>
  )
}

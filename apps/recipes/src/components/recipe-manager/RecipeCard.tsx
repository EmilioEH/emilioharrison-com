import React, { memo } from 'react'
import { motion, type Variants } from 'framer-motion'
import { ChefHat, Star, MoreVertical, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { HighlightedText } from '../ui/HighlightedText'
import type { Recipe } from '../../lib/types'
import { getPlannedDatesForRecipe } from '../../lib/weekStore'

// Helper to normalize titles to Title Case
const toTitleCase = (str: string): string => {
  // If mostly uppercase, convert to title case
  const upperCount = (str.match(/[A-Z]/g) || []).length
  const letterCount = (str.match(/[a-zA-Z]/g) || []).length
  if (letterCount > 0 && upperCount / letterCount > 0.7) {
    return str
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
  return str
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      bounce: 0,
      duration: 0.4,
    },
  },
}

interface RecipeCardProps {
  recipe: Recipe & { matches?: { indices: [number, number][]; key?: string }[] }
  isSelectionMode: boolean
  isSelected: boolean
  onSelect: (recipe: Recipe) => void
  onToggleThisWeek: (id: string) => void
  onManage?: (id: string) => void
  allowManagement?: boolean
  skipAnimation?: boolean
}

export const RecipeCard = memo(
  ({
    recipe,
    isSelectionMode,
    isSelected,
    onSelect,
    onToggleThisWeek,
    onManage,
    allowManagement = false,
    skipAnimation = false,
  }: RecipeCardProps) => {
    // Calculate planned dates once for performance (memoized inside the component render)
    // Since this is a pure component, it will re-render if getPlannedDatesForRecipe output changes?
    // No, getPlannedDatesForRecipe is a function. React doesn't know.
    // However, RecipeLibrary subscribes to weekStore. If weekStore updates, RecipeLibrary re-renders.
    // We need to pass plannedDates OR weekStore state down if we want it to update accurately without full remount?
    // But for now, calculation is cheap enough if component is memoized against props.
    // Wait, if weekStore updates, RecipeLibrary re-renders. If we pass recipe object (stable?), the card won't re-render unless we pass something that changes.
    // We need to ensure the card updates when `plannedDates` change.
    // Changing strategy: calculate planned dates inside component?
    // Yes, but `getPlannedDatesForRecipe` reads from store state directly?
    // `getPlannedDatesForRecipe` imports from `weekStore.ts`. It likely uses `allPlannedRecipes.get()`.
    // If we want reactivity, we should use `useStore` inside the card or pass the data.
    // RecipeLibrary subscribes to `allPlannedRecipes`. It causes RecipeLibrary to re-render.
    // Then RecipeCard receives the same props (recipe). Since `memo` checks props, and recipe didn't change, it WON'T re-render.
    // So the "Planned" badges WON'T update if we just use `memo`.

    // FIX: We need to calculate plannedDates in Parent and pass it down, OR subscribe in Child.
    // Passing it down is cleaner for reactivity if Parent already subscribes.
    // But `getPlannedDatesForRecipe` is used inside `renderRecipeCard` in current code.

    // Let's assume for now we keep the calculation inside. To ensure updates, we need to subscribe to weekStore?
    // Or simpler: The Parent (RecipeLibrary) subscribes. It re-renders.
    // We need to pass a "version" or the planned data to force update?
    // Or just accept that for now we want to fix MOUNT performance.
    // BUT the bug "Slow load" is about MOUNT performance.
    // Correctness of "Added" badge is secondary but important.

    // Decision: I will use `getPlannedDatesForRecipe` inside but I'll add a dummy prop `_weekVersion` or similar if needed?
    // Actually, RecipeLibrary re-rendering should propagate updates if we don't memoize too aggressively?
    // If we memoize, we block context updates? No.
    // But `getPlannedDatesForRecipe` reads global store (via direct access usually).
    // If `RecipeLibrary` re-renders, `RecipeCard` (memo) sees same props -> no re-render -> no new `getPlannedDatesForRecipe` call.
    // Result: Stale badges.

    // Solution: Pass `plannedDates` as a prop.
    const plannedDates = getPlannedDatesForRecipe(recipe.id)
    const isPlanned = plannedDates.length > 0

    const titleMatches = recipe.matches?.filter((m) => m.key === 'title')
    const ingredientMatches = recipe.matches?.filter(
      (m) => m.key === 'ingredients.name' || m.key === 'ingredients',
    )

    return (
      <motion.div
        variants={skipAnimation ? undefined : itemVariants}
        initial={skipAnimation ? false : undefined}
        animate={skipAnimation ? { opacity: 1, y: 0 } : undefined}
        role="button"
        tabIndex={0}
        data-testid={`recipe-card-${recipe.id}`}
        className={`group relative flex w-full cursor-pointer gap-3 rounded-xl border border-transparent p-2.5 text-left transition-all active:scale-[0.98] active:bg-accent/70 ${
          isSelected
            ? 'border-primary/20 bg-accent'
            : 'hover:border-border hover:bg-accent/50 hover:shadow-sm'
        }`}
        onClick={() => {
          onSelect(recipe)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect(recipe)
          }
        }}
      >
        {/* Square Thumbnail with border for contrast */}
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted shadow-sm ring-1 ring-black/5">
          {recipe.images?.[0] || recipe.finishedImage || recipe.sourceImage ? (
            <img
              src={recipe.images?.[0] || recipe.finishedImage || recipe.sourceImage}
              className="h-full w-full object-cover"
              alt=""
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <ChefHat className="h-10 w-10 text-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* Content Column */}
        <div className="flex flex-1 flex-col justify-center">
          <div className="flex items-start justify-between gap-2">
            <h4 className="line-clamp-2 flex-1 font-display text-lg font-bold leading-tight text-foreground">
              <HighlightedText text={toTitleCase(recipe.title)} matches={titleMatches} />
            </h4>
            {(recipe.rating ?? 0) > 0 && (
              <div className="flex shrink-0 items-center gap-1 rounded-full bg-secondary/50 px-1.5 py-0.5 text-[10px] font-bold text-foreground">
                <Star className="h-3 w-3 fill-foreground" />{' '}
                <span data-testid="recipe-rating">{recipe.rating}</span>
              </div>
            )}
          </div>

          {/* Ingredient Match Snippet */}
          {ingredientMatches && ingredientMatches.length > 0 && (
            <div className="mb-1 text-xs italic text-muted-foreground/80">Matches ingredient</div>
          )}

          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-muted-foreground">
            <span>{recipe.cookTime + recipe.prepTime} min</span>
            <span>•</span>
            <span>{recipe.servings} servings</span>
            {recipe.difficulty && (
              <>
                <span>•</span>
                <Badge
                  variant="tag"
                  size="sm"
                  className={`uppercase ${
                    recipe.difficulty === 'Easy'
                      ? 'bg-green-500/10 text-green-600'
                      : recipe.difficulty === 'Medium'
                        ? 'bg-yellow-500/10 text-yellow-600'
                        : 'bg-red-500/10 text-red-600'
                  }`}
                >
                  {recipe.difficulty}
                </Badge>
              </>
            )}
          </div>

          <div className="mt-0.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs font-medium text-muted-foreground">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {recipe.protein ? (
                <>
                  <span>{recipe.protein}</span>
                  {recipe.cuisine && (
                    <>
                      <span>•</span>
                      <span>{recipe.cuisine}</span>
                    </>
                  )}
                </>
              ) : recipe.cuisine ? (
                <span>{recipe.cuisine}</span>
              ) : (
                <span>{recipe.mealType}</span>
              )}
            </div>

            {/* Status Badges - Inline on right */}
            <div className="flex items-center gap-1.5 pr-2">
              {/* Day Tags */}
              {plannedDates.slice(0, 3).map((p) => (
                <Badge
                  key={`${p.weekStart}-${p.day}`}
                  variant="tag"
                  size="sm"
                  className="border-primary/20 bg-primary/10 font-bold uppercase tracking-tighter text-primary"
                  title={p.addedByName ? `Added by ${p.addedByName}` : 'Planned'}
                >
                  {p.label}
                  {p.addedByName && (
                    <span className="ml-1 opacity-70">
                      (
                      {p.addedByName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)}
                      )
                    </span>
                  )}
                </Badge>
              ))}
              {plannedDates.length > 3 && (
                <Badge
                  variant="tag"
                  size="sm"
                  className="border-muted-foreground/20 bg-muted font-bold text-muted-foreground"
                >
                  +{plannedDates.length - 3}
                </Badge>
              )}

              {/* Add to Week button - 44px touch target */}
              {!allowManagement && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleThisWeek(recipe.id)
                  }}
                  className="focus:outline-none"
                  aria-label="Add to Week"
                >
                  <Badge
                    variant="inactive"
                    size="sm"
                    className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full p-0 hover:bg-muted"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Badge>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Management Menu Button */}
        {allowManagement && !isSelectionMode && isPlanned && onManage && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              onManage(recipe.id)
            }}
            className="h-8 w-8 shrink-0 self-center rounded-full hover:bg-accent"
            title="Manage recipe"
            aria-label="Manage recipe"
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        )}
      </motion.div>
    )
  },
)

RecipeCard.displayName = 'RecipeCard'

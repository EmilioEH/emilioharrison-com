import React, { useState, useRef } from 'react'
import { Plus, Clock, User, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'

import { removeRecipeFromWeek, type PlannedRecipe } from '../../../lib/weekStore'
import type { Recipe } from '../../../lib/types'

interface WeekPlanViewProps {
  currentRecipes: PlannedRecipe[]
  allRecipes: Recipe[]
  onSelectRecipe: (recipe: Recipe) => void
  onAddRecipe?: () => void
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

/**
 * Haptic feedback utility
 */
const triggerHaptic = (style: 'light' | 'medium' | 'success' = 'light') => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      success: [10, 50, 20],
    }
    navigator.vibrate(patterns[style])
  }
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

// Swipeable Recipe Card Component
interface SwipeableRecipeCardProps {
  recipe: Recipe
  recipeId: string
  addedByName?: string
  onSelectRecipe: (recipe: Recipe) => void
  onRemove: (recipeId: string) => void
}

const SwipeableRecipeCard: React.FC<SwipeableRecipeCardProps> = ({
  recipe,
  recipeId,
  addedByName,
  onSelectRecipe,
  onRemove,
}) => {
  const [swipeX, setSwipeX] = useState(0)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const touchCurrentX = useRef(0)
  const touchCurrentY = useRef(0)
  const hasMovedRef = useRef(false)

  const SWIPE_THRESHOLD = 80 // Distance to trigger action/menu
  const MENU_OPEN_POSITION = -88 // How far to swipe left to lock menu open

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    touchCurrentX.current = e.touches[0].clientX
    touchCurrentY.current = e.touches[0].clientY
    hasMovedRef.current = false
  }

  // Handle touch move
  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX
    touchCurrentY.current = e.touches[0].clientY

    const deltaX = touchCurrentX.current - touchStartX.current
    const deltaY = touchCurrentY.current - touchStartY.current

    // Check if moved significantly
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      hasMovedRef.current = true
    }

    // Only handle horizontal swipe if not scrolling vertically AND movement is significant
    // We increase threshold for "swiping" to 10px to assume intentionality
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      if (e.cancelable) e.preventDefault() // Prevent scroll while swiping

      // Limit swipe distance - left swipe only (reveals the remove action)
      const limitedSwipe = Math.max(-120, Math.min(0, deltaX))
      setSwipeX(limitedSwipe)
    }
  }

  // Handle touch end
  const handleTouchEnd = () => {
    // Check if swipe threshold met
    if (Math.abs(swipeX) > SWIPE_THRESHOLD) {
      if (swipeX < 0) {
        // Swiped left - Open menu (lock it open)
        triggerHaptic('light')
        setSwipeX(MENU_OPEN_POSITION)
        setIsMenuOpen(true)
      }
    } else {
      // Didn't reach threshold, snap back
      setSwipeX(0)
      setIsMenuOpen(false)
    }
  }

  // Handle touch cancel
  const handleTouchCancel = () => {
    setSwipeX(0)
    setIsMenuOpen(false)
  }

  // Handle menu actions
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    triggerHaptic('light')
    onRemove(recipeId)
    setSwipeX(0)
    setIsMenuOpen(false)
  }

  // Handle click (selection)
  const handleClick = () => {
    if (isMenuOpen) {
      setSwipeX(0)
      setIsMenuOpen(false)
    } else {
      onSelectRecipe(recipe)
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Swipeable Container */}
      <div className="relative overflow-hidden">
        {/* Background Action Buttons */}
        <div className="absolute inset-0 flex items-center justify-end">
          {/* Right side - Remove (revealed when swiping left) */}
          <motion.div
            initial={false}
            animate={{ opacity: swipeX < -20 ? 1 : 0 }}
            className="flex h-full items-center gap-2 bg-muted px-4"
          >
            <button
              onClick={handleDelete}
              className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive text-destructive-foreground transition-colors hover:bg-destructive/90"
              aria-label="Remove recipe from week"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </motion.div>
        </div>

        {/* Recipe Card (swipeable) */}
        <motion.div
          animate={{ x: swipeX }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="relative flex cursor-pointer touch-pan-y items-center gap-4 bg-card p-3"
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
        >
          {/* Recipe Thumbnail */}
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
            {getRecipeImage(recipe) ? (
              <img
                src={getRecipeImage(recipe)!}
                alt={recipe.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl">🍽️</div>
            )}
          </div>

          {/* Recipe Info */}
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-medium text-foreground">{recipe.title}</div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {(recipe.prepTime || recipe.cookTime) && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {(recipe.prepTime || 0) + (recipe.cookTime || 0)} min
                </span>
              )}
              {addedByName && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {addedByName.split(' ')[0]}
                </span>
              )}
              {recipe.protein && (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                  {recipe.protein}
                </span>
              )}
            </div>
          </div>

          {/* Swipe affordance */}
          <div className="flex shrink-0 flex-col items-center gap-0.5 pl-1 text-muted-foreground/30">
            <div className="h-0.5 w-4 rounded-full bg-current" />
            <div className="h-0.5 w-4 rounded-full bg-current" />
            <div className="h-0.5 w-4 rounded-full bg-current" />
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export const WeekPlanView: React.FC<WeekPlanViewProps> = ({
  currentRecipes,
  allRecipes,
  onSelectRecipe,
  onAddRecipe,
}) => {
  // Resolve planned entries to their recipes (flat list — recipes belong to the week, not a day)
  const plannedCards = currentRecipes
    .map((planned) => ({
      planned,
      recipe: allRecipes.find((r) => r.id === planned.recipeId) || null,
    }))
    .filter((entry): entry is { planned: PlannedRecipe; recipe: Recipe } => entry.recipe !== null)

  // Handle remove recipe
  const handleRemoveRecipe = async (recipeId: string) => {
    triggerHaptic('light')
    await removeRecipeFromWeek(recipeId)
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-3 p-4 pb-24"
    >
      {plannedCards.map(({ planned, recipe }) => (
        <motion.div key={planned.recipeId} variants={itemVariants}>
          <SwipeableRecipeCard
            recipe={recipe}
            recipeId={planned.recipeId}
            addedByName={planned.addedByName}
            onSelectRecipe={onSelectRecipe}
            onRemove={handleRemoveRecipe}
          />
        </motion.div>
      ))}

      {/* Add a recipe */}
      <motion.div variants={itemVariants}>
        <div className="overflow-hidden rounded-xl border border-dashed border-border bg-card/50">
          <button
            onClick={() => onAddRecipe?.()}
            className="flex w-full items-center justify-center gap-2 p-6 text-muted-foreground transition-colors hover:bg-accent/30 hover:text-foreground"
          >
            <Plus className="h-5 w-5" />
            <span className="text-sm font-medium">
              {plannedCards.length === 0 ? 'Add your first recipe' : 'Add a recipe'}
            </span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

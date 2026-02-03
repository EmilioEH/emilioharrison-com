import React, { useState, useRef } from 'react'
import { format, parseISO, addDays } from 'date-fns'
import { Plus, Clock, User, ChefHat, Calendar, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'

import {
  DAYS_OF_WEEK,
  removeRecipeFromDay,
  type PlannedRecipe,
  type DayOfWeek,
} from '../../../lib/weekStore'
import type { Recipe } from '../../../lib/types'
import { cookingSessionActions } from '../../../stores/cookingSession'
import { DayPicker } from './DayPicker'

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
  day: DayOfWeek
  dayName: string
  monthAbbrev: string
  dateNum: string
  addedByName?: string
  onSelectRecipe: (recipe: Recipe) => void
  onStartCooking: (recipe: Recipe) => void
  onRemove: (recipeId: string) => void
  onMove: (recipeId: string) => void
}

const SwipeableRecipeCard: React.FC<SwipeableRecipeCardProps> = ({
  recipe,
  recipeId,
  day: _day,
  dayName,
  monthAbbrev,
  dateNum,
  addedByName,
  onSelectRecipe,
  onStartCooking,
  onRemove,
  onMove,
}) => {
  const [swipeX, setSwipeX] = useState(0)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const touchCurrentX = useRef(0)
  const touchCurrentY = useRef(0)
  const hasMovedRef = useRef(false)

  const SWIPE_THRESHOLD = 80 // Distance to trigger action/menu
  const MENU_OPEN_POSITION = -160 // How far to swipe left to lock menu open

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

      // Limit swipe distance - allow right swipe for cook, left swipe for menu
      const limitedSwipe = Math.max(-180, Math.min(150, deltaX))
      setSwipeX(limitedSwipe)
    }
  }

  // Handle touch end
  const handleTouchEnd = () => {
    // Check if swipe threshold met
    if (Math.abs(swipeX) > SWIPE_THRESHOLD) {
      if (swipeX > 0) {
        // Swiped right - Start cooking
        triggerHaptic('success')
        onStartCooking(recipe)
        setSwipeX(0)
        setIsMenuOpen(false)
      } else {
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

  const handleMove = (e: React.MouseEvent) => {
    e.stopPropagation()
    triggerHaptic('light')
    onMove(recipeId)
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
      {/* Day Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">{dayName}</span>
          <span className="text-xs text-muted-foreground">
            {monthAbbrev} {dateNum}
          </span>
        </div>
      </div>

      {/* Swipeable Container */}
      <div className="relative overflow-hidden">
        {/* Background Action Buttons */}
        <div className="absolute inset-0 flex items-center justify-between">
          {/* Left side - Start Cooking (revealed when swiping right) */}
          <motion.div
            initial={false}
            animate={{ opacity: swipeX > 20 ? 1 : 0 }}
            className="flex h-full items-center bg-primary px-6"
          >
            <ChefHat className="h-6 w-6 text-primary-foreground" />
            <span className="ml-2 font-bold text-primary-foreground">Cook</span>
          </motion.div>

          {/* Right side - Menu (revealed when swiping left) */}
          <motion.div
            initial={false}
            animate={{ opacity: swipeX < -20 ? 1 : 0 }}
            className="flex h-full items-center gap-2 bg-muted px-4"
          >
            <button
              onClick={handleMove}
              className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
              aria-label="Move recipe"
            >
              <Calendar className="h-5 w-5" />
            </button>
            <button
              onClick={handleDelete}
              className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive text-destructive-foreground transition-colors hover:bg-destructive/90"
              aria-label="Delete recipe"
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
        </motion.div>
      </div>
    </div>
  )
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
  const [movePickerState, setMovePickerState] = useState<{
    isOpen: boolean
    recipeId: string
    recipeTitle: string
    currentDay?: DayOfWeek
  } | null>(null)

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
  const handleRemoveRecipe = async (recipeId: string) => {
    triggerHaptic('light')
    await removeRecipeFromDay(recipeId)
  }

  // Handle start cooking
  const handleStartCooking = (recipe: Recipe) => {
    cookingSessionActions.startSession(recipe)
    onSelectRecipe(recipe) // Navigate to recipe detail which will show cooking mode
  }

  // Handle move recipe - opens day picker
  const handleMoveRecipe = (recipeId: string) => {
    const recipe = allRecipes.find((r) => r.id === recipeId)
    const plannedRecipe = currentRecipes.find((r) => r.recipeId === recipeId)
    if (recipe) {
      setMovePickerState({
        isOpen: true,
        recipeId,
        recipeTitle: recipe.title,
        currentDay: plannedRecipe?.day,
      })
    }
  }

  // Close day picker
  const handleCloseDayPicker = () => {
    setMovePickerState(null)
  }

  return (
    <>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-3 p-4 pb-24"
      >
        {dayData.map((d) => (
          <motion.div key={d.day} variants={itemVariants}>
            {d.isPlanned && d.recipe ? (
              // Planned Day Card with Swipe
              <SwipeableRecipeCard
                recipe={d.recipe}
                recipeId={d.recipeId!}
                day={d.day}
                dayName={d.dayName}
                monthAbbrev={d.monthAbbrev}
                dateNum={d.dateNum}
                addedByName={d.addedByName}
                onSelectRecipe={onSelectRecipe}
                onStartCooking={handleStartCooking}
                onRemove={handleRemoveRecipe}
                onMove={handleMoveRecipe}
              />
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

      {/* DayPicker Modal for Moving Recipes */}
      {movePickerState && (
        <DayPicker
          isOpen={movePickerState.isOpen}
          onClose={handleCloseDayPicker}
          recipeId={movePickerState.recipeId}
          recipeTitle={movePickerState.recipeTitle}
          mode="edit"
          currentDay={movePickerState.currentDay}
        />
      )}
    </>
  )
}

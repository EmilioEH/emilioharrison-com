import React, { useState, useRef } from 'react'
import { format, parseISO, addDays } from 'date-fns'
import { X, Plus, Clock, User, ChefHat } from 'lucide-react'
import { motion } from 'framer-motion'

import {
  DAYS_OF_WEEK,
  removeRecipeFromDay,
  addRecipeToDay,
  type PlannedRecipe,
  type DayOfWeek,
} from '../../../lib/weekStore'
import type { Recipe } from '../../../lib/types'
import { cookingSessionActions } from '../../../stores/cookingSession'

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
  onDragStart: (recipeId: string, day: DayOfWeek) => void
  onDragEnd: () => void
  isDragOver: boolean
}

const SwipeableRecipeCard: React.FC<SwipeableRecipeCardProps> = ({
  recipe,
  recipeId,
  day,
  dayName,
  monthAbbrev,
  dateNum,
  addedByName,
  onSelectRecipe,
  onStartCooking,
  onRemove,
  onDragStart,
  onDragEnd,
  isDragOver,
}) => {
  const [swipeX, setSwipeX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const touchCurrentX = useRef(0)
  const touchCurrentY = useRef(0)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const hasMovedRef = useRef(false)

  const SWIPE_THRESHOLD = 80 // Distance to trigger action
  const LONG_PRESS_DURATION = 400 // ms to trigger drag

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    touchCurrentX.current = e.touches[0].clientX
    touchCurrentY.current = e.touches[0].clientY
    hasMovedRef.current = false

    // Start long press timer for drag
    longPressTimer.current = setTimeout(() => {
      if (!hasMovedRef.current) {
        triggerHaptic('medium')
        setIsDragging(true)
        onDragStart(recipeId, day)
      }
    }, LONG_PRESS_DURATION)
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

    // If dragging, don't handle swipe
    if (isDragging) {
      return
    }

    // Cancel long press if moved vertically (scrolling)
    if (Math.abs(deltaY) > 10) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
    }

    // Only handle horizontal swipe if not scrolling vertically
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault() // Prevent scroll while swiping
      // Limit swipe distance
      const limitedSwipe = Math.max(-150, Math.min(150, deltaX))
      setSwipeX(limitedSwipe)
    }
  }

  // Handle touch end
  const handleTouchEnd = () => {
    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }

    // If dragging, end drag
    if (isDragging) {
      setIsDragging(false)
      onDragEnd()
      return
    }

    const deltaX = touchCurrentX.current - touchStartX.current

    // Check if swipe threshold met
    if (Math.abs(swipeX) > SWIPE_THRESHOLD) {
      if (swipeX > 0) {
        // Swiped right - Start cooking
        triggerHaptic('success')
        onStartCooking(recipe)
      } else {
        // Swiped left - Remove
        triggerHaptic('light')
        onRemove(recipeId)
      }
    } else if (!hasMovedRef.current && Math.abs(deltaX) < 10) {
      // Tap - View recipe
      onSelectRecipe(recipe)
    }

    // Reset swipe
    setSwipeX(0)
  }

  // Handle touch cancel
  const handleTouchCancel = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    setSwipeX(0)
    setIsDragging(false)
    onDragEnd()
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Day Header */}
      <div
        className={`flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2 transition-colors ${
          isDragOver ? 'bg-primary/20 ring-2 ring-primary ring-inset' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">{dayName}</span>
          <span className="text-xs text-muted-foreground">
            {monthAbbrev} {dateNum}
          </span>
        </div>
        {isDragging && (
          <span className="text-xs font-medium text-primary">Drop on another day to move</span>
        )}
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

          {/* Right side - Remove (revealed when swiping left) */}
          <motion.div
            initial={false}
            animate={{ opacity: swipeX < -20 ? 1 : 0 }}
            className="flex h-full items-center bg-destructive px-6"
          >
            <span className="mr-2 font-bold text-destructive-foreground">Remove</span>
            <X className="h-6 w-6 text-destructive-foreground" />
          </motion.div>
        </div>

        {/* Recipe Card (swipeable) */}
        <motion.div
          animate={{ x: swipeX, scale: isDragging ? 1.05 : 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={`relative flex items-center gap-4 bg-card p-3 ${
            isDragging ? 'z-50 cursor-grabbing opacity-90 shadow-2xl' : 'cursor-grab'
          }`}
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
  const [draggedRecipe, setDraggedRecipe] = useState<{
    recipeId: string
    fromDay: DayOfWeek
  } | null>(null)
  const [dragOverDay, setDragOverDay] = useState<DayOfWeek | null>(null)

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

  // Handle drag start
  const handleDragStart = (recipeId: string, fromDay: DayOfWeek) => {
    setDraggedRecipe({ recipeId, fromDay })
  }

  // Handle drag end
  const handleDragEnd = () => {
    if (draggedRecipe && dragOverDay && dragOverDay !== draggedRecipe.fromDay) {
      // Move recipe to new day
      const moveRecipe = async () => {
        // Remove from old day
        await removeRecipeFromDay(draggedRecipe.recipeId)
        // Add to new day
        await addRecipeToDay(draggedRecipe.recipeId, dragOverDay)
        triggerHaptic('success')
      }
      moveRecipe()
    }
    setDraggedRecipe(null)
    setDragOverDay(null)
  }

  // Handle drag over empty day
  const handleDragOverDay = (day: DayOfWeek) => {
    if (draggedRecipe && day !== draggedRecipe.fromDay) {
      setDragOverDay(day)
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-3 p-4 pb-24"
    >
      {dayData.map((d) => (
        <motion.div
          key={d.day}
          variants={itemVariants}
          onTouchMove={() => draggedRecipe && handleDragOverDay(d.day)}
        >
          {d.isPlanned && d.recipe ? (
            // Planned Day Card with Swipe & Drag
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
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              isDragOver={dragOverDay === d.day}
            />
          ) : (
            // Empty Day Card - Drop Zone
            <div
              className={`overflow-hidden rounded-xl border border-dashed transition-all ${
                dragOverDay === d.day
                  ? 'border-primary bg-primary/10 ring-2 ring-primary ring-offset-2'
                  : 'border-border bg-card/50'
              }`}
            >
              {/* Day Header */}
              <div
                className={`flex items-center justify-between border-b border-dashed px-4 py-2 transition-colors ${
                  dragOverDay === d.day
                    ? 'border-primary bg-primary/20'
                    : 'border-border bg-muted/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-bold ${
                      dragOverDay === d.day ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    {d.dayName}
                  </span>
                  <span className="text-xs text-muted-foreground/70">
                    {d.monthAbbrev} {d.dateNum}
                  </span>
                </div>
                {dragOverDay === d.day && (
                  <span className="text-xs font-medium text-primary">Drop here</span>
                )}
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

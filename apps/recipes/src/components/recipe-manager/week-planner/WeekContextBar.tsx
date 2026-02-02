import React, { useState, useEffect, useRef } from 'react'
import { useStore } from '@nanostores/react'
import { format, parseISO, startOfWeek, addWeeks, addDays, isSameWeek, getDay } from 'date-fns'
import { ChevronUp, ChevronDown, X, ShoppingCart, Calendar } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import {
  weekState,
  switchWeekContext,
  currentWeekRecipes,
  removeRecipeFromDay,
  DAYS_OF_WEEK,
} from '../../../lib/weekStore'
import { $recipes } from '../../../lib/recipeStore'
import type { Recipe } from '../../../lib/types'

interface WeekContextBarProps {
  onViewWeek: () => void
  onViewGrocery?: () => void
  defaultExpanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
}

/**
 * Get smart default week based on current day of week.
 * Fri-Sun → Next Week, Mon-Thu → This Week
 */
const getSmartDefaultWeek = (): 'this' | 'next' => {
  const day = getDay(new Date()) // 0 = Sunday, 1 = Monday, ...
  // Friday = 5, Saturday = 6, Sunday = 0
  return day === 0 || day >= 5 ? 'next' : 'this'
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

export const WeekContextBar: React.FC<WeekContextBarProps> = ({
  onViewWeek,
  onViewGrocery,
  defaultExpanded = false,
  onExpandedChange,
}) => {
  const { activeWeekStart } = useStore(weekState)
  const currentRecipes = useStore(currentWeekRecipes)
  const allRecipes = useStore($recipes)

  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  // Sync with external control
  useEffect(() => {
    setIsExpanded(defaultExpanded)
  }, [defaultExpanded])

  // Notify parent of expansion changes
  const handleSetExpanded = (expanded: boolean) => {
    setIsExpanded(expanded)
    onExpandedChange?.(expanded)
  }

  const activeDate = parseISO(activeWeekStart)
  const today = new Date()
  const currentWeekStarts = startOfWeek(today, { weekStartsOn: 1 })
  const nextWeekStarts = addWeeks(currentWeekStarts, 1)

  const isThisWeek = isSameWeek(activeDate, today, { weekStartsOn: 1 })
  const isNextWeek = isSameWeek(activeDate, addWeeks(today, 1), { weekStartsOn: 1 })

  // Week date range formatting
  const weekEndDate = addDays(activeDate, 6)
  const dateRangeLabel = `${format(activeDate, 'MMM d')} – ${format(weekEndDate, 'd')}`

  // Week label
  const weekLabel = isThisWeek
    ? 'This Week'
    : isNextWeek
      ? 'Next Week'
      : `Week of ${format(activeDate, 'MMM d')}`

  // Handlers
  const handleSetNextWeek = () => switchWeekContext(format(nextWeekStarts, 'yyyy-MM-dd'))

  // Apply smart default on mount if needed
  useEffect(() => {
    const smartDefault = getSmartDefaultWeek()
    if (smartDefault === 'next' && isThisWeek) {
      handleSetNextWeek()
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Scroll-aware logic: collapse to pill on scroll down, expand on scroll up
  const [isCollapsed, setIsCollapsed] = useState(false)
  const lastScrollY = useRef(0)
  const scrollUpDistance = useRef(0)
  const SCROLL_UP_THRESHOLD = 50 // pixels of scroll-up needed before expanding

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const delta = currentScrollY - lastScrollY.current

      // When expanded drawer is open, don't collapse
      if (isExpanded) {
        lastScrollY.current = currentScrollY
        return
      }

      // Scrolling down - collapse to pill
      if (delta > 0 && currentScrollY > 20) {
        setIsCollapsed(true)
        scrollUpDistance.current = 0
      }
      // Scrolling up - expand after threshold
      else if (delta < 0) {
        scrollUpDistance.current += Math.abs(delta)
        if (scrollUpDistance.current >= SCROLL_UP_THRESHOLD) {
          setIsCollapsed(false)
        }
      }

      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isExpanded])

  // Build day data with recipe info
  const dayData = DAYS_OF_WEEK.map((day, index) => {
    const date = addDays(activeDate, index)
    const plannedRecipe = currentRecipes.find((r) => r.day === day)
    const recipe = plannedRecipe ? allRecipes.find((r) => r.id === plannedRecipe.recipeId) : null

    return {
      day,
      dayAbbrev: format(date, 'EEE'),
      date,
      dateNum: format(date, 'd'),
      isPlanned: !!plannedRecipe,
      recipe,
      recipeId: plannedRecipe?.recipeId,
      addedByName: plannedRecipe?.addedByName,
    }
  })

  const plannedCount = dayData.filter((d) => d.isPlanned).length
  const emptyDays = dayData.filter((d) => !d.isPlanned)

  // Handle remove recipe
  const handleRemoveRecipe = async (recipeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await removeRecipeFromDay(recipeId)
  }

  // Handle grocery click
  const handleGroceryClick = () => {
    if (onViewGrocery) {
      onViewGrocery()
    } else {
      onViewWeek() // Fallback to week view
    }
    handleSetExpanded(false)
  }

  // Handle pill click - expand from collapsed state
  const handlePillClick = () => {
    setIsCollapsed(false)
    handleSetExpanded(true)
  }

  return (
    <>
      {/* Backdrop when expanded */}
      {isExpanded && (
        <div
          role="button"
          tabIndex={0}
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm"
          onClick={() => handleSetExpanded(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
              handleSetExpanded(false)
            }
          }}
          aria-label="Close meal plan drawer"
        />
      )}

      {/* Collapsed Pill View with morph animation */}
      <AnimatePresence>
        {isCollapsed && !isExpanded && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={handlePillClick}
            className="pb-safe fixed inset-x-0 bottom-10 z-40 mx-auto flex w-fit items-center gap-2 rounded-full border border-border bg-card px-4 py-2 shadow-lg hover:scale-105 active:scale-95"
            aria-label={`${plannedCount} meals planned this week. Tap to expand.`}
          >
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-foreground">{plannedCount} planned</span>
            {/* Day Dots */}
            <div className="flex items-center gap-0.5">
              {dayData.map((d) => (
                <div
                  key={d.day}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    d.isPlanned ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Full Bar View with animation */}
      <AnimatePresence>
        {(!isCollapsed || isExpanded) && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`pb-safe fixed bottom-8 left-0 right-0 z-40 border-t border-border bg-card shadow-[0_-4px_20px_rgb(0,0,0,0.12)] ${
              isExpanded ? 'rounded-t-2xl' : ''
            }`}
            style={{
              maxHeight: isExpanded ? '60vh' : 'auto',
            }}
          >
            {/* Collapsed View */}
            <div className="mx-auto max-w-2xl px-4">
              {/* Header Row - Always Visible */}
              <button
                onClick={() => handleSetExpanded(!isExpanded)}
                className="flex w-full items-center justify-between py-3"
                aria-expanded={isExpanded}
                aria-label={isExpanded ? 'Collapse meal plan' : 'Expand meal plan'}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-foreground">{weekLabel}</span>
                  <span className="text-xs text-muted-foreground">
                    {plannedCount}/{DAYS_OF_WEEK.length} days
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Day Dots */}
                  <div className="flex items-center gap-1">
                    {dayData.map((d) => (
                      <div
                        key={d.day}
                        className={`h-2 w-2 rounded-full transition-colors ${
                          d.isPlanned ? 'bg-primary' : 'bg-muted-foreground/30'
                        }`}
                        title={`${d.day}${d.recipe ? `: ${d.recipe.title}` : ''}`}
                      />
                    ))}
                  </div>

                  {/* Expand/Collapse Icon */}
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="overflow-y-auto pb-4" style={{ maxHeight: 'calc(60vh - 60px)' }}>
                  {/* Date Range Subheader */}
                  <div className="mb-3 text-xs text-muted-foreground">{dateRangeLabel}</div>

                  {/* Planned Recipes List */}
                  {plannedCount > 0 && (
                    <div className="mb-4 space-y-2">
                      {dayData
                        .filter((d) => d.isPlanned && d.recipe)
                        .map((d) => (
                          <div
                            key={d.day}
                            className="flex items-center gap-3 rounded-lg bg-muted/50 p-2"
                          >
                            {/* Recipe Thumbnail */}
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                              {d.recipe && getRecipeImage(d.recipe) ? (
                                <img
                                  src={getRecipeImage(d.recipe)!}
                                  alt={d.recipe.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-lg">
                                  🍽️
                                </div>
                              )}
                            </div>

                            {/* Recipe Info */}
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium text-foreground">
                                {d.recipe?.title}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="font-medium">{d.dayAbbrev}</span>
                                {d.recipe?.prepTime && d.recipe?.cookTime && (
                                  <>
                                    <span>·</span>
                                    <span>{d.recipe.prepTime + d.recipe.cookTime} min</span>
                                  </>
                                )}
                                {d.addedByName && (
                                  <>
                                    <span>·</span>
                                    <span className="truncate">
                                      by {d.addedByName.split(' ')[0]}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Remove Button */}
                            <button
                              onClick={(e) => d.recipeId && handleRemoveRecipe(d.recipeId, e)}
                              className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              aria-label={`Remove ${d.recipe?.title} from ${d.day}`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Empty Days */}
                  {emptyDays.length > 0 && (
                    <div className="mb-4 rounded-lg border border-dashed border-border p-3">
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">{emptyDays.length} empty days:</span>{' '}
                        {emptyDays.map((d) => d.dayAbbrev).join(', ')}
                      </div>
                    </div>
                  )}

                  {/* No Meals Planned State */}
                  {plannedCount === 0 && (
                    <div className="mb-4 rounded-lg bg-muted/50 p-4 text-center">
                      <p className="text-sm text-muted-foreground">No meals planned yet</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Tap the + on any recipe to add it
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleGroceryClick}
                      disabled={plannedCount === 0}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Grocery List
                    </button>

                    <button
                      onClick={() => {
                        onViewWeek()
                        handleSetExpanded(false)
                      }}
                      className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      <Calendar className="h-4 w-4" />
                      Full View
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

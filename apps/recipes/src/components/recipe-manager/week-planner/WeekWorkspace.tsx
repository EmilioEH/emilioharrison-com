import React, { useState, useMemo } from 'react'
import { useStore } from '@nanostores/react'
import { format, parseISO, startOfWeek, addWeeks, addDays, isSameWeek } from 'date-fns'
import { motion } from 'framer-motion'
import {
  Calendar,
  Check,
  X,
  ShoppingCart,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  Share,
  Copy,
} from 'lucide-react'

import { weekState, switchWeekContext, currentWeekRecipes } from '../../../lib/weekStore'
import { Button } from '../../ui/button'
import { Stack, Inline } from '../../ui/layout'
import { RecipeLibrary } from '../RecipeLibrary'
import { GroceryList } from '../GroceryList'
import { alert } from '../../../lib/dialogStore'
import type { Recipe, ShoppableIngredient } from '../../../lib/types'

type WorkspaceTab = 'plan' | 'grocery'

interface WeekWorkspaceProps {
  recipes: Recipe[]
  allRecipes: Recipe[]
  onClose: () => void
  onOpenCalendar: () => void
  onSelectRecipe: (recipe: Recipe) => void
  scrollContainer: HTMLElement | null
  onShare?: (recipe: Recipe) => void
}

export const WeekWorkspace: React.FC<WeekWorkspaceProps> = ({
  recipes: _recipes,
  allRecipes,
  onClose,
  onOpenCalendar,
  onSelectRecipe,
  scrollContainer,
  onShare,
}) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('plan')
  const { activeWeekStart } = useStore(weekState)
  const currentRecipes = useStore(currentWeekRecipes)

  const activeDate = parseISO(activeWeekStart)
  const today = new Date()
  const currentWeekStarts = startOfWeek(today, { weekStartsOn: 1 })
  const nextWeekStarts = addWeeks(currentWeekStarts, 1)

  const isThisWeek = isSameWeek(activeDate, today, { weekStartsOn: 1 })
  const isNextWeek = isSameWeek(activeDate, addWeeks(today, 1), { weekStartsOn: 1 })

  // Week date range formatting
  const weekEndDate = addDays(activeDate, 6)
  const dateRangeLabel = `${format(activeDate, 'MMM d')} - ${format(weekEndDate, 'd')}`

  // Build grocery list from current week's recipes (dynamic based on selected week)
  const groceryRecipes = useMemo(() => {
    const plannedRecipeIds = currentRecipes.map((p) => p.recipeId)
    return allRecipes.filter((r) => plannedRecipeIds.includes(r.id))
  }, [currentRecipes, allRecipes])

  const groceryItems = useMemo((): ShoppableIngredient[] => {
    // Use structuredIngredients for proper categorization, fall back to basic ingredients
    const ingredientMap = new Map<string, ShoppableIngredient>()

    for (const recipe of groceryRecipes) {
      // Prefer structuredIngredients for proper categories and units
      if (recipe.structuredIngredients && recipe.structuredIngredients.length > 0) {
        for (const ing of recipe.structuredIngredients) {
          const key = `${ing.name.toLowerCase()}|${ing.unit.toLowerCase()}`

          if (ingredientMap.has(key)) {
            const existing = ingredientMap.get(key)!
            existing.purchaseAmount += ing.amount
            if (!existing.sources.some((s) => s.recipeId === recipe.id)) {
              existing.sources.push({
                recipeId: recipe.id,
                recipeTitle: recipe.title,
                originalAmount: `${ing.amount} ${ing.unit}`,
              })
            }
          } else {
            ingredientMap.set(key, {
              name: ing.name,
              purchaseAmount: ing.amount,
              purchaseUnit: ing.unit,
              category: ing.category || 'Other',
              sources: [
                {
                  recipeId: recipe.id,
                  recipeTitle: recipe.title,
                  originalAmount: `${ing.amount} ${ing.unit}`,
                },
              ],
            })
          }
        }
      } else if (recipe.ingredients) {
        // Fallback for recipes without structuredIngredients
        for (const ing of recipe.ingredients) {
          const key = `${ing.name.toLowerCase()}|basic`

          if (ingredientMap.has(key)) {
            const existing = ingredientMap.get(key)!
            if (!existing.sources.some((s) => s.recipeId === recipe.id)) {
              existing.sources.push({
                recipeId: recipe.id,
                recipeTitle: recipe.title,
                originalAmount: ing.amount ? `${ing.amount} ${ing.name}` : ing.name,
              })
            }
          } else {
            ingredientMap.set(key, {
              name: ing.name?.toLowerCase() || 'unknown',
              purchaseAmount: 1,
              purchaseUnit: 'unit',
              category: 'Other',
              sources: [
                {
                  recipeId: recipe.id,
                  recipeTitle: recipe.title,
                  originalAmount: ing.amount ? `${ing.amount} ${ing.name}` : ing.name,
                },
              ],
            })
          }
        }
      }
    }

    return Array.from(ingredientMap.values())
  }, [groceryRecipes])

  // Cost Estimation (Aggregate from recipes)
  const costEstimate = useMemo(() => {
    let total = 0
    let hasEstimate = 0
    let missingEstimate = 0

    for (const recipe of groceryRecipes) {
      if (typeof recipe.estimatedCost === 'number' && recipe.estimatedCost > 0) {
        total += recipe.estimatedCost
        hasEstimate++
      } else {
        missingEstimate++
      }
    }

    return {
      total,
      hasEstimate,
      missingEstimate,
      isComplete: missingEstimate === 0 && groceryRecipes.length > 0,
      hasAnyData: hasEstimate > 0,
    }
  }, [groceryRecipes])

  // AI-based cost refresh
  const [aiCost, setAiCost] = useState<number | null>(null)
  const [isEstimating, setIsEstimating] = useState(false)
  const [estimateError, setEstimateError] = useState<string | null>(null)

  const handleRefreshCost = async () => {
    if (groceryItems.length === 0) return
    setIsEstimating(true)
    setEstimateError(null)

    try {
      const baseUrl = import.meta.env.BASE_URL.endsWith('/')
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`

      const res = await fetch(`${baseUrl}api/estimate-cost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: groceryItems }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        throw new Error(data.details || data.error || 'Estimation failed')
      }

      if (data.totalCost) {
        setAiCost(data.totalCost)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not estimate cost'
      console.error('Cost estimation failed', msg)
      setEstimateError(msg)
    } finally {
      setIsEstimating(false)
    }
  }

  // Share/Copy grocery list
  const buildGroceryText = () => {
    return groceryItems
      .map((item) => `- ${item.purchaseAmount} ${item.purchaseUnit} ${item.name}`)
      .join('\n')
  }

  const handleCopyGrocery = async () => {
    try {
      await navigator.clipboard.writeText(buildGroceryText())
      await alert('Copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy', err)
    }
  }

  const handleShareGrocery = async () => {
    const text = buildGroceryText()
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Grocery List - ${dateRangeLabel}`,
          text: text,
        })
      } catch {
        // ignore abort
      }
    } else {
      handleCopyGrocery()
    }
  }

  // Handlers
  const handleSetThisWeek = () => switchWeekContext(format(currentWeekStarts, 'yyyy-MM-dd'))
  const handleSetNextWeek = () => switchWeekContext(format(nextWeekStarts, 'yyyy-MM-dd'))

  return (
    <motion.div
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="absolute inset-0 flex flex-col bg-background"
    >
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-xl">
        <Stack spacing="xs" className="mx-auto max-w-2xl px-4 py-3">
          {/* Controls Row: Back + Week Toggles + Calendar + Grocery */}
          <Inline spacing="xs" justify="between">
            {/* Left: Back Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full"
              title="Back to Library"
              aria-label="Back to Library"
            >
              <X className="h-4 w-4" />
            </Button>

            {/* Center: Week Toggles + Calendar */}
            <Inline spacing="xs">
              <div className="flex items-center rounded-lg bg-muted/50 p-1">
                <button
                  onClick={handleSetThisWeek}
                  className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                    isThisWeek
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  aria-label="This Week"
                >
                  This
                  {isThisWeek && <Check className="h-3 w-3" />}
                </button>
                <button
                  onClick={handleSetNextWeek}
                  className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                    isNextWeek
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  aria-label="Next Week"
                >
                  Next
                  {isNextWeek && <Check className="h-3 w-3" />}
                </button>
              </div>

              {/* Calendar Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onOpenCalendar}
                className="h-8 w-8 rounded-full"
                title="Select Week"
                aria-label="Select Week"
              >
                <Calendar className="h-4 w-4" />
              </Button>
            </Inline>

            {/* Right: Grocery Button */}
            <Button
              variant={activeTab === 'grocery' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setActiveTab(activeTab === 'grocery' ? 'plan' : 'grocery')}
              className="gap-1.5"
              title="View Grocery List"
              aria-label="View Grocery List"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="text-xs font-bold">Grocery</span>
            </Button>
          </Inline>

          {/* Info Row */}
          <Inline spacing="sm" justify="between" className="text-xs text-muted-foreground">
            <span className="font-bold text-foreground">{dateRangeLabel}</span>
            <span>
              <span className="font-bold text-foreground">{currentRecipes.length}</span> meals
              planned
            </span>
          </Inline>
        </Stack>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'plan' && (
          <RecipeLibrary
            recipes={groceryRecipes}
            sort="week-day"
            onSelectRecipe={onSelectRecipe}
            onToggleThisWeek={() => {}}
            isSelectionMode={false}
            selectedIds={new Set()}
            hasSearch={false}
            scrollContainer={scrollContainer}
            allowManagement={true}
            currentWeekStart={activeWeekStart}
            onShare={onShare}
          />
        )}

        {activeTab === 'grocery' && (
          <div className="flex h-full flex-col">
            {/* Cost Estimate Banner */}
            {groceryRecipes.length > 0 && (
              <div className="border-b border-border bg-muted/30 px-4 py-3">
                <Inline spacing="md" justify="between" className="mx-auto max-w-2xl">
                  <Stack spacing="xs">
                    {/* Show AI cost if available, otherwise aggregate */}
                    {aiCost !== null ? (
                      <>
                        <span className="text-lg font-bold text-green-700">
                          ${aiCost.toFixed(2)}
                        </span>
                        <span className="text-xs text-muted-foreground">AI Estimate (HEB)</span>
                      </>
                    ) : costEstimate.hasAnyData ? (
                      <>
                        <Inline spacing="xs">
                          <span
                            className={`text-lg font-bold ${costEstimate.isComplete ? 'text-green-700' : 'text-amber-600'}`}
                          >
                            ${costEstimate.total.toFixed(2)}
                          </span>
                          {!costEstimate.isComplete && (
                            <span className="flex items-center gap-1 text-xs text-amber-600">
                              <AlertTriangle className="h-3 w-3" />
                              Incomplete
                            </span>
                          )}
                        </Inline>
                        <span className="text-xs text-muted-foreground">
                          From {costEstimate.hasEstimate}/{groceryRecipes.length} recipes
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-medium text-muted-foreground">
                          No cost data
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Click refresh to estimate
                        </span>
                      </>
                    )}
                  </Stack>

                  {/* Actions: Share, Copy, Refresh */}
                  <Inline spacing="xs">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleShareGrocery}
                      className="h-8 w-8 rounded-full"
                      title="Share"
                      aria-label="Share Grocery List"
                    >
                      <Share className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCopyGrocery}
                      className="h-8 w-8 rounded-full"
                      title="Copy"
                      aria-label="Copy Grocery List"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={costEstimate.isComplete && aiCost === null ? 'outline' : 'default'}
                      size="sm"
                      onClick={handleRefreshCost}
                      disabled={isEstimating || groceryItems.length === 0}
                      className="gap-1.5"
                    >
                      <RefreshCw className={`h-4 w-4 ${isEstimating ? 'animate-spin' : ''}`} />
                      <span className="text-xs font-bold">
                        {isEstimating
                          ? 'Estimating...'
                          : aiCost !== null
                            ? 'Refresh'
                            : 'Get Estimate'}
                      </span>
                    </Button>
                  </Inline>
                </Inline>

                {/* Error State */}
                {estimateError && (
                  <p className="mt-2 flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" /> {estimateError}
                  </p>
                )}
              </div>
            )}

            {/* Grocery List */}
            <div className="flex-1 overflow-y-auto">
              <GroceryList
                ingredients={groceryItems}
                isLoading={false}
                onClose={() => setActiveTab('plan')}
                recipes={groceryRecipes}
                onOpenRecipe={onSelectRecipe}
                embedded={true}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

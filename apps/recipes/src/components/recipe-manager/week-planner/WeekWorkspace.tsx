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
  Sparkles,
  Zap,
} from 'lucide-react'

import { weekState, switchWeekContext, currentWeekRecipes } from '../../../lib/weekStore'
import { buildGroceryItems, calculateCostEstimate } from '../../../lib/grocery-utils'
import { Button } from '../../ui/button'
import { Stack, Inline } from '../../ui/layout'
import { RecipeLibrary } from '../RecipeLibrary'
import { GroceryList } from '../grocery/GroceryList'
import { alert } from '../../../lib/dialogStore'
import type { Recipe, ShoppableIngredient } from '../../../lib/types'

type WorkspaceTab = 'plan' | 'grocery'

interface WeekWorkspaceProps {
  recipes: Recipe[]
  allRecipes: Recipe[]
  onClose: () => void
  onOpenCalendar: () => void
  onSelectRecipe: (recipe: Recipe) => void
  scrollContainer: HTMLElement | Window | null
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

  // Use extracted utilities to reduce component complexity
  const groceryItems = useMemo(() => buildGroceryItems(groceryRecipes), [groceryRecipes])
  const costEstimate = useMemo(() => calculateCostEstimate(groceryRecipes), [groceryRecipes])

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

  // AI-based grocery optimization
  const [smartIngredients, setSmartIngredients] = useState<ShoppableIngredient[] | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)

  // Reset smart list when recipes change
  useMemo(() => {
    setSmartIngredients(null)
  }, [groceryRecipes])

  const handleOptimizeList = async () => {
    if (groceryRecipes.length === 0) return
    setIsOptimizing(true)
    try {
      const baseUrl = import.meta.env.BASE_URL.endsWith('/')
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`

      const res = await fetch(`${baseUrl}api/generate-grocery-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipes: groceryRecipes }),
      })
      const data = await res.json()

      if (data.ingredients) {
        setSmartIngredients(data.ingredients)
      }
    } catch (e) {
      console.error('Failed to optimize list', e)
    } finally {
      setIsOptimizing(false)
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
      className="flex min-h-0 flex-1 flex-col bg-background"
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

      {/* Content area: scrolls everything inside */}
      <div className="flex-1 scroll-pt-16 overflow-y-auto">
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
          <>
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
                      variant={smartIngredients ? 'default' : 'secondary'}
                      size="sm"
                      onClick={handleOptimizeList}
                      disabled={isOptimizing || groceryItems.length === 0}
                      className="gap-1.5"
                      title="Optimize with AI"
                    >
                      {smartIngredients ? (
                        <Sparkles className="h-4 w-4 text-yellow-300" />
                      ) : (
                        <Zap className={`h-4 w-4 ${isOptimizing ? 'animate-pulse' : ''}`} />
                      )}
                      <span className="hidden text-xs font-bold sm:inline">
                        {isOptimizing
                          ? 'Optimizing...'
                          : smartIngredients
                            ? 'Smart List'
                            : 'Optimize'}
                      </span>
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
            <GroceryList
              ingredients={smartIngredients || groceryItems}
              isLoading={false}
              onClose={() => setActiveTab('plan')}
              recipes={groceryRecipes}
              onOpenRecipe={onSelectRecipe}
              embedded={true}
            />
          </>
        )}
      </div>
      {/* LoadingOverlay removed for progressive enhancement */}
    </motion.div>
  )
}

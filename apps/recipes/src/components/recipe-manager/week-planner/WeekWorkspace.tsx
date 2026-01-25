import React, { useState, useMemo, useEffect, useCallback } from 'react'
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
} from 'lucide-react'

import { weekState, switchWeekContext, currentWeekRecipes } from '../../../lib/weekStore'
import { buildGroceryItems, calculateCostEstimate } from '../../../lib/grocery-utils'
import { Button } from '../../ui/button'
import { Stack, Inline } from '../../ui/layout'
import { RecipeLibrary } from '../RecipeLibrary'
import { GroceryList } from '../grocery/GroceryList'
import { alert } from '../../../lib/dialogStore'
import { triggerGroceryGeneration } from '../../../lib/services/grocery-service'
import { aiOperationStore, removeAiOperation } from '../../../lib/aiOperationStore'
import { AiProgressBar } from '../../ui/AiProgressBar'
import { useAuth } from '../../../lib/authStore'
import { useFirestoreDocument } from '../../../lib/firestoreHooks'
import type { Recipe, GroceryList as GroceryListType } from '../../../lib/types'

import type { User } from 'firebase/auth'

type WorkspaceTab = 'plan' | 'grocery'

interface WeekWorkspaceProps {
  recipes: Recipe[]
  allRecipes: Recipe[]
  onClose: () => void
  onOpenCalendar: () => void
  onSelectRecipe: (recipe: Recipe) => void
  scrollContainer: HTMLElement | Window | null

  onShare?: (recipe: Recipe) => void
  initialTab?: WorkspaceTab
  user?: User | { uid: string } | string | null
}

export const WeekWorkspace: React.FC<WeekWorkspaceProps> = ({
  recipes: _recipes,
  allRecipes,
  onClose,
  onOpenCalendar,
  onSelectRecipe,
  scrollContainer,
  onShare,
  initialTab = 'plan',
  user: propsUser,
}) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialTab)
  const { activeWeekStart } = useStore(weekState)
  const currentRecipes = useStore(currentWeekRecipes)
  const [viewMode, setViewMode] = useState<'programmatic' | 'ai'>('programmatic')
  const { user: authUser } = useAuth()
  const rawUser = propsUser || authUser
  const user = useMemo(() => (typeof rawUser === 'string' ? { uid: rawUser } : rawUser), [rawUser])

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

  const handleRefreshCost = useCallback(async () => {
    if (groceryItems.length === 0) return
    setIsEstimating(true)
    setEstimateError(null)

    // Generate a cache key based on sorted items to be order-independent
    const sortedItems = [...groceryItems].sort((a, b) => a.name.localeCompare(b.name))
    const cacheKey = `cost_est_${user?.uid}_${JSON.stringify(sortedItems.map((i) => ({ n: i.name, a: i.purchaseAmount, u: i.purchaseUnit })))}`

    // Check cache
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const data = JSON.parse(cached)
        if (data.totalCost) {
          console.log('Using cached cost estimate')
          setAiCost(data.totalCost)
          setIsEstimating(false)
          return
        }
      }
    } catch (e) {
      console.warn('Cache read failed', e)
    }

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
        // Save to cache
        try {
          localStorage.setItem(cacheKey, JSON.stringify(data))
        } catch (e) {
          console.warn('Cache write failed', e)
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not estimate cost'
      console.error('Cost estimation failed', msg)
      setEstimateError(msg)
    } finally {
      setIsEstimating(false)
    }
  }, [groceryItems, user])

  // AI-based grocery background ops
  const { operations } = useStore(aiOperationStore)
  const listId = user ? `${user.uid}_${activeWeekStart}` : null

  // Subscribe to Firestore document for this week's list
  const { data: aiGroceryList, loading: aiLoading } = useFirestoreDocument<GroceryListType>(
    listId ? `grocery_lists/${listId}` : null,
  )

  // Check for stuck processing
  const [isStuck, setIsStuck] = useState(false)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (aiGroceryList?.status === 'processing' && aiGroceryList.updatedAt) {
      interval = setInterval(() => {
        const lastUpdate = new Date(aiGroceryList.updatedAt).getTime()
        const now = new Date().getTime()
        // Consider stuck if processing for > 45 seconds (it usually takes 5-10s)
        if (now - lastUpdate > 45000) {
          setIsStuck(true)
        }
      }, 1000)
    } else {
      setIsStuck(false)
    }
    return () => clearInterval(interval)
  }, [aiGroceryList])

  const isProcessing = useMemo(() => {
    // If we determined it's stuck, don't show processing state
    if (isStuck) return false

    // Check local store or remote status
    if (operations.some((op) => op.id === `grocery-${listId}` && op.status === 'processing'))
      return true
    if (aiGroceryList?.status === 'processing') return true
    return false
  }, [operations, listId, aiGroceryList, isStuck])

  const hasLocalError = useMemo(() => {
    return operations.some((op) => op.id === `grocery-${listId}` && op.status === 'error')
  }, [operations, listId])

  const hasError = aiGroceryList?.status === 'error' || isStuck || hasLocalError

  const hasSmartList =
    aiGroceryList?.status === 'complete' &&
    Array.isArray(aiGroceryList.ingredients) &&
    aiGroceryList.ingredients.length > 0 &&
    !isStuck &&
    !hasLocalError

  // Auto-trigger when opening grocery tab if no list exists and not processing
  useEffect(() => {
    if (activeTab === 'grocery' && user && groceryRecipes.length > 0 && !aiLoading) {
      const needsGeneration = !aiGroceryList && !isProcessing && !isStuck

      if (needsGeneration) {
        triggerGroceryGeneration(activeWeekStart, groceryRecipes, user.uid)
      }

      // Auto-trigger cost estimate (checks cache first)
      // Only trigger if we don't have a cost, aren't currently working on it, and haven't failed recently
      if (!aiCost && !isEstimating && !estimateError) {
        handleRefreshCost()
      }
    }
  }, [
    activeTab,
    user,
    groceryRecipes,
    aiGroceryList,
    isProcessing,
    activeWeekStart,
    aiLoading,
    isStuck,
    handleRefreshCost,
    aiCost,
    isEstimating,
    estimateError,
  ])

  // Auto-switch to AI view when ready (only once)
  useEffect(() => {
    if (hasSmartList && viewMode === 'programmatic' && !isProcessing && !isStuck) {
      // Optional: Only auto-switch if user hasn't toggled back manually?
      // For now, simpler is better: if it completes while looking at it, show toast or just switch?
      // Let's NOT auto-switch to avoid jarring jump, but show the toggle as enabled/highlighted.
    }
  }, [hasSmartList, isProcessing, isStuck])

  // Combined ingredients based on view mode
  const displayedIngredients = useMemo(() => {
    if (
      viewMode === 'ai' &&
      hasSmartList &&
      aiGroceryList &&
      Array.isArray(aiGroceryList.ingredients)
    ) {
      return aiGroceryList.ingredients
    }
    return groceryItems
  }, [viewMode, hasSmartList, aiGroceryList, groceryItems])

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

                  {/* Actions: Icons + View Toggle */}
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                    <Inline spacing="xs">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          handleRefreshCost()
                          if (user) {
                            const listId = `${user.uid}_${activeWeekStart}`
                            removeAiOperation(`grocery-${listId}`)
                            triggerGroceryGeneration(activeWeekStart, groceryRecipes, user.uid)
                          }
                        }}
                        disabled={isEstimating || isProcessing}
                        className="h-8 w-8 rounded-full"
                        title="Refresh AI & Costs"
                        aria-label="Refresh AI & Costs"
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${isEstimating || isProcessing ? 'animate-spin' : ''}`}
                        />
                      </Button>

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
                    </Inline>

                    {/* View Toggle */}
                    <div className="flex items-center rounded-lg border border-border bg-background p-1 shadow-sm">
                      <button
                        onClick={() => setViewMode('programmatic')}
                        className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition-all ${
                          viewMode === 'programmatic'
                            ? 'bg-muted text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Standard
                      </button>
                      <button
                        onClick={() => hasSmartList && setViewMode('ai')}
                        disabled={!hasSmartList}
                        className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition-all ${
                          viewMode === 'ai'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground'
                        } ${!hasSmartList ? 'cursor-not-allowed opacity-50' : 'hover:text-foreground'}`}
                      >
                        {isProcessing ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        Smart List
                      </button>
                    </div>
                  </div>
                </Inline>

                {/* Progress Indicator */}
                {isProcessing && (
                  <div className="mt-2 text-primary">
                    <AiProgressBar
                      progress={
                        operations.find((op) => op.id === `grocery-${listId}`)?.progress ||
                        (aiGroceryList?.status === 'processing' ? 5 : 0)
                      }
                      message={
                        operations.find((op) => op.id === `grocery-${listId}`)?.message ||
                        (isStuck ? 'Still processing...' : 'Consulting Chef Gemini...')
                      }
                      isAnimating={true}
                    />
                  </div>
                )}

                {/* Error State */}
                {estimateError && (
                  <p className="mt-2 flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" /> {estimateError}
                  </p>
                )}
              </div>
            )}

            {/* Grocery List */}
            {hasError && (
              <div className="m-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
                <Inline spacing="sm">
                  <AlertTriangle className="h-5 w-5" />
                  <Stack spacing="xs" className="flex-1">
                    <p className="font-bold">
                      {isStuck ? 'Generation Timed Out' : 'Failed to generate Smart List'}
                    </p>
                    <p className="text-xs opacity-90">
                      {isStuck
                        ? 'The request took too long. Please try again.'
                        : 'The AI service encountered an error. Please try again.'}
                    </p>
                  </Stack>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      // Force retry
                      console.log('Retrying grocery generation...')
                      if (user) {
                        triggerGroceryGeneration(activeWeekStart, groceryRecipes, user.uid)
                      }
                    }}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </Button>
                </Inline>
              </div>
            )}

            <GroceryList
              ingredients={displayedIngredients}
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

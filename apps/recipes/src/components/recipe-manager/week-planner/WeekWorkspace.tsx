import React, { useState, useMemo, useEffect } from 'react'
import { useStore } from '@nanostores/react'
import { format, parseISO, startOfWeek, addWeeks, addDays, isSameWeek } from 'date-fns'
import { motion } from 'framer-motion'
import {
  Calendar,
  Check,
  ShoppingCart,
  RefreshCw,
  AlertTriangle,
  Share,
  Copy,
  Sparkles,
  ChevronLeft,
  MoreHorizontal,
} from 'lucide-react'

import { weekState, switchWeekContext, currentWeekRecipes } from '../../../lib/weekStore'
import { $currentFamily } from '../../../lib/familyStore'
import { buildGroceryItems, calculateGroceryCost } from '../../../lib/grocery-utils'
import { Button } from '../../ui/button'
import { Stack, Inline } from '../../ui/layout'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu'
import { WeekPlanView } from './WeekPlanView'
import { GroceryList } from '../grocery/GroceryList'
import { ProductPicker } from '../grocery/ProductPicker'
import { alert } from '../../../lib/dialogStore'
import { triggerGroceryGeneration } from '../../../lib/services/grocery-service'
import { aiOperationStore, removeAiOperation } from '../../../lib/aiOperationStore'
import { AiProgressBar } from '../../ui/AiProgressBar'
import { useAuth } from '../../../lib/authStore'
import { useFirestoreDocument, useFirestoreCollection } from '../../../lib/firestoreHooks'
import type { Recipe, GroceryList as GroceryListType, ProductMatchResult } from '../../../lib/types'

import type { User } from 'firebase/auth'

type WorkspaceTab = 'plan' | 'grocery'

interface WeekWorkspaceProps {
  recipes: Recipe[]
  allRecipes: Recipe[]
  onClose: () => void
  onMinimize?: () => void
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
  onMinimize,
  onOpenCalendar,
  onSelectRecipe,
  scrollContainer: _scrollContainer,
  onShare: _onShare,
  initialTab = 'plan',
  user: _propsUser,
}) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialTab)
  const { activeWeekStart } = useStore(weekState)
  const currentRecipes = useStore(currentWeekRecipes)
  const [viewMode, setViewMode] = useState<'programmatic' | 'ai'>('programmatic')
  const { user: authUser } = useAuth()

  // IMPORTANT: For Firestore operations, we MUST use the Firebase Auth user (authUser)
  // because Firestore security rules check request.auth.uid.
  // The propsUser is the display name from cookies - NOT the Firebase UID.
  // Using propsUser for Firestore would cause permission-denied errors.
  const user = authUser

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

  // AI-based grocery background ops
  const { operations } = useStore(aiOperationStore)
  const currentFamily = useStore($currentFamily)
  const scopeId = currentFamily?.id ?? user?.uid ?? null
  const listId = scopeId ? `${scopeId}_${activeWeekStart}` : null

  // Subscribe to Firestore document for this week's list
  const {
    data: aiGroceryList,
    loading: aiLoading,
    error: firestoreError,
  } = useFirestoreDocument<GroceryListType>(listId ? `grocery_lists/${listId}` : null)

  // Subscribe to product match results for Product Picker
  const { data: productMatches } = useFirestoreCollection<ProductMatchResult>(
    listId ? `grocery_lists/${listId}/product_matches` : null,
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
      // Avoid calling setState synchronously within an effect
      setTimeout(() => {
        setIsStuck((prev) => {
          if (prev) return false
          return prev
        })
      }, 0)
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

  const hasError = aiGroceryList?.status === 'error' || isStuck || hasLocalError || !!firestoreError

  const hasSmartList =
    aiGroceryList?.status === 'complete' &&
    Array.isArray(aiGroceryList.ingredients) &&
    aiGroceryList.ingredients.length > 0 &&
    !isStuck &&
    !hasLocalError

  // Auto-trigger when opening grocery tab if no list exists and not processing
  useEffect(() => {
    if (activeTab === 'grocery' && user && groceryRecipes.length > 0 && !aiLoading) {
      // Allow generation even with firestoreError — the error is often caused by
      // the document not existing yet (family scope). Once generation creates the
      // document, the subscription will resolve on its own.
      const needsGeneration = !aiGroceryList && !isProcessing && !isStuck

      if (needsGeneration) {
        triggerGroceryGeneration(
          activeWeekStart,
          groceryRecipes,
          scopeId!,
          user.uid,
          currentFamily?.id,
        )
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
    firestoreError,
    scopeId,
    currentFamily?.id,
  ])

  // Auto-switch to AI view when smart list becomes ready
  const [userToggledStandard, setUserToggledStandard] = useState(false)

  // Derived view mode: show Smart List unless user explicitly chose Standard
  const effectiveViewMode = useMemo(() => {
    if (userToggledStandard) return viewMode
    if (hasSmartList) return 'ai'
    return 'programmatic'
  }, [userToggledStandard, hasSmartList, viewMode])

  // Combined ingredients based on view mode
  const displayedIngredients = useMemo(() => {
    if (
      effectiveViewMode === 'ai' &&
      hasSmartList &&
      aiGroceryList &&
      Array.isArray(aiGroceryList.ingredients)
    ) {
      return aiGroceryList.ingredients
    }
    return groceryItems
  }, [effectiveViewMode, hasSmartList, aiGroceryList, groceryItems])

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
      <div className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto max-w-2xl px-4 py-3">
          {/* Single row: Back + Week/Date + Grocery toggle */}
          <Inline spacing="xs" justify="between" align="center">
            {/* Left: Back button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onMinimize || onClose}
              className="h-10 w-10 shrink-0 rounded-full"
              title="Back to Library"
              aria-label="Back to Library"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            {/* Center: Week selector with inline date */}
            <Inline spacing="xs" align="center" className="min-w-0 flex-1 justify-center">
              <div className="flex items-center rounded-lg bg-muted/50 p-1">
                <button
                  onClick={handleSetThisWeek}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-bold transition-all ${
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
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-bold transition-all ${
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

              <span className="text-xs font-bold text-foreground">{dateRangeLabel}</span>

              <Button
                variant="ghost"
                size="icon"
                onClick={onOpenCalendar}
                className="h-9 w-9 shrink-0 rounded-full"
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
              className="shrink-0 gap-1.5"
              title="View Grocery List"
              aria-label="View Grocery List"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="text-xs font-bold">Grocery</span>
            </Button>
          </Inline>

          {/* Meals count - subtle secondary info */}
          <div className="mt-1 text-center text-[11px] text-muted-foreground">
            <span className="font-bold text-foreground">{currentRecipes.length}</span> meals planned
          </div>
        </div>
      </div>

      {/* Grocery Toolbar — lives outside the scroll container so iOS touch events
           are never intercepted by scroll disambiguation on the overflow-y-auto parent */}
      {activeTab === 'grocery' &&
        groceryRecipes.length > 0 &&
        (() => {
          const displayItems = hasSmartList ? aiGroceryList!.ingredients : groceryItems
          const hebCost = calculateGroceryCost(displayItems)
          return (
            <div className="touch-manipulation border-b border-border bg-muted/20 px-4 py-2.5">
              <Inline spacing="sm" justify="between" align="center" className="mx-auto max-w-2xl">
                {/* Left: Price pill */}
                <div className="shrink-0">
                  {hebCost.hasAnyData ? (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                        hebCost.isComplete
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}
                    >
                      ${hebCost.total.toFixed(2)}
                      {!hebCost.isComplete && (
                        <>
                          <AlertTriangle className="h-3 w-3" />
                          <span className="font-medium">
                            {hebCost.verifiedCount}/{hebCost.itemCount}
                          </span>
                        </>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">No prices yet</span>
                  )}
                </div>

                {/* Center: Standard / Smart toggle */}
                <div className="flex items-center rounded-full border border-border bg-background p-0.5">
                  <button
                    onClick={() => {
                      setViewMode('programmatic')
                      setUserToggledStandard(true)
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                      effectiveViewMode === 'programmatic'
                        ? 'bg-foreground text-background shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => {
                      if (hasSmartList) {
                        setViewMode('ai')
                        setUserToggledStandard(false)
                      }
                    }}
                    disabled={!hasSmartList}
                    className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition-all ${
                      effectiveViewMode === 'ai'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground'
                    } ${!hasSmartList ? 'cursor-not-allowed opacity-50' : 'hover:text-foreground'}`}
                  >
                    {isProcessing ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    Smart
                  </button>
                </div>

                {/* Right: Overflow menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 shrink-0 rounded-full"
                      title="More Options"
                      aria-label="More Options"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onSelect={() => {
                        if (scopeId && user) {
                          removeAiOperation(`grocery-${listId}`)
                          triggerGroceryGeneration(
                            activeWeekStart,
                            groceryRecipes,
                            scopeId,
                            user.uid,
                            currentFamily?.id,
                          )
                        }
                      }}
                      disabled={isProcessing}
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
                      Regenerate List
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleShareGrocery}>
                      <Share className="mr-2 h-4 w-4" />
                      Share List
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleCopyGrocery}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy to Clipboard
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
            </div>
          )
        })()}

      {/* Content area: scrolls everything inside */}
      <div className="flex-1 overflow-y-auto pb-tab-bar">
        {activeTab === 'plan' && (
          <WeekPlanView
            activeWeekStart={activeWeekStart}
            currentRecipes={currentRecipes}
            allRecipes={allRecipes}
            onSelectRecipe={onSelectRecipe}
            onAddRecipe={() => onClose()}
          />
        )}

        {activeTab === 'grocery' && (
          <>
            {hasError && (
              <div className="m-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
                <Inline spacing="sm">
                  <AlertTriangle className="h-5 w-5" />
                  <Stack spacing="xs" className="flex-1">
                    <p className="font-bold">
                      {firestoreError
                        ? 'Failed to load grocery list'
                        : isStuck
                          ? 'Generation Timed Out'
                          : 'Failed to generate Smart List'}
                    </p>
                    <p className="text-xs opacity-90">
                      {firestoreError
                        ? `Database error: ${firestoreError.message || 'Could not connect'}. Please refresh the page.`
                        : isStuck
                          ? 'The request took too long. Please try again.'
                          : 'The AI service encountered an error. Please try again.'}
                    </p>
                  </Stack>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      // Force retry - reload page for Firestore errors, regenerate for others
                      if (firestoreError) {
                        window.location.reload()
                      } else if (scopeId && user) {
                        console.log('Retrying grocery generation...')
                        triggerGroceryGeneration(
                          activeWeekStart,
                          groceryRecipes,
                          scopeId,
                          user.uid,
                          currentFamily?.id,
                        )
                      }
                    }}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {firestoreError ? 'Refresh' : 'Retry'}
                  </Button>
                </Inline>
              </div>
            )}

            {/* Product Picker - shown after smart list is ready when items need HEB matching */}
            {hasSmartList &&
              scopeId &&
              aiGroceryList &&
              aiGroceryList.productPickerStatus &&
              aiGroceryList.productPickerStatus !== 'complete' && (
                <div className="px-4 pt-3">
                  <ProductPicker
                    ingredients={displayedIngredients}
                    productMatches={productMatches}
                    productPickerStatus={aiGroceryList.productPickerStatus}
                    weekStartDate={activeWeekStart}
                    userId={scopeId}
                    onItemMatched={() => {
                      // Firestore real-time listener auto-updates
                    }}
                  />
                </div>
              )}

            <GroceryList
              ingredients={displayedIngredients}
              isLoading={false}
              onClose={() => setActiveTab('plan')}
              recipes={groceryRecipes}
              onOpenRecipe={onSelectRecipe}
              embedded={true}
              weekStartDate={activeWeekStart}
              userId={scopeId ?? undefined}
              onItemAdded={() => {
                // Firestore real-time listener auto-updates aiGroceryList.
                // Switch to Smart List view so the user sees the newly added item.
                if (hasSmartList || aiGroceryList) {
                  setViewMode('ai')
                }
              }}
            />
          </>
        )}
      </div>
      {/* LoadingOverlay removed for progressive enhancement */}
    </motion.div>
  )
}

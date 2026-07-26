import React, { useState, useMemo, useEffect } from 'react'
import { useStore } from '@nanostores/react'
import { format, parseISO, startOfWeek, addWeeks, addDays, isSameWeek } from 'date-fns'
import { formatWeekRange, type CookOutcome } from '../../../lib/week-review'
import { WeekScreen } from './WeekScreen'
import { WeekReviewPrompt } from './WeekReviewPrompt'
import { SuggesterConversation } from './SuggesterConversation'
import { motion, AnimatePresence } from 'framer-motion'
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

import {
  weekState,
  switchWeekContext,
  currentWeekRecipes,
  addRecipeToWeek,
  removeRecipeFromWeek,
  $groceryNeedsRegen,
  $weekOverlayOpen,
} from '../../../lib/weekStore'
import { $currentFamily } from '../../../lib/familyStore'
import { buildRawShoppableIngredients } from '../../../lib/grocery-utils'
import { useFullRecipes } from '../../../lib/hooks/useFullRecipes'
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
import { alert } from '../../../lib/dialogStore'
import { apiBase } from '../../../lib/routes'
import { emptyConstraints, type Turn } from '../../../lib/services/suggest-turns'
import { triggerGroceryGeneration } from '../../../lib/services/grocery-service'
import { aiOperationStore, removeAiOperation } from '../../../lib/aiOperationStore'
import { AiProgressBar } from '../../ui/AiProgressBar'
import { useAuth } from '../../../lib/authStore'
import { useFirestoreDocument } from '../../../lib/firestoreHooks'
import type { Recipe, GroceryList as GroceryListType } from '../../../lib/types'
import { isGroceryGenerationStuck } from './grocery-stuck-detection'

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

  // The two full screens reachable from the plan. Kept here rather than in the router so the week
  // context underneath (which week is active, what is planned) survives entering and leaving them.
  const [fullScreen, setFullScreen] = useState<'review' | 'suggest' | null>(null)
  const [pendingReview, setPendingReview] = useState<{
    weekStart: string
    recipeIds: string[]
  } | null>(null)

  // Let the shell know a full screen is up, so the bottom tab bar gets out of its way.
  useEffect(() => {
    $weekOverlayOpen.set(fullScreen !== null)
    return () => $weekOverlayOpen.set(false)
  }, [fullScreen])

  /**
   * The suggester's first turn, fetched while the cook is still looking at the plan.
   *
   * A conversation that opens on a spinner is a worse conversation. This costs one call per visit
   * to the week view, which is the same order as the review lookup already sitting here, and it
   * buys an exchange that starts the instant the button is tapped. Failure is silent — the
   * suggester falls back to the deterministic opening question, which is a real question anyway.
   */
  const [prefetchedTurn, setPrefetchedTurn] = useState<Turn | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch(`${apiBase()}api/week/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation: [],
        constraints: { ...emptyConstraints(), keptIds: currentRecipes.map((r) => r.recipeId) },
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.success && data.turn) setPrefetchedTurn(data.turn as Turn)
      })
      .catch(() => {
        // The deterministic opening question is a perfectly good first turn.
      })
    return () => {
      cancelled = true
    }
    // Deliberately once per mount: re-fetching as the plan changes would spend a call per edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadPendingReview = React.useCallback(async () => {
    const res = await fetch(`${apiBase()}api/week/review`)
    const data = await res.json()
    return (data?.pending ?? null) as { weekStart: string; recipeIds: string[] } | null
  }, [])

  useEffect(() => {
    let cancelled = false
    loadPendingReview()
      .then((pending) => {
        if (!cancelled) setPendingReview(pending)
      })
      .catch(() => {
        // A missing prompt is not worth surfacing an error for.
      })
    return () => {
      cancelled = true
    }
  }, [loadPendingReview])

  /**
   * Save what the cook answered.
   *
   * Throws on failure so the prompt can stay open and say so. It used to await the fetch without
   * checking it, then clear the prompt regardless — which made a 400 ("you must join a family
   * first") or a 500 look exactly like a successful save, with the answers gone.
   *
   * A partial save leaves the week open; re-reading the pending review tells us what is left,
   * and only an empty answer closes the screen.
   */
  const submitWeekReview = async (
    outcomes: Array<{ recipeId: string; outcome: CookOutcome }>,
    opts: { partial: boolean },
  ) => {
    if (!pendingReview) return
    const res = await fetch(`${apiBase()}api/week/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekStart: pendingReview.weekStart, outcomes, partial: opts.partial }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || 'Could not save that just now. Try again in a moment.')
    }

    const remaining = await loadPendingReview().catch(() => null)
    setPendingReview(remaining)
    if (!remaining || remaining.weekStart !== pendingReview.weekStart) setFullScreen(null)
  }

  /** "Don't ask about this week" — closes the week with nothing recorded. */
  const dismissWeekForever = async () => {
    if (!pendingReview) return
    const res = await fetch(`${apiBase()}api/week/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekStart: pendingReview.weekStart, outcomes: [], dismiss: true }),
    })
    if (!res.ok) throw new Error('Could not do that just now. Try again in a moment.')
    setPendingReview(await loadPendingReview().catch(() => null))
    setFullScreen(null)
  }

  const reviewRecipes = pendingReview
    ? pendingReview.recipeIds
        .map((id) => allRecipes.find((r) => r.id === id))
        .filter((r): r is Recipe => Boolean(r))
    : []
  const { activeWeekStart } = useStore(weekState)
  const currentRecipes = useStore(currentWeekRecipes)
  const groceryNeedsRegen = useStore($groceryNeedsRegen)
  const [viewMode, setViewMode] = useState<'raw' | 'ai'>('raw')
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

  // `allRecipes` comes from the list endpoint, which projects away `structuredIngredients` (see
  // toListRecipe). The grocery list needs them, so fetch the full documents for just this week's
  // recipes — a handful, not the whole library.
  const plannedIds = useMemo(() => groceryRecipes.map((r) => r.id), [groceryRecipes])
  const { recipes: fullGroceryRecipes } = useFullRecipes(plannedIds)

  // Prefer the full document wherever it has arrived; fall back to the list-shaped recipe so the
  // list still renders (with degraded ingredient data) while the fetch is in flight.
  const groceryRecipesForList = useMemo(() => {
    const byId = new Map(fullGroceryRecipes.map((r) => [r.id, r]))
    return groceryRecipes.map((r) => byId.get(r.id) ?? r)
  }, [groceryRecipes, fullGroceryRecipes])

  // Raw view's ingredients — same ShoppableIngredient shape Smart uses, rendered through the
  // same <GroceryList> with mergeIngredients={false} so it looks and behaves identically, just
  // without combining the same ingredient across recipes.
  const rawIngredients = useMemo(
    () => buildRawShoppableIngredients(groceryRecipesForList),
    [groceryRecipesForList],
  )

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

  // Check for stuck processing
  const [isStuck, setIsStuck] = useState(false)

  useEffect(() => {
    if (aiGroceryList?.status === 'processing' && aiGroceryList.updatedAt) {
      // Re-evaluated every time `aiGroceryList` changes, not just on the interval — a retry
      // writes a fresh 'processing' doc with a recent `updatedAt`, and without evaluating
      // immediately here, `isStuck` (once true) never clears on that same 'processing' status,
      // since the branch below only clears it when status moves away from 'processing'. That
      // left the UI stuck showing "Generation Timed Out" even while a retry was progressing
      // normally underneath.
      const check = () =>
        setIsStuck(
          isGroceryGenerationStuck(aiGroceryList.status, aiGroceryList.updatedAt, Date.now()),
        )

      // Defer the initial check to the next tick — calling setState synchronously within an
      // effect body (rather than from a timer/subscription callback) can trigger cascading
      // renders (react-hooks/set-state-in-effect).
      const initial = setTimeout(check, 0)
      const interval = setInterval(check, 1000)
      return () => {
        clearTimeout(initial)
        clearInterval(interval)
      }
    }

    const reset = setTimeout(() => setIsStuck(false), 0)
    return () => clearTimeout(reset)
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

  // Auto-trigger when opening grocery tab if no list exists and not processing,
  // or when a new recipe was added to the current week (groceryNeedsRegen flag).
  useEffect(() => {
    if (activeTab === 'grocery' && user && groceryRecipes.length > 0 && !aiLoading) {
      // Allow generation even with firestoreError — the error is often caused by
      // the document not existing yet (family scope). Once generation creates the
      // document, the subscription will resolve on its own.
      const weekNeedsRegen = groceryNeedsRegen === activeWeekStart
      const needsGeneration = (!aiGroceryList || weekNeedsRegen) && !isProcessing && !isStuck

      if (needsGeneration) {
        // Clear the regen flag before triggering so we don't loop
        if (weekNeedsRegen) {
          $groceryNeedsRegen.set(null)
        }
        triggerGroceryGeneration(activeWeekStart, groceryRecipes, scopeId!)
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
    groceryNeedsRegen,
  ])

  // Auto-switch to AI view when smart list becomes ready
  const [userToggledRaw, setUserToggledRaw] = useState(false)

  // Derived view mode: show Smart List unless user explicitly chose Raw. Raw is always the
  // fallback (not just the pre-Smart default) — it's read directly from recipes already in
  // memory, so it can't fail the way an AI-generated Smart list can. See GROCERY-LIST-V2-PLAN.md.
  const effectiveViewMode = useMemo(() => {
    if (userToggledRaw) return viewMode
    if (hasSmartList) return 'ai'
    return 'raw'
  }, [userToggledRaw, hasSmartList, viewMode])

  // Share/Copy grocery list — reflects whichever view is currently showing.
  const buildGroceryText = () => {
    if (effectiveViewMode === 'ai' && hasSmartList && aiGroceryList) {
      return aiGroceryList.ingredients
        .map((item) => `- ${item.purchaseAmount} ${item.purchaseUnit} ${item.name}`)
        .join('\n')
    }
    return groceryRecipes
      .map((recipe) => {
        const lines =
          Array.isArray(recipe.structuredIngredients) && recipe.structuredIngredients.length > 0
            ? recipe.structuredIngredients.map(
                (i) => i.original || `${i.amount} ${i.unit} ${i.name}`,
              )
            : (recipe.ingredients || []).map((i) => (i.amount ? `${i.amount} ${i.name}` : i.name))
        return `${recipe.title}\n${lines.map((l) => `- ${l}`).join('\n')}`
      })
      .join('\n\n')
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
          return (
            <div className="touch-manipulation border-b border-border bg-muted/20 px-4 py-2.5">
              <Inline spacing="sm" justify="between" align="center" className="mx-auto max-w-2xl">
                {/* Raw / Smart toggle */}
                <div className="flex items-center rounded-full border border-border bg-background p-0.5">
                  <button
                    onClick={() => {
                      setViewMode('raw')
                      setUserToggledRaw(true)
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                      effectiveViewMode === 'raw'
                        ? 'bg-foreground text-background shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Raw
                  </button>
                  <button
                    onClick={() => {
                      if (hasSmartList) {
                        setViewMode('ai')
                        setUserToggledRaw(false)
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
                          triggerGroceryGeneration(activeWeekStart, groceryRecipes, scopeId)
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
                      // The server now writes progress/message directly to Firestore as it
                      // generates (see generate-grocery-list.ts), so this reflects reality from
                      // any tab/device — not just the one that happened to trigger it.
                      aiGroceryList?.progress ?? (aiGroceryList?.status === 'processing' ? 5 : 0)
                    }
                    message={
                      aiGroceryList?.message ||
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

      <AnimatePresence>
        {fullScreen === 'review' && pendingReview && (
          <WeekScreen
            key="review"
            title="How did last week go?"
            subtitle={formatWeekRange(pendingReview.weekStart)}
            onBack={() => setFullScreen(null)}
          >
            <WeekReviewPrompt
              recipes={reviewRecipes}
              onSubmit={submitWeekReview}
              onDismiss={() => setFullScreen(null)}
              onDismissWeek={dismissWeekForever}
            />
          </WeekScreen>
        )}

        {fullScreen === 'suggest' && (
          <WeekScreen
            key="suggest"
            title="Help me pick"
            subtitle="A few ideas from your own recipes"
            onBack={() => setFullScreen(null)}
            scroll={false}
          >
            <SuggesterConversation
              allRecipes={allRecipes}
              plannedIds={currentRecipes.map((r) => r.recipeId)}
              // The boolean matters: the suggester removes the card and counts it as added
              // before this resolves, so it needs to know when to put it back.
              onAdd={(recipeId) => addRecipeToWeek(recipeId)}
              onRemoveFromWeek={(recipeId) => removeRecipeFromWeek(recipeId)}
              onOpenRecipe={onSelectRecipe}
              onDone={() => setFullScreen(null)}
              prefetched={prefetchedTurn}
            />
          </WeekScreen>
        )}
      </AnimatePresence>

      {/* Content area: scrolls everything inside */}
      <div className="flex-1 overflow-y-auto pb-tab-bar">
        {activeTab === 'plan' && (
          <WeekPlanView
            currentRecipes={currentRecipes}
            allRecipes={allRecipes}
            onSelectRecipe={onSelectRecipe}
            onAddRecipe={() => onClose()}
            reviewWeek={reviewRecipes.length ? pendingReview?.weekStart : null}
            onOpenReview={() => setFullScreen('review')}
            onOpenSuggester={() => setFullScreen('suggest')}
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
                        triggerGroceryGeneration(activeWeekStart, groceryRecipes, scopeId)
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

            {effectiveViewMode === 'ai' && hasSmartList && aiGroceryList ? (
              <GroceryList
                ingredients={aiGroceryList.ingredients}
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
            ) : (
              // Same component as Smart — same category headers, row layout, checkboxes — just
              // fed uncombined per-recipe items (mergeIngredients={false}). weekStartDate/userId
              // deliberately omitted: editing/adding writes to the Firestore grocery_lists doc,
              // which doesn't apply to Raw's on-the-fly-derived, non-persisted ingredients.
              <GroceryList
                ingredients={rawIngredients}
                mergeIngredients={false}
                isLoading={false}
                onClose={() => setActiveTab('plan')}
                recipes={groceryRecipes}
                onOpenRecipe={onSelectRecipe}
                embedded={true}
              />
            )}
          </>
        )}
      </div>
      {/* LoadingOverlay removed for progressive enhancement */}
    </motion.div>
  )
}

import React, { useState, useEffect, useRef, Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

import { RecipeHeader } from './RecipeHeader'
import { FamilySetup } from './FamilySetup'
import type { Recipe, FamilyRecipeData } from '../../lib/types'

// --- Hooks ---
import { useRecipes } from './hooks/useRecipes'
import { useBootstrap } from './hooks/useBootstrap'
import { useIdentityResolution } from './hooks/useIdentityResolution'
import { useFilteredRecipes } from './hooks/useFilteredRecipes'
import { useFirebaseAuthSync } from '../../lib/useFirebaseAuthSync'

import { useRecipeActions } from './hooks/useRecipeActions'
import { useRouter } from './hooks/useRouter'
import { useRecipeHandlers } from './hooks/useRecipeHandlers'
import { useRecipeContext } from './hooks/useRecipeContext'
import { useFamilySync } from './hooks/useFamilySync'
import { useScrollBroadcaster } from './hooks/useScrollBroadcaster'

import { useStore } from '@nanostores/react'
import {
  currentWeekRecipes,
  addRecipeToWeek,
  removeRecipeFromWeek,
  isPlannedForActiveWeek,
} from '../../lib/weekStore'
import { familyActions, $currentFamily } from '../../lib/familyStore'
import { recipeActions } from '../../lib/recipeStore'
// --- Sub-Components ---
import { RecipeManagerView } from './RecipeManagerView'
import { RecipeLibrary } from './RecipeLibrary'
import { RecipeFilters } from './RecipeFilters'
import { RecipeControlBar } from './RecipeControlBar'
import { ShareRecipeDialog } from './dialogs/ShareRecipeDialog'

import { CalendarPicker } from './week-planner/CalendarPicker'
import { BottomTabBar } from './BottomTabBar'

import { ResponsiveModal } from '../ui/ResponsiveModal'

// ViewMode is now imported from useRouter

// Code-split: the week planner and the recipe editor are each only needed
// once the user navigates away from the library view.
const WeekWorkspace = React.lazy(() =>
  import('./week-planner/WeekWorkspace').then((m) => ({ default: m.WeekWorkspace })),
)
const RecipeEditor = React.lazy(() =>
  import('./RecipeEditor').then((m) => ({ default: m.RecipeEditor })),
)

const ViewLoadingFallback: React.FC = () => (
  <div data-testid="loading-indicator" className="flex h-full items-center justify-center bg-card">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
)

interface RecipeManagerProps {
  user?: string | null
  isAdmin?: boolean
}

// --- MAIN COMPONENT ---
const RecipeManager: React.FC<RecipeManagerProps> = ({ user, isAdmin }) => {
  // Boot-time data (recipes, planned, family, user identity) now all come from a single
  // `GET /api/bootstrap` call — see PERFORMANCE-PLAN.md P6+P7. `user`/`isAdmin` are SSR defaults
  // from `[...path].astro` (which no longer blocks on Firestore — `user` is just the raw
  // `site_user` cookie value and `isAdmin` is a cheap cookie-derived best guess);
  // `useIdentityResolution` reconciles those placeholders with the Firestore-verified
  // `bootstrapUser` once it arrives, without ever flashing the wrong screen for a returning user.
  const { user: bootstrapUser } = useBootstrap()
  const { currentUser, isAdmin: computedIsAdmin } = useIdentityResolution({
    initialUser: user,
    initialIsAdmin: isAdmin,
    bootstrapUser,
  })

  const { recipes, setRecipes, loading, initialized, error, refreshRecipes, getBaseUrl } =
    useRecipes({ skipInitialFetch: true })

  // Sync server session with Firebase client SDK for Firestore subscriptions
  useFirebaseAuthSync()

  // Use the extracted family sync logic
  const { showFamilySetup, setShowFamilySetup, showSyncNotification, setShowSyncNotification } =
    useFamilySync()

  // Track last known family update timestamp for efficient sync
  const [lastKnownUpdate, setLastKnownUpdate] = useState<string | null>(null)

  // Background sync check for family changes (optimized with version stamp)
  useEffect(() => {
    if (loading) return

    const family = $currentFamily.get()
    if (!family) return

    // Initialize with current family's lastUpdated
    if (!lastKnownUpdate && family.lastUpdated) {
      setLastKnownUpdate(family.lastUpdated)
    }

    const checkForUpdates = async () => {
      try {
        // Only fetch the family document (1 read) to check the "flag"
        const res = await fetch('/protected/recipes/api/families/current')
        const data = await res.json()

        if (data.success && data.family?.lastUpdated) {
          const serverTimestamp = data.family.lastUpdated
          const localTimestamp = lastKnownUpdate

          // If timestamps differ, there are changes
          if (serverTimestamp !== localTimestamp) {
            setShowSyncNotification(true)
          }
        }
      } catch {
        // Ignore errors silently
      }
    }

    // Check every 30 seconds
    const interval = setInterval(checkForUpdates, 30000)
    return () => clearInterval(interval)
  }, [loading, lastKnownUpdate, setShowSyncNotification])

  // Use new Router Hook
  const {
    view,
    activeRecipeId,
    searchQuery: initialSearchQuery,
    setView,
    setRecipe,
    setSearch,
    setRoute,
  } = useRouter()

  const activeWeekPlanned = useStore(currentWeekRecipes)

  // Use the extracted context logic for source list and selected recipe
  const { selectedRecipe, sourceRecipes } = useRecipeContext(
    recipes,
    view,
    activeRecipeId,
    activeWeekPlanned,
  )

  // Hooks
  const {
    filtersOpen,
    setFiltersOpen,
    filters,
    setFilters,
    sort,
    setSort,
    searchQuery,
    setSearchQuery,
    processedRecipes,
  } = useFilteredRecipes(sourceRecipes, view)

  // Sync Router Search to Filter Hook
  useEffect(() => {
    if (initialSearchQuery !== searchQuery) {
      setSearchQuery(initialSearchQuery)
    }
  }, [initialSearchQuery, searchQuery, setSearchQuery])

  // Update Router when Filter Search changes (debounced by hook usually, but here direct)
  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    setSearch(query)
  }

  // Scroll Container Ref State & Broadcaster
  const { scrollContainer, setScrollContainer } = useScrollBroadcaster()

  const [isSearchMode, setIsSearchMode] = useState(false)

  // Mobile detection for contained scroll mode (fixes sticky headers with keyboard)
  const [isMobile, setIsMobile] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const useContainedScroll = isSearchMode && isMobile

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Visual Viewport logic for iOS Keyboard
  const [viewportHeight, setViewportHeight] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (!useContainedScroll) {
      setViewportHeight(undefined)
      return
    }

    const handleResize = () => {
      // Basic fallback
      let height = window.innerHeight

      // Robust Visual Viewport support for iOS
      if (window.visualViewport) {
        height = window.visualViewport.height
      }

      setViewportHeight(height)
    }

    // Initial check
    handleResize()

    // Listen to both window resize and visualViewport resize
    window.addEventListener('resize', handleResize)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize)
      window.visualViewport.addEventListener('scroll', handleResize)
    }

    return () => {
      window.removeEventListener('resize', handleResize)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize)
        window.visualViewport.removeEventListener('scroll', handleResize)
      }
    }
  }, [useContainedScroll])

  // Switch scroll container when entering/exiting contained scroll mode
  useEffect(() => {
    if (useContainedScroll && scrollContainerRef.current) {
      setScrollContainer(scrollContainerRef.current)
    } else {
      setScrollContainer(typeof window !== 'undefined' ? window : null)
    }
  }, [useContainedScroll, setScrollContainer])

  // Lock body scroll when in contained scroll mode (required for iOS Safari)
  // Uses position:fixed + top:-scrollY pattern to prevent page-jump on iOS.
  useEffect(() => {
    if (useContainedScroll) {
      const scrollY = window.scrollY
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
    } else {
      const scrollY = parseInt(document.body.style.top || '0', 10) * -1
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      if (scrollY) window.scrollTo(0, scrollY)
    }
    return () => {
      const scrollY = parseInt(document.body.style.top || '0', 10) * -1
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      if (scrollY) window.scrollTo(0, scrollY)
    }
  }, [useContainedScroll])

  const { saveRecipe, deleteRecipe } = useRecipeActions({
    recipes,
    setRecipes,
    getBaseUrl,
  })

  // Smart Suggestion State

  // Meal Planner State
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  // Share State
  const [shareRecipe, setShareRecipe] = useState<Recipe | null>(null)

  // One-tap toggle: recipes are added to (or removed from) the active week — no day picker.
  const handleAddToWeek = async (recipeId: string) => {
    if (isPlannedForActiveWeek(recipeId)) {
      await removeRecipeFromWeek(recipeId)
    } else {
      await addRecipeToWeek(recipeId)
    }
  }

  // `recipe` here comes straight from the library/week store, which since PERFORMANCE-PLAN.md P3
  // may be a slim list record (no `steps`/full `ingredients`). This dialog is reachable directly
  // from the library/week management sheets — bypassing RecipeDetail's own hydration gate — and
  // both the text share and PDF export (share-recipe.ts, RecipePdfDocument.tsx) read
  // `recipe.steps` unconditionally, so hydrate first if needed.
  const handleShareRecipe = async (recipe: Recipe) => {
    if (recipe.steps === undefined) {
      try {
        const res = await fetch(`${getBaseUrl()}api/recipes/${recipe.id}`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (data.recipe) {
            recipeActions.updateRecipe(data.recipe)
            setShareRecipe(data.recipe)
            return
          }
        }
      } catch (error) {
        console.warn('Failed to hydrate recipe before sharing:', error)
      }
    }
    setShareRecipe(recipe)
  }

  const family = useStore($currentFamily)

  // Listen for settings navigation from burger menu
  useEffect(() => {
    const handleNavigateToFamilySettings = () => {
      console.log('DEBUG: Navigate to Family Settings Triggered')
      setView('family-settings')
    }
    const handleNavigateToAdminDashboard = () => setView('admin-dashboard')

    window.addEventListener('navigate-to-family-settings', handleNavigateToFamilySettings)
    window.addEventListener('navigate-to-admin-dashboard', handleNavigateToAdminDashboard)

    const handleNavigateToInvite = () => setView('invite')

    window.addEventListener('navigate-to-invite', handleNavigateToInvite)

    return () => {
      window.removeEventListener('navigate-to-family-settings', handleNavigateToFamilySettings)
      window.removeEventListener('navigate-to-admin-dashboard', handleNavigateToAdminDashboard)
      window.removeEventListener('navigate-to-invite', handleNavigateToInvite)
    }
  }, [setView])

  // Self-Correction: Clean up ghost recipes from week plan
  // If a recipe is in the plan but not in the loaded recipes list, remove it.
  useEffect(() => {
    if (loading || recipes.length === 0) return

    import('../../lib/weekStore').then(({ allPlannedRecipes, unplanRecipe }) => {
      const allPlanned = allPlannedRecipes.get()
      const recipeIds = new Set(recipes.map((r) => r.id))

      allPlanned.forEach((p) => {
        if (!recipeIds.has(p.recipeId)) {
          unplanRecipe(p.recipeId)
        }
      })
    })
  }, [loading, recipes])

  // Actions & Handlers (Refactored to Hook)
  const { handleSaveRecipe, handleDeleteRecipe, handleUpdateRecipe } = useRecipeHandlers({
    setRecipes,
    saveRecipe,
    deleteRecipe,
    setRecipe,
    setView,
    selectedRecipe,
  })

  // --- RENDER ---

  return (
    <>
      <RecipeManagerView
        view={view}
        loading={loading}
        initialized={initialized}
        error={error}
        selectedRecipe={selectedRecipe}
        user={user ?? undefined}
        isAdmin={!!computedIsAdmin}
        handleUpdateRecipe={handleUpdateRecipe}
        handleDeleteRecipe={handleDeleteRecipe}
        handleAddToWeek={handleAddToWeek}
        refreshRecipes={refreshRecipes}
        setView={setView}
        setRoute={setRoute}
        family={family}
      >
        {/* Full-width Header Shell */}
        {!isSearchMode && <RecipeHeader onAddRecipe={() => setView('edit')} />}

        <div
          data-search-mode={isSearchMode ? 'true' : undefined}
          data-scroll-mode={useContainedScroll ? 'contained' : undefined}
          ref={useContainedScroll ? scrollContainerRef : undefined}
          className={
            useContainedScroll
              ? 'fixed inset-0 z-40 mx-auto flex w-full max-w-2xl flex-col overflow-y-auto overscroll-contain bg-card text-foreground'
              : 'relative mx-auto flex min-h-full w-full max-w-2xl flex-col overflow-visible bg-card pt-header text-foreground'
          }
          style={
            useContainedScroll
              ? {
                  WebkitOverflowScrolling: 'touch',
                  height: viewportHeight ? `${viewportHeight}px` : '100%',
                }
              : undefined
          }
        >
          {view !== 'week' && (
            <RecipeFilters
              isOpen={filtersOpen}
              onClose={() => setFiltersOpen(false)}
              filters={filters}
              setFilters={setFilters}
              sort={sort}
              setSort={setSort}
              searchQuery={searchQuery}
              setSearchQuery={handleSearchChange}
            />
          )}

          {view !== 'week' && (
            <RecipeControlBar
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              onClearSearch={() => handleSearchChange('')}
              onOpenFilters={() => setFiltersOpen(true)}
              activeFilterCount={
                (filters.protein?.length || 0) +
                (filters.difficulty?.length || 0) +
                (filters.cuisine?.length || 0)
              }
              isSearchMode={isSearchMode}
              onSearchExpandedChange={setIsSearchMode}
              isContainedScroll={useContainedScroll}
            />
          )}

          <main className="relative flex-1 scroll-smooth pb-tab-bar">
            {view === 'library' && (
              <div className={useContainedScroll ? 'flex flex-col' : 'flex h-full flex-col'}>
                <div className={useContainedScroll ? '' : 'scrollbar-hide flex-1'}>
                  <RecipeLibrary
                    recipes={processedRecipes}
                    sort={sort}
                    onSelectRecipe={(r) => setRoute({ activeRecipeId: r.id, view: 'detail' })}
                    onToggleThisWeek={(id) => handleAddToWeek(id)}
                    hasSearch={!!searchQuery}
                    scrollContainer={scrollContainer}
                    onShare={handleShareRecipe}
                    isContainedScroll={useContainedScroll}
                  />
                </div>
              </div>
            )}

            {/* Week View with slide-up animation */}
            <AnimatePresence>
              {view === 'week' && (
                <Suspense fallback={<ViewLoadingFallback />}>
                  <WeekWorkspace
                    recipes={processedRecipes}
                    allRecipes={recipes}
                    onClose={() => setView('library')}
                    onMinimize={() => setView('library')}
                    onOpenCalendar={() => setIsCalendarOpen(true)}
                    onSelectRecipe={(r) => setRoute({ activeRecipeId: r.id, view: 'detail' })}
                    scrollContainer={scrollContainer}
                    onShare={handleShareRecipe}
                    initialTab="plan"
                    user={currentUser}
                  />
                </Suspense>
              )}
            </AnimatePresence>
          </main>
        </div>
      </RecipeManagerView>

      {/* Primary Tab Bar — hidden on drilldown views */}
      {(view === 'library' || view === 'week') && (
        <BottomTabBar
          activeTab={view === 'week' ? 'week' : 'library'}
          onTabChange={(tab) => setView(tab === 'week' ? 'week' : 'library')}
        />
      )}

      {/* --- GLOBAL OVERLAYS (Outside View) --- */}

      <ResponsiveModal
        isOpen={view === 'edit'}
        onClose={() => setView('library')}
        title={selectedRecipe?.id ? 'Edit Recipe' : 'New Recipe'}
      >
        <Suspense fallback={<ViewLoadingFallback />}>
          <RecipeEditor
            recipe={selectedRecipe || {}}
            onSave={handleSaveRecipe}
            onCancel={() => setView('library')}
            onDelete={handleDeleteRecipe}
            isEmbedded={true}
            onView={(id) => setRoute({ activeRecipeId: id, view: 'detail' })}
          />
        </Suspense>
      </ResponsiveModal>

      {/* Meal Planner Modals */}
      <CalendarPicker isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} />

      {/* Invitation Modal - DEPRECATED: Now handled in FamilyManagementView */}

      {/* Family Setup Modal */}
      <FamilySetup
        open={showFamilySetup}
        onComplete={() => {
          setShowFamilySetup(false)
          // Reload family data after setup
          fetch('/protected/recipes/api/families/current')
            .then((res) => res.json())
            .then((data) => {
              if (data.success) {
                familyActions.setFamily(data.family)
                familyActions.setMembers(data.members || [])
              }
            })
            .catch((err) => console.error('Failed to reload family:', err))
        }}
      />

      {/* Family Sync Notification Toast */}
      <AnimatePresence>
        {showSyncNotification && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className="fixed bottom-[calc(var(--tab-bar-height)+env(safe-area-inset-bottom)+0.5rem)] left-1/2 z-50 -translate-x-1/2 transform"
          >
            <div className="flex items-center gap-3 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-lg">
              <span className="text-sm font-medium">Family updates available</span>
              <button
                onClick={async () => {
                  setShowSyncNotification(false)
                  // Reload week data and update timestamp
                  try {
                    // First get the new timestamp
                    const familyRes = await fetch('/protected/recipes/api/families/current')
                    const familyData = await familyRes.json()
                    if (familyData.success && familyData.family?.lastUpdated) {
                      setLastKnownUpdate(familyData.family.lastUpdated)
                    }

                    // Then fetch the full week data
                    const res = await fetch('/protected/recipes/api/week/planned')
                    const data = await res.json()
                    if (data.success && data.planned) {
                      data.planned.forEach((item: FamilyRecipeData) => {
                        familyActions.setRecipeFamilyData(item.id, item)
                      })
                    }
                  } catch (e) {
                    console.error('Failed to refresh:', e)
                  }
                }}
                className="rounded-full bg-primary-foreground/20 px-3 py-1 text-xs font-bold hover:bg-primary-foreground/30"
              >
                Refresh
              </button>
              <button
                onClick={() => setShowSyncNotification(false)}
                className="ml-1 text-primary-foreground/70 hover:text-primary-foreground"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Recipe Dialog */}
      <ShareRecipeDialog
        recipe={shareRecipe}
        open={!!shareRecipe}
        onOpenChange={(open: boolean) => !open && setShareRecipe(null)}
      />
    </>
  )
}

export default RecipeManager

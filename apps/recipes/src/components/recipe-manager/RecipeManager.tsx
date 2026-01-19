import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { VarietyWarning } from './VarietyWarning'

import { RecipeEditor } from './RecipeEditor'
import { RecipeHeader } from './RecipeHeader'
import { BulkEditModal } from './dialogs/BulkEditModal'
import { FamilySetup } from './FamilySetup'
import type { Recipe, FamilyRecipeData } from '../../lib/types'

// --- Hooks ---
import { useRecipes } from './hooks/useRecipes'
import { useFilteredRecipes } from './hooks/useFilteredRecipes'
import { useGroceryListGenerator } from './hooks/useGroceryListGenerator'

import { useRecipeSelection } from './hooks/useRecipeSelection'
import { useRecipeActions } from './hooks/useRecipeActions'
import { useRouter, type ViewMode } from './hooks/useRouter'
import { useRecipeHandlers } from './hooks/useRecipeHandlers'
import { useRecipeContext } from './hooks/useRecipeContext'
import { useFamilySync } from './hooks/useFamilySync'
import { useScrollBroadcaster } from './hooks/useScrollBroadcaster'

import { checkAndRunRollover } from '../../lib/week-rollover'
import { useStore } from '@nanostores/react'
import { currentWeekRecipes } from '../../lib/weekStore'
import { familyActions, $currentFamily } from '../../lib/familyStore'
import { alert, confirm } from '../../lib/dialogStore'
import { $reminders, checkReminders } from '../../lib/remindersStore'
import { Bell, X } from 'lucide-react'

// --- Sub-Components ---
import { RecipeManagerView } from './RecipeManagerView'
import { RecipeLibrary } from './RecipeLibrary'
import { RecipeFilters } from './RecipeFilters'
import { RecipeControlBar } from './RecipeControlBar'
import { ShareRecipeDialog } from './dialogs/ShareRecipeDialog'

import { DayPicker } from './week-planner/DayPicker'
import { CalendarPicker } from './week-planner/CalendarPicker'
import { WeekContextBar } from './week-planner/WeekContextBar'
import { WeekWorkspace } from './week-planner/WeekWorkspace'

import { ResponsiveModal } from '../ui/ResponsiveModal'
import { CookingStatusIndicator } from '../cooking-mode/CookingStatusIndicator'
import { $cookingSession } from '../../stores/cookingSession'

// ViewMode is now imported from useRouter

interface ProteinWarning {
  protein: string
  count: number
}

interface RecipeManagerProps {
  user?: string | null
  isAdmin?: boolean
  hasOnboarded?: boolean
}

// --- Onboarding ---

// --- MAIN COMPONENT ---
const RecipeManager: React.FC<RecipeManagerProps> = ({ user, isAdmin, hasOnboarded }) => {
  const [currentUser, setCurrentUser] = useState(user)
  const isTestUser = user === 'TestUser' || user === 'test_user'
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(hasOnboarded || isTestUser)
  const computedIsAdmin =
    isAdmin ||
    (isTestUser &&
      typeof window !== 'undefined' &&
      (window as unknown as { isPlaywright: boolean }).isPlaywright)

  // Sync prop changes
  useEffect(() => {
    if (user) setCurrentUser(user)
  }, [user])

  useEffect(() => {
    const isTest = user === 'TestUser' || user === 'test_user'
    let state = hasOnboarded || isTest

    if (typeof window !== 'undefined') {
      const { search } = window.location
      if (search.includes('force_onboarding=true')) state = false
      else if (search.includes('skip_onboarding=true')) state = true
    }

    setIsOnboardingComplete(state)
  }, [hasOnboarded, user])

  const { recipes, setRecipes, loading, error, refreshRecipes, getBaseUrl } = useRecipes()

  // Use the extracted family sync logic
  const { showFamilySetup, setShowFamilySetup, showSyncNotification, setShowSyncNotification } =
    useFamilySync()

  // Load planned recipes logic (kept in component for now as it's recipe-specific)
  useEffect(() => {
    if (loading) return

    const loadPlannedRecipes = async () => {
      try {
        const res = await fetch('/protected/recipes/api/week/planned')
        const data = await res.json()
        if (data.success && data.planned) {
          data.planned.forEach((item: FamilyRecipeData) => {
            familyActions.setRecipeFamilyData(item.id, item)
          })
        }
      } catch (e) {
        console.error('Failed to load planned recipes:', e)
      }
    }

    loadPlannedRecipes()
  }, [loading])

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

  const { groceryItems, isGenerating, handleGenerateList, targetRecipes } = useGroceryListGenerator(
    recipes,
    (v: string) => setView(v as ViewMode),
  )

  // Auto-generate grocery list when entering Shop tab
  useEffect(() => {
    if (view === 'grocery' && recipes.length > 0) {
      handleGenerateList()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  // Scroll Container Ref State & Broadcaster
  const { scrollContainer } = useScrollBroadcaster()

  // Hooks
  const { isSelectionMode, setIsSelectionMode, selectedIds, toggleSelection, clearSelection } =
    useRecipeSelection()
  const [showBulkEdit, setShowBulkEdit] = useState(false)
  const [isSearchMode, setIsSearchMode] = useState(false)

  const { saveRecipe, deleteRecipe, toggleFavorite, bulkUpdateRecipes, bulkDeleteRecipes } =
    useRecipeActions({
      recipes,
      setRecipes,
      refreshRecipes,
      getBaseUrl,
    })

  // Smart Suggestion State
  const [proteinWarning, setProteinWarning] = useState<ProteinWarning | null>(null)

  // Meal Planner State
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [dayPickerRecipeId, setDayPickerRecipeId] = useState<string | null>(null)

  // Share State
  const [shareRecipe, setShareRecipe] = useState<Recipe | null>(null)

  const handleAddToWeek = (recipeId: string) => {
    setDayPickerRecipeId(recipeId)
  }

  const family = useStore($currentFamily)

  // Listen for settings navigation from burger menu
  useEffect(() => {
    const handleNavigateToSettings = () => setView('settings')
    const handleNavigateToFeedbackDashboard = () => setView('feedback-dashboard')
    const handleNavigateToBulkImport = () => setView('bulk-import')
    const handleNavigateToFamilySettings = () => {
      console.log('DEBUG: Navigate to Family Settings Triggered')
      setView('family-settings')
    }
    const handleNavigateToAdminDashboard = () => setView('admin-dashboard')

    window.addEventListener('navigate-to-settings', handleNavigateToSettings)
    window.addEventListener('navigate-to-feedback-dashboard', handleNavigateToFeedbackDashboard)
    window.addEventListener('navigate-to-bulk-import', handleNavigateToBulkImport)
    window.addEventListener('navigate-to-family-settings', handleNavigateToFamilySettings)
    window.addEventListener('navigate-to-admin-dashboard', handleNavigateToAdminDashboard)

    const handleNavigateToInvite = () => setView('invite')
    const handleNavigateToNotifications = () => setView('notifications')

    window.addEventListener('navigate-to-invite', handleNavigateToInvite)
    window.addEventListener('navigate-to-notifications', handleNavigateToNotifications)

    return () => {
      window.removeEventListener('navigate-to-settings', handleNavigateToSettings)
      window.removeEventListener(
        'navigate-to-feedback-dashboard',
        handleNavigateToFeedbackDashboard,
      )
      window.removeEventListener('navigate-to-bulk-import', handleNavigateToBulkImport)
      window.removeEventListener('navigate-to-family-settings', handleNavigateToFamilySettings)
      window.removeEventListener('navigate-to-admin-dashboard', handleNavigateToAdminDashboard)
      window.removeEventListener('navigate-to-invite', handleNavigateToInvite)
      window.removeEventListener('navigate-to-notifications', handleNavigateToNotifications)
    }
  }, [setView])

  // Run Rollover Check
  useEffect(() => {
    checkAndRunRollover()
  }, [])

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
  const {
    handleSaveRecipe,
    handleDeleteRecipe,
    handleUpdateRecipe,
    handleBulkDelete,
    handleBulkEdit,
    handleExport,
    handleUpdateProfile,
  } = useRecipeHandlers({
    recipes,
    setRecipes,
    saveRecipe,
    deleteRecipe,
    bulkUpdateRecipes,
    bulkDeleteRecipes,
    setRecipe,
    setView,
    selectedRecipe,
    selectedIds,
    clearSelection,
    setCurrentUser,
  })

  const handleBulkImportSave = async (recipes: Recipe[]) => {
    try {
      await Promise.all(
        recipes.map(async (r) => {
          const now = new Date().toISOString()
          const fullRecipe = {
            ...r,
            createdAt: now,
            updatedAt: now,
            versionHistory: [{ date: now, changeType: 'create' as const }],
            rating: 0,
            isFavorite: false,
          }
          await saveRecipe(fullRecipe as unknown as Partial<Recipe>)
        }),
      )
      refreshRecipes()
      await alert(`Successfully imported ${recipes.length} recipes!`)
      setView('library')
    } catch (e) {
      console.error(e)
      await alert('Failed to save some recipes.')
    }
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const result = event.target?.result as string
        const imported = JSON.parse(result)
        if (Array.isArray(imported)) {
          const existingIds = new Set(recipes.map((r) => r.id))
          const newRecipes = imported.filter((r) => !existingIds.has(r.id))
          setRecipes([...recipes, ...newRecipes])
          await alert(`Imported ${newRecipes.length} recipes.`)
        }
      } catch (err) {
        console.error(err)
        await alert('Failed to parse JSON.')
      }
    }
    reader.readAsText(file)
  }

  const handleDeleteAll = async () => {
    if (await confirm('DANGER: This will delete ALL your recipes permanently. Are you sure?')) {
      const allIds = new Set(recipes.map((r) => r.id))
      const success = await bulkDeleteRecipes(allIds)
      if (success) {
        setRecipes([])
        await alert('All recipes deleted.')
      } else {
        await alert('Failed to delete all recipes.')
      }
      setView('library')
    }
  }

  // Listen for Burger Menu events
  useEffect(() => {
    const handleToggleSelection = () => setIsSelectionMode((prev) => !prev)

    window.addEventListener('toggle-selection-mode', handleToggleSelection)
    return () => {
      window.removeEventListener('toggle-selection-mode', handleToggleSelection)
    }
  }, [setIsSelectionMode])

  // --- RENDER ---
  return (
    <>
      <RecipeManagerView
        view={view}
        loading={loading}
        error={error}
        showOnboarding={!isOnboardingComplete}
        selectedRecipe={selectedRecipe}
        user={user ?? undefined}
        isAdmin={!!computedIsAdmin}
        handleOnboardingComplete={() => setIsOnboardingComplete(true)}
        handleUpdateRecipe={handleUpdateRecipe}
        handleDeleteRecipe={handleDeleteRecipe}
        handleAddToWeek={handleAddToWeek}
        handleToggleFavorite={toggleFavorite}
        handleExport={handleExport}
        handleImport={handleImport}
        handleDeleteAll={handleDeleteAll}
        handleUpdateProfile={handleUpdateProfile}
        handleBulkImportSave={handleBulkImportSave}
        refreshRecipes={refreshRecipes}
        setView={setView}
        setRoute={setRoute}
        family={family}
        groceryItems={groceryItems}
        isGenerating={isGenerating}
        targetRecipes={targetRecipes}
      >
        <VarietyWarning warning={proteinWarning} onClose={() => setProteinWarning(null)} />

        {/* Full-width Header Shell */}
        <AnimatePresence>
          {!isSearchMode && (
            <motion.div
              initial={{ height: 'auto', opacity: 1 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="w-full"
            >
              <RecipeHeader
                user={currentUser ?? undefined}
                scrollContainer={scrollContainer}
                onAddRecipe={() => {
                  setRecipe(null)
                  setView('edit')
                }}
                onViewWeek={() => setView(view === 'week' ? 'library' : 'week')}
                isWeekView={view === 'week'}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="shadow-md-3 relative mx-auto flex min-h-full w-full max-w-2xl flex-col bg-card text-foreground">
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

          {view !== 'week' && !isSelectionMode && (
            <RecipeControlBar
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              onClearSearch={() => handleSearchChange('')}
              onOpenFilters={() => setFiltersOpen(true)}
              activeFilterCount={
                (filters.protein?.length || 0) +
                (filters.difficulty?.length || 0) +
                (filters.cuisine?.length || 0) +
                (filters.onlyFavorites ? 1 : 0)
              }
              isSearchMode={isSearchMode}
              onSearchExpandedChange={setIsSearchMode}
            />
          )}

          <main className="relative flex-1 scroll-smooth pb-32">
            {view === 'library' && (
              <div className="flex h-full flex-col">
                <div className="scrollbar-hide flex-1">
                  {!isSelectionMode && recipes.length > 0 && null}

                  <RecipeLibrary
                    recipes={processedRecipes}
                    sort={sort}
                    onSelectRecipe={(r) => {
                      if (isSelectionMode) {
                        toggleSelection(r.id)
                      } else {
                        setRoute({ activeRecipeId: r.id, view: 'detail' })
                      }
                    }}
                    onToggleThisWeek={(id) => handleAddToWeek(id)}
                    isSelectionMode={isSelectionMode}
                    selectedIds={selectedIds}
                    hasSearch={!!searchQuery}
                    scrollContainer={scrollContainer}
                    onShare={(recipe) => setShareRecipe(recipe)}
                  />
                </div>
              </div>
            )}

            {/* Week View with slide-up animation */}
            <AnimatePresence>
              {view === 'week' && (
                <WeekWorkspace
                  recipes={processedRecipes}
                  allRecipes={recipes}
                  onClose={() => setView('library')}
                  onOpenCalendar={() => setIsCalendarOpen(true)}
                  onSelectRecipe={(r) => setRoute({ activeRecipeId: r.id, view: 'detail' })}
                  scrollContainer={scrollContainer}
                  onShare={(recipe) => setShareRecipe(recipe)}
                />
              )}
            </AnimatePresence>
          </main>
        </div>

        {/* Week Context Bar (Sticky Bottom) - Only for Main Views */}
        {(view === 'library' || view === 'grocery') && !isSelectionMode && (
          <WeekContextBar
            onOpenCalendar={() => setIsCalendarOpen(true)}
            onViewWeek={() => setView('week')}
          />
        )}
      </RecipeManagerView>

      {/* --- GLOBAL OVERLAYS (Outside View) --- */}

      {showBulkEdit && (
        <BulkEditModal
          selectedCount={selectedIds.size}
          onClose={() => setShowBulkEdit(false)}
          onSave={handleBulkEdit}
        />
      )}

      {/* Edit/Add Recipe Modal */}
      <ResponsiveModal
        isOpen={view === 'edit'}
        onClose={() => setView('library')}
        title={selectedRecipe?.id ? 'Edit Recipe' : 'New Recipe'}
      >
        <RecipeEditor
          recipe={selectedRecipe || {}}
          onSave={handleSaveRecipe}
          onCancel={() => setView('library')}
          onDelete={handleDeleteRecipe}
          isEmbedded={true}
        />
      </ResponsiveModal>

      {/* Meal Planner Modals */}
      <DayPicker
        isOpen={!!dayPickerRecipeId}
        onClose={() => setDayPickerRecipeId(null)}
        recipeId={dayPickerRecipeId || ''}
        recipeTitle={recipes.find((r) => r.id === dayPickerRecipeId)?.title || ''}
      />
      <CalendarPicker isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} />

      {/* Sticky Bottom Actions (Selection Mode) */}
      {isSelectionMode && (
        <div className="fixed bottom-8 left-0 right-0 z-50 flex items-center justify-between border-t border-border bg-background/95 px-6 py-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] backdrop-blur-sm animate-in slide-in-from-bottom-5">
          <span className="text-sm font-bold text-muted-foreground">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => clearSelection()}
              className="text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <div className="h-4 w-px bg-border" />
            <button
              onClick={() => setShowBulkEdit(true)}
              className="text-sm font-bold text-primary hover:text-primary/80"
            >
              Edit
            </button>
            <button
              onClick={handleBulkDelete}
              className="rounded-full bg-destructive/10 px-4 py-2 text-sm font-bold text-destructive hover:bg-destructive/20"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Global Cooking Status Indicator (Mini Player) */}
      {view !== 'detail' && (
        <CookingStatusIndicator
          onResume={() => {
            const session = $cookingSession.get()
            if (session.recipeId) {
              setRoute({ activeRecipeId: session.recipeId, view: 'detail' })
            }
          }}
        />
      )}

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
            className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 transform"
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
                className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold hover:bg-white/30"
              >
                Refresh
              </button>
              <button
                onClick={() => setShowSyncNotification(false)}
                className="ml-1 text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reminder Toast */}
      <ReminderToast />

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

// --- Helper Components ---

function ReminderToast() {
  const { missedReminders } = useStore($reminders)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  useEffect(() => {
    checkReminders()
  }, [])

  const activeReminder = React.useMemo(() => {
    return missedReminders.find((r) => !dismissed.has(r.title + r.scheduledFor)) || null
  }, [missedReminders, dismissed])

  if (!activeReminder) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed left-4 right-4 top-4 z-[100] mx-auto max-w-md sm:left-1/2 sm:w-full sm:-translate-x-1/2"
      >
        <div className="flex items-start gap-4 rounded-lg border border-border bg-card p-4 shadow-lg">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <Bell className="size-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold">{activeReminder.title}</h4>
            <p className="text-xs text-muted-foreground">{activeReminder.body}</p>
          </div>
          <button
            onClick={() =>
              setDismissed((prev) =>
                new Set(prev).add(activeReminder.title + activeReminder.scheduledFor),
              )
            }
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

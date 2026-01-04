import React, { useState, useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, ArrowLeft } from 'lucide-react'

import { GroceryList } from './GroceryList'
import { VarietyWarning } from './VarietyWarning'

import { SettingsView } from './SettingsView'
import FeedbackDashboard from './FeedbackDashboard'
import { RecipeEditor } from './RecipeEditor'
import { RecipeHeader } from './RecipeHeader'
import { BulkEditModal } from './BulkEditModal'
import { BulkRecipeImporter } from './BulkRecipeImporter'
import type { Recipe } from '../../lib/types'

// --- Hooks ---
import { useRecipes } from './hooks/useRecipes'
import { useFilteredRecipes } from './hooks/useFilteredRecipes'
import { useGroceryListGenerator } from './hooks/useGroceryListGenerator'

import { useRecipeSelection } from './hooks/useRecipeSelection'
import { useRecipeActions } from './hooks/useRecipeActions'
import { useRouter } from './hooks/useRouter'

import { checkAndRunRollover } from '../../lib/week-rollover'
import { useStore } from '@nanostores/react'
import { currentWeekRecipes } from '../../lib/weekStore'

// --- Sub-Components ---
import { RecipeLibrary } from './RecipeLibrary'
import { RecipeDetail } from './RecipeDetail'
import { RecipeFilters } from './RecipeFilters'
import { RecipeControlBar } from './RecipeControlBar'

import { DayPicker } from './week-planner/DayPicker'
import { CalendarPicker } from './week-planner/CalendarPicker'
import { WeekContextBar } from './week-planner/WeekContextBar'
import { WeekWorkspace } from './week-planner/WeekWorkspace'

import { ResponsiveModal } from '../ui/ResponsiveModal'
import { CookingStatusIndicator } from '../cooking-mode/CookingStatusIndicator'
import { $cookingSession } from '../../stores/cookingSession'

export type ViewMode =
  | 'library'
  | 'detail'
  | 'edit'
  | 'grocery'
  | 'week'
  | 'settings'
  | 'feedback-dashboard'
  | 'bulk-import'

interface ProteinWarning {
  protein: string
  count: number
}

interface RecipeManagerProps {
  user?: string
}

// --- MAIN COMPONENT ---
const RecipeManager: React.FC<RecipeManagerProps> = ({ user }) => {
  const { recipes, setRecipes, loading, refreshRecipes, getBaseUrl } = useRecipes()

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

  const selectedRecipe = useMemo(() => {
    if (!activeRecipeId) return null
    return recipes.find((r) => r.id === activeRecipeId) || null
  }, [recipes, activeRecipeId])

  // Filter Source List based on View
  const activeWeekPlanned = useStore(currentWeekRecipes)

  const sourceRecipes = useMemo(() => {
    if (view === 'week') {
      const ids = new Set(activeWeekPlanned.map((p) => p.recipeId))
      return recipes.filter((r) => ids.has(r.id))
    }
    return recipes
  }, [recipes, view, activeWeekPlanned])

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

  // Scroll Container Ref State
  const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(null)

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

  const handleAddToWeek = (recipeId: string) => {
    setDayPickerRecipeId(recipeId)
  }

  // Listen for settings navigation from burger menu
  useEffect(() => {
    const handleNavigateToSettings = () => setView('settings')
    const handleNavigateToFeedbackDashboard = () => setView('feedback-dashboard')
    const handleNavigateToBulkImport = () => setView('bulk-import')

    window.addEventListener('navigate-to-settings', handleNavigateToSettings)
    window.addEventListener('navigate-to-feedback-dashboard', handleNavigateToFeedbackDashboard)
    window.addEventListener('navigate-to-bulk-import', handleNavigateToBulkImport)

    return () => {
      window.removeEventListener('navigate-to-settings', handleNavigateToSettings)
      window.removeEventListener(
        'navigate-to-feedback-dashboard',
        handleNavigateToFeedbackDashboard,
      )
      window.removeEventListener('navigate-to-bulk-import', handleNavigateToBulkImport)
    }
  }, [setView])

  // Run Rollover Check
  useEffect(() => {
    checkAndRunRollover()
  }, [])

  const handleSaveRecipe = async (recipe: Partial<Recipe> & { id?: string }) => {
    const { success } = await saveRecipe(recipe)
    if (success) {
      if (view === 'edit') {
        setView('library')
        setRecipe(null)
      }
    }
  }

  const handleDeleteRecipe = async (id: string) => {
    const success = await deleteRecipe(id)
    if (success) {
      setView('library')
      setRecipe(null)
    } else {
      alert('Failed to delete')
    }
  }

  const handleUpdateRecipe = (updatedRecipe: Recipe, mode: 'save' | 'edit' = 'save') => {
    if (mode === 'edit') {
      setRecipe(updatedRecipe.id)
      setView('edit')
    } else {
      const changes = {
        ...updatedRecipe,
        updatedAt: new Date().toISOString(),
      }
      handleSaveRecipe(changes)

      setRecipes((prev) => prev.map((r) => (r.id === updatedRecipe.id ? changes : r)))
    }
  }

  const handleToggleFavorite = async (recipe: Recipe) => {
    await toggleFavorite(recipe)
    if (selectedRecipe && selectedRecipe.id === recipe.id) {
      // No-op, derived from recipes
    }
  }

  // Selection Logic handled by hook

  const handleBulkDelete = async () => {
    if (confirm(`Delete ${selectedIds.size} recipes? This cannot be undone.`)) {
      const success = await bulkDeleteRecipes(selectedIds)
      if (success) {
        clearSelection()
      } else {
        alert('Some deletions failed')
      }
    }
  }

  const handleBulkEdit = async (updates: Partial<Recipe>) => {
    const success = await bulkUpdateRecipes(selectedIds, updates)
    if (success) {
      setShowBulkEdit(false)
      clearSelection()
    } else {
      alert('Bulk update failed')
    }
  }

  // Data Mgmt
  const handleExport = () => {
    const dataStr = JSON.stringify(recipes, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `chefboard_backup_${new Date().toISOString().split('T')[0]}.json`
    link.href = url
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const result = event.target?.result as string
        const imported = JSON.parse(result)
        if (Array.isArray(imported)) {
          // Merge logic: Add new, update existing if imported is newer?
          // For simplicity: Add all that don't satisfy existing ID.
          const existingIds = new Set(recipes.map((r) => r.id))
          const newRecipes = imported.filter((r) => !existingIds.has(r.id))

          // Or maybe confirm overwrite? simple merge for now.
          setRecipes([...recipes, ...newRecipes])
          alert(`Imported ${newRecipes.length} recipes.`)
        }
      } catch (err) {
        console.error(err)
        alert('Failed to parse JSON.')
      }
    }
    reader.readAsText(file)
  }

  const handleDeleteAll = () => {
    if (confirm('DANGER: This will delete ALL your recipes permanently. Are you sure?')) {
      setRecipes([])
      setView('library') // Close settings
    }
  }

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
            // Ensure defaults
            rating: 0,
            isFavorite: false,
          }
          // Cast to generic recipe to avoid Partial mismatch if any
          await saveRecipe(fullRecipe as unknown as Partial<Recipe>)
        }),
      )
      refreshRecipes()
      alert(`Successfully imported ${recipes.length} recipes!`)
      setView('library')
    } catch (e) {
      console.error(e)
      alert('Failed to save some recipes.')
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
  if (loading) {
    return (
      <div
        data-testid="loading-indicator"
        className="flex h-full items-center justify-center bg-card"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Detail View (Cooking Mode)
  if (view === 'detail' && selectedRecipe) {
    return (
      <RecipeDetail
        recipe={selectedRecipe}
        onClose={() => setView('library')}
        onUpdate={handleUpdateRecipe}
        onDelete={(id) => handleDeleteRecipe(id)}
        onToggleThisWeek={() => handleAddToWeek(selectedRecipe.id)}
        onToggleFavorite={() => handleToggleFavorite(selectedRecipe)}
      />
    )
  }

  if (view === 'settings') {
    return (
      <SettingsView
        onClose={() => setView('library')}
        onExport={handleExport}
        onImport={handleImport}
        onDeleteAccount={handleDeleteAll}
      />
    )
  }

  if (view === 'bulk-import') {
    return (
      <BulkRecipeImporter
        onClose={() => setView('library')}
        onRecipesParsed={handleBulkImportSave}
      />
    )
  }

  if (view === 'feedback-dashboard') {
    return (
      <div className="flex h-full flex-col bg-white">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <button onClick={() => setView('library')} className="rounded-full p-2 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <FeedbackDashboard />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="shadow-md-3 relative mx-auto flex h-[100dvh] w-full max-w-2xl flex-col bg-card text-foreground">
        {/* Toast Warning */}
        <div data-testid="debug-view" style={{ display: 'none' }}>
          {view}
        </div>
        <VarietyWarning warning={proteinWarning} onClose={() => setProteinWarning(null)} />

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

        {/* Collapsible Header */}
        {/* Collapsible Header */}
        <AnimatePresence>
          {!isSearchMode && (
            <motion.div
              initial={{ height: 'auto', opacity: 1 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <RecipeHeader
                user={user}
                scrollContainer={scrollContainer}
                onAddRecipe={() => {
                  setRecipe(null)
                  setView('edit')
                }}
                onViewWeek={() => {
                  if (view === 'week') {
                    setView('library')
                  } else {
                    setView('week')
                  }
                }}
                isWeekView={view === 'week'}
              />
            </motion.div>
          )}
        </AnimatePresence>

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

        <main ref={setScrollContainer} className="relative flex-1 overflow-y-auto scroll-smooth">
          {view === 'library' && (
            <div className="flex h-full flex-col pb-32">
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
              />
            )}
          </AnimatePresence>
          {view === 'detail' && selectedRecipe && (
            <RecipeDetail
              recipe={selectedRecipe}
              onClose={() => setView('library')}
              onUpdate={handleUpdateRecipe}
              onDelete={handleDeleteRecipe}
              onToggleThisWeek={() => handleAddToWeek(selectedRecipe.id)}
              onToggleFavorite={() => handleToggleFavorite(selectedRecipe)}
            />
          )}

          {view === 'grocery' && (
            <div className="flex h-full flex-col pb-32">
              <GroceryList
                ingredients={groceryItems}
                isLoading={isGenerating}
                onClose={() => setView('library')}
                recipes={targetRecipes}
                onOpenRecipe={(recipe) => {
                  setRoute({ activeRecipeId: recipe.id, view: 'detail' })
                }}
              />
            </div>
          )}
        </main>
      </div>

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

      {/* Week Context Bar (Sticky Bottom) */}
      {(view === 'library' || view === 'grocery') && !isSelectionMode && (
        <WeekContextBar
          onOpenCalendar={() => setIsCalendarOpen(true)}
          onViewWeek={() => setView('week')}
        />
      )}

      {/* Sticky Bottom Actions (Selection Mode) */}
      {/* Sticky Bottom Actions (Selection Mode) */}
      {isSelectionMode && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between border-t border-border bg-background/95 px-6 py-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] backdrop-blur-sm animate-in slide-in-from-bottom-5">
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
    </>
  )
}

export default RecipeManager

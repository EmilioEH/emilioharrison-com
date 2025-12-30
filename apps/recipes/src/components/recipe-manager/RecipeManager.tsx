import React, { useState, useEffect } from 'react'
import { Plus, Loader2, ArrowLeft } from 'lucide-react'

import { GroceryList } from './GroceryList'
import { Fab } from '../ui/Fab'
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

// --- Sub-Components ---
import { RecipeLibrary } from './RecipeLibrary'
import { RecipeDetail } from './RecipeDetail'
import { RecipeFilters } from './RecipeFilters'
import { BottomControls } from './BottomControls'
import { ResponsiveModal } from '../ui/ResponsiveModal'

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
  const [view, setView] = useState<ViewMode>('library')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)

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
  } = useFilteredRecipes(recipes, view)

  const { groceryItems, isGenerating, handleGenerateList, targetRecipes } = useGroceryListGenerator(
    recipes,
    (v: string) => setView(v as ViewMode),
  )

  // Hooks
  const { isSelectionMode, setIsSelectionMode, selectedIds, toggleSelection, clearSelection } =
    useRecipeSelection()
  const [showBulkEdit, setShowBulkEdit] = useState(false)

  const { saveRecipe, deleteRecipe, toggleFavorite, bulkUpdateRecipes, bulkDeleteRecipes } =
    useRecipeActions({
      recipes,
      setRecipes,
      refreshRecipes,
      getBaseUrl,
    })

  // Smart Suggestion State
  const [proteinWarning, setProteinWarning] = useState<ProteinWarning | null>(null)

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
  }, [])

  const handleSaveRecipe = async (recipe: Partial<Recipe> & { id?: string }) => {
    const { success } = await saveRecipe(recipe)
    if (success) {
      if (view === 'edit') {
        setView('library')
        setSelectedRecipe(null)
      }
    }
  }

  const handleDeleteRecipe = async (id: string) => {
    const success = await deleteRecipe(id)
    if (success) {
      setView('library')
      setSelectedRecipe(null)
    } else {
      alert('Failed to delete')
    }
  }

  const handleUpdateRecipe = (updatedRecipe: Recipe, mode: 'save' | 'edit' = 'save') => {
    if (mode === 'edit') {
      setSelectedRecipe(updatedRecipe)
      setView('edit')
    } else {
      const changes = {
        ...updatedRecipe,
        updatedAt: new Date().toISOString(),
      }
      handleSaveRecipe(changes)

      if (selectedRecipe && selectedRecipe.id === updatedRecipe.id) {
        setSelectedRecipe(changes)
      }
    }
  }

  const handleToggleThisWeek = (recipeId: string | undefined) => {
    if (!recipeId) return
    const recipe = recipes.find((r) => r.id === recipeId)
    if (!recipe) return

    const willBeInWeek = !recipe.thisWeek

    // Smart Variety Logic
    if (willBeInWeek && recipe.protein) {
      const currentWeekRecipes = recipes.filter((r) => r.thisWeek)
      if (currentWeekRecipes.length >= 3) {
        const sameProteinCount = currentWeekRecipes.filter(
          (r) => r.protein === recipe.protein,
        ).length
        if (sameProteinCount >= 1) {
          setProteinWarning({ protein: recipe.protein, count: sameProteinCount + 1 })
          setTimeout(() => setProteinWarning(null), 5000)
        }
      }
    }

    handleUpdateRecipe({ ...recipe, thisWeek: willBeInWeek })
  }

  const handleToggleFavorite = async (recipe: Recipe) => {
    const newRecipe = await toggleFavorite(recipe)
    if (selectedRecipe && selectedRecipe.id === recipe.id) {
      setSelectedRecipe(newRecipe)
    }
  }

  const handleAssignDay = (recipe: Recipe, dateKey: string) => {
    handleUpdateRecipe({ ...recipe, assignedDate: dateKey })
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
        onToggleThisWeek={() => handleToggleThisWeek(selectedRecipe.id)}
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

        <RecipeFilters
          isOpen={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          filters={filters}
          setFilters={setFilters}
          sort={sort}
          setSort={setSort}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* Collapsible Header */}
        <RecipeHeader
          onGenerateList={handleGenerateList}
          isSelectionMode={isSelectionMode}
          selectedCount={selectedIds.size}
          onCancelSelection={() => {
            clearSelection()
          }}
          onDeleteSelection={handleBulkDelete}
          onBulkEdit={() => setShowBulkEdit(true)}
          user={user}
        />

        {/* Sticky Context Bar (Tabs & Toolbar) - REMOVED, replaced by BottomControls */}

        <main className="relative flex-1 overflow-y-auto scroll-smooth">
          {(view === 'library' || view === 'week') && (
            <div className="flex h-full flex-col pb-32">
              <div className="scrollbar-hide flex-1">
                {!isSelectionMode && view === 'library' && recipes.length > 0 && (
                  <div className="flex justify-end px-4 pt-2">
                    <button
                      onClick={() => setIsSelectionMode(true)}
                      className="text-xs font-bold uppercase tracking-wider text-primary"
                    >
                      Select Recipes
                    </button>
                  </div>
                )}

                <RecipeLibrary
                  recipes={processedRecipes}
                  sort={view === 'week' ? 'week-day' : sort}
                  onSelectRecipe={(r) => {
                    if (isSelectionMode) {
                      toggleSelection(r.id)
                    } else {
                      setSelectedRecipe(r)
                      setView('detail')
                    }
                  }}
                  onToggleThisWeek={handleToggleThisWeek}
                  isSelectionMode={isSelectionMode}
                  selectedIds={selectedIds}
                  onAssignDay={handleAssignDay}
                  viewMode={viewMode}
                  onClearSearch={() => setSearchQuery('')}
                  hasSearch={!!searchQuery}
                />
              </div>
            </div>
          )}
          {view === 'detail' && selectedRecipe && (
            <RecipeDetail
              recipe={selectedRecipe}
              onClose={() => setView('library')}
              onUpdate={handleUpdateRecipe}
              onDelete={handleDeleteRecipe}
              onToggleThisWeek={() => handleToggleThisWeek(selectedRecipe.id)}
              onToggleFavorite={() => handleToggleFavorite(selectedRecipe)}
            />
          )}

          {view === 'grocery' && (
            <GroceryList
              ingredients={groceryItems}
              isLoading={isGenerating}
              onClose={() => setView('library')}
              recipes={targetRecipes}
            />
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
      {/* Primary Floating Action Button - Outside container for proper Safari fixed positioning */}
      {/* Primary Floating Action Button - Lifted for Bottom Bar */}
      {(view === 'library' || view === 'week') && !isSelectionMode && (
        <div className="fixed bottom-36 right-4 z-[60] transition-all duration-300">
          <Fab
            icon={Plus}
            label="Add Recipe"
            onClick={() => {
              setSelectedRecipe(null)
              setView('edit')
            }}
          />
        </div>
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

      {/* Sticky Bottom Controls */}
      {(view === 'library' || view === 'week') && (
        <BottomControls
          view={view}
          setView={(v) => setView(v)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onOpenFilters={() => setFiltersOpen(true)}
          activeFilterCount={
            (filters.protein?.length || 0) +
            (filters.difficulty?.length || 0) +
            (filters.cuisine?.length || 0) +
            (filters.onlyFavorites ? 1 : 0)
          }
          recipeCount={recipes.length}
          weekCount={recipes.filter((r) => r.thisWeek).length}
        />
      )}
    </>
  )
}

export default RecipeManager

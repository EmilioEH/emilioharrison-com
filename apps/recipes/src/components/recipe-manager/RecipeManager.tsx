import React, { useState, useEffect } from 'react'
import { Plus, ChefHat, Loader2, Calendar, ArrowLeft } from 'lucide-react'

import { GroceryList } from './GroceryList'
import { Tabs } from '../ui/Tabs'
import { Fab } from '../ui/Fab'
import { VarietyWarning } from './VarietyWarning'

import { SettingsView } from './SettingsView'
import FeedbackDashboard from './FeedbackDashboard'
import { RecipeEditor } from './RecipeEditor'
import { RecipeHeader } from './RecipeHeader'
import { BulkEditModal } from './BulkEditModal'
import type { Recipe } from '../../lib/types'

// --- Hooks ---
import { useRecipes } from './hooks/useRecipes'
import { useFilteredRecipes } from './hooks/useFilteredRecipes'
import { useGroceryListGenerator } from './hooks/useGroceryListGenerator'

// --- Sub-Components ---
import { RecipeLibrary } from './RecipeLibrary'
import { RecipeDetail } from './RecipeDetail'
import { RecipeFilters } from './RecipeFilters'
import { LibraryToolbar } from './LibraryToolbar'

type ViewMode =
  | 'library'
  | 'detail'
  | 'edit'
  | 'grocery'
  | 'week'
  | 'settings'
  | 'feedback-dashboard'

interface ProteinWarning {
  protein: string
  count: number
}

// --- MAIN COMPONENT ---
const RecipeManager: React.FC = () => {
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

  const { groceryItems, isGenerating, handleGenerateList } = useGroceryListGenerator(
    recipes,
    (v: string) => setView(v as ViewMode),
  )

  // Selection Mode
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkEdit, setShowBulkEdit] = useState(false)

  // Smart Suggestion State
  const [proteinWarning, setProteinWarning] = useState<ProteinWarning | null>(null)

  // Listen for settings navigation from burger menu
  useEffect(() => {
    const handleNavigateToSettings = () => setView('settings')
    const handleNavigateToFeedbackDashboard = () => setView('feedback-dashboard')

    window.addEventListener('navigate-to-settings', handleNavigateToSettings)
    window.addEventListener('navigate-to-feedback-dashboard', handleNavigateToFeedbackDashboard)

    return () => {
      window.removeEventListener('navigate-to-settings', handleNavigateToSettings)
      window.removeEventListener(
        'navigate-to-feedback-dashboard',
        handleNavigateToFeedbackDashboard,
      )
    }
  }, [])

  const handleSaveRecipe = async (recipe: Partial<Recipe> & { id?: string }) => {
    // If id is missing, it's new. If id exists but not found locally, treat as new (or sync issue).
    const isNew = !recipe.id || !recipes.find((r) => r.id === recipe.id)
    const method = isNew ? 'POST' : 'PUT'
    const url = isNew ? `${getBaseUrl()}api/recipes` : `${getBaseUrl()}api/recipes/${recipe.id}`

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipe),
      })

      if (res.ok) {
        const savedRecipe = { ...recipe } as Recipe
        if (isNew) {
          const { id } = await res.json()
          savedRecipe.id = id
        }

        // Optimistic update for immediate feedback
        setRecipes((prev) => {
          const exists = prev.find((r) => r.id === savedRecipe.id)
          if (exists) {
            return prev.map((r) => (r.id === savedRecipe.id ? savedRecipe : r))
          }
          return [savedRecipe, ...prev]
        })

        if (view === 'edit') {
          setView('library')
          setSelectedRecipe(null)
        }

        await refreshRecipes(false)

        return true
      } else {
        console.error('Failed to save recipe')
        alert('Failed to save recipe')
        return false
      }
    } catch (e) {
      console.error(e)
      alert('Error saving recipe')
      return false
    }
  }

  const handleDeleteRecipe = async (id: string) => {
    try {
      const res = await fetch(`${getBaseUrl()}api/recipes/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setRecipes(recipes.filter((r) => r.id !== id))
        setView('library')
        setSelectedRecipe(null)
      } else {
        alert('Failed to delete')
      }
    } catch (e) {
      console.error(e)
      alert('Error deleting')
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
    // Optimistic Update
    const oldIsFavorite = recipe.isFavorite
    const newIsFavorite = !oldIsFavorite

    setRecipes((prev) =>
      prev.map((r) => (r.id === recipe.id ? { ...r, isFavorite: newIsFavorite } : r)),
    )
    if (selectedRecipe && selectedRecipe.id === recipe.id) {
      setSelectedRecipe({ ...selectedRecipe, isFavorite: newIsFavorite })
    }

    try {
      const res = await fetch(`${getBaseUrl()}api/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId: recipe.id }),
      })

      if (!res.ok) {
        throw new Error('Failed to toggle favorite')
      }

      const data = await res.json()
      // Ensure sync with server truth
      if (data.isFavorite !== newIsFavorite) {
        setRecipes((prev) =>
          prev.map((r) => (r.id === recipe.id ? { ...r, isFavorite: data.isFavorite } : r)),
        )
        if (selectedRecipe && selectedRecipe.id === recipe.id) {
          setSelectedRecipe({ ...selectedRecipe, isFavorite: data.isFavorite })
        }
      }
    } catch (e) {
      console.error(e)
      alert('Error updating favorite')
      // Revert
      setRecipes((prev) =>
        prev.map((r) => (r.id === recipe.id ? { ...r, isFavorite: oldIsFavorite } : r)),
      )
      if (selectedRecipe && selectedRecipe.id === recipe.id) {
        setSelectedRecipe({ ...selectedRecipe, isFavorite: oldIsFavorite })
      }
    }
  }

  const handleAssignDay = (recipe: Recipe, dateKey: string) => {
    handleUpdateRecipe({ ...recipe, assignedDate: dateKey })
  }

  // Apply Sorting and Filtering

  // Selection Logic
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBulkDelete = () => {
    if (confirm(`Delete ${selectedIds.size} recipes? This cannot be undone.`)) {
      console.log('Deleting ids: ', Array.from(selectedIds)) // Debug
      setRecipes(recipes.filter((r) => !selectedIds.has(r.id)))
      setIsSelectionMode(false)
      setSelectedIds(new Set())
    }
  }

  const handleBulkEdit = async (updates: Partial<Recipe>) => {
    try {
      const res = await fetch(`${getBaseUrl()}api/recipes/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          ids: Array.from(selectedIds),
          updates,
        }),
      })

      if (res.ok) {
        // Optimistic Update
        setRecipes((prev) =>
          prev.map((r) => {
            if (selectedIds.has(r.id)) {
              return { ...r, ...updates, updatedAt: new Date().toISOString() }
            }
            return r
          }),
        )
        setIsSelectionMode(false)
        setSelectedIds(new Set())
      } else {
        alert('Bulk update failed')
      }
    } catch (e) {
      console.error(e)
      alert('Error updating recipes')
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

  // --- RENDER ---
  if (loading) {
    return (
      <div
        data-testid="loading-indicator"
        className="flex h-full items-center justify-center bg-md-sys-color-surface"
      >
        <Loader2 className="h-8 w-8 animate-spin text-md-sys-color-primary" />
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
      <div className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col bg-md-sys-color-surface text-md-sys-color-on-surface shadow-md-3">
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

        <RecipeHeader
          onGenerateList={handleGenerateList}
          isSelectionMode={isSelectionMode}
          selectedCount={selectedIds.size}
          onCancelSelection={() => {
            setIsSelectionMode(false)
            setSelectedIds(new Set())
          }}
          onDeleteSelection={handleBulkDelete}
          onBulkEdit={() => setShowBulkEdit(true)}
        />

        <main className="relative flex-1">
          {(view === 'library' || view === 'week') && (
            <div className="flex h-full flex-col">
              <Tabs
                activeTab={view === 'week' ? 'week' : 'library'}
                onChange={(v) => setView(v as ViewMode)}
                tabs={[
                  { label: 'Library', value: 'library', icon: ChefHat, count: recipes.length },
                  {
                    label: 'This Week',
                    value: 'week',
                    icon: Calendar,
                    count: recipes.filter((r) => r.thisWeek).length,
                  },
                ]}
              />

              <LibraryToolbar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                sort={sort}
                setSort={setSort}
                onOpenFilters={() => setFiltersOpen(true)}
                activeFilterCount={
                  (filters.protein?.length || 0) +
                  (filters.difficulty?.length || 0) +
                  (filters.cuisine?.length || 0) +
                  (filters.onlyFavorites ? 1 : 0)
                }
                viewMode={viewMode}
                setViewMode={setViewMode}
              />

              <div className="scrollbar-hide flex-1 overflow-y-auto">
                {!isSelectionMode && view === 'library' && recipes.length > 0 && (
                  <div className="flex justify-end px-4 pt-2">
                    <button
                      onClick={() => setIsSelectionMode(true)}
                      className="text-xs font-bold uppercase tracking-wider text-md-sys-color-primary"
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

          {view === 'edit' && (
            <div className="h-full overflow-y-auto p-4">
              <RecipeEditor
                recipe={selectedRecipe || {}}
                onSave={handleSaveRecipe}
                onCancel={() => setView('library')}
                onDelete={handleDeleteRecipe}
              />
            </div>
          )}

          {view === 'grocery' && (
            <GroceryList
              ingredients={groceryItems}
              isLoading={isGenerating}
              onClose={() => setView('library')}
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
      {(view === 'library' || view === 'week') && !isSelectionMode && (
        <Fab
          icon={Plus}
          label="Add Recipe"
          onClick={() => {
            setSelectedRecipe(null)
            setView('edit')
          }}
        />
      )}
    </>
  )
}

export default RecipeManager

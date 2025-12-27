import React, { useState, useEffect } from 'react'
import { Plus, ChefHat, Loader2, Calendar } from 'lucide-react'

import { GroceryList } from './GroceryList'
import { Tabs } from '../ui/Tabs'
import { Fab } from '../ui/Fab'
import { VarietyWarning } from './VarietyWarning'
import { AiAddView } from './AiAddView'
import { SettingsView } from './SettingsView'
import { RecipeEditor } from './RecipeEditor'
import { RecipeHeader } from './RecipeHeader'
import { EmptyState } from './EmptyState'
import ReactMarkdown from 'react-markdown'

// --- Hooks ---
import { useRecipes } from './hooks/useRecipes'
import { useFilteredRecipes } from './hooks/useFilteredRecipes'
import { useGroceryListGenerator } from './hooks/useGroceryListGenerator'
import { useUrlSync } from './hooks/useUrlSync'

// --- Sub-Components ---
import { RecipeLibrary } from './RecipeLibrary'
import { RecipeDetail } from './RecipeDetail'
import { RecipeFilters } from './RecipeFilters'
import { LibraryToolbar } from './LibraryToolbar'

// --- MAIN COMPONENT ---
const RecipeManager = () => {
  const { recipes, setRecipes, loading, refreshRecipes, getBaseUrl } = useRecipes()
  const [view, setView] = useState('library') // 'library', 'detail', 'edit', 'grocery', 'ai-add', 'week'
  const [selectedRecipe, setSelectedRecipe] = useState(null)

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
    setView,
  )

  useUrlSync(view, setView, recipes, selectedRecipe, setSelectedRecipe, loading)

  // Selection Mode
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())

  // Smart Suggestion State
  const [proteinWarning, setProteinWarning] = useState(null) // { protein: string, count: number }

  // Listen for settings navigation from burger menu
  useEffect(() => {
    const handleNavigateToSettings = () => setView('settings')
    window.addEventListener('navigate-to-settings', handleNavigateToSettings)
    return () => window.removeEventListener('navigate-to-settings', handleNavigateToSettings)
  }, [])

  const handleSaveRecipe = async (recipe) => {
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
        if (isNew) {
          const { id } = await res.json()
          recipe.id = id
        }
        await refreshRecipes()
        // Optimistic update for immediate feedback
        if (isNew) {
          setRecipes((prev) => [recipe, ...prev])
        } else {
          setRecipes((prev) => prev.map((r) => (r.id === recipe.id ? recipe : r)))
        }

        if (view === 'edit' || view === 'ai-add') {
          setView('library') // Or detail?
          setSelectedRecipe(null)
        }
      } else {
        console.error('Failed to save recipe')
        alert('Failed to save recipe')
      }
    } catch (e) {
      console.error(e)
      alert('Error saving recipe')
    }
  }

  const handleDeleteRecipe = async (id) => {
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

  const handleUpdateRecipe = (updatedRecipe, mode = 'save') => {
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

  const handleToggleThisWeek = (recipeId) => {
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

  const handleToggleFavorite = async (recipe) => {
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

  const handleAssignDay = (recipe, dateKey) => {
    handleUpdateRecipe({ ...recipe, assignedDate: dateKey })
  }

  // Apply Sorting and Filtering

  // Selection Logic
  const toggleSelection = (id) => {
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

  const handleImport = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result)
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
      <div className="flex h-full items-center justify-center bg-md-sys-color-surface">
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

  // AI Add View
  if (view === 'ai-add') {
    return (
      <AiAddView
        onClose={() => setView('library')}
        onSave={(recipe) => {
          handleSaveRecipe(recipe)
          setView('library')
        }}
      />
    )
  }

  return (
    <div className="relative mx-auto flex h-full w-full max-w-2xl flex-col overflow-hidden bg-md-sys-color-surface text-md-sys-color-on-surface shadow-md-3">
      {/* Toast Warning */}
      {/* Toast Warning */}
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
        onAddAi={() => setView('ai-add')}
        isSelectionMode={isSelectionMode}
        selectedCount={selectedIds.size}
        onCancelSelection={() => {
          setIsSelectionMode(false)
          setSelectedIds(new Set())
        }}
        onDeleteSelection={handleBulkDelete}
      />

      <main className="relative flex-1 overflow-hidden">
        {(view === 'library' || view === 'week') && (
          <div className="flex h-full flex-col">
            <Tabs
              activeTab={view === 'week' ? 'week' : 'library'}
              onChange={(v) => setView(v)}
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
                onToggleSelection={toggleSelection}
                onAssignDay={handleAssignDay}
              />
            </div>
          </div>
        )}
        {view === 'detail' && (
          <RecipeDetail
            recipe={selectedRecipe}
            onClose={() => setView('library')}
            onUpdate={handleSaveRecipe}
            onDelete={handleDeleteRecipe}
            onToggleThisWeek={() => handleToggleThisWeek(selectedRecipe.id)}
          />
        )}

        {view === 'edit' && (
          <div className="h-full overflow-y-auto p-4">
            <RecipeEditor
              recipe={selectedRecipe || {}}
              onSave={(r) => {
                handleSaveRecipe(r)
                setView('library')
              }}
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

      {/* Primary Floating Action Button */}
      {(view === 'library' || view === 'week') && !isSelectionMode && (
        <Fab
          icon={Plus}
          label="Add Recipe"
          onClick={() => {
            setSelectedRecipe({})
            setView('edit')
          }}
        />
      )}
    </div>
  )
}

export default RecipeManager

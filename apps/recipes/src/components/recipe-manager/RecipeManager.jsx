import React, { useState, useEffect, useRef } from 'react'
import {
  Plus,
  ShoppingBag,
  ChefHat,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Save,
  Check,
  Sparkles,
  ListFilter,
  Calendar,
  AlertCircle,
  X,
  Settings,
  Download,
  Upload,
} from 'lucide-react'

import { GroceryList } from './GroceryList'
import { RecipeInput } from '../RecipeInput'
import ReactMarkdown from 'react-markdown'

const RECIPES_API_URL = '/protected/recipes/api/user-data'

// --- Hooks ---

const useRecipes = () => {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState('idle')
  // New: structured ingredients are part of recipe object now

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const res = await fetch(RECIPES_API_URL)
        if (res.ok) {
          const data = await res.json()
          setRecipes(Array.isArray(data.recipes) ? data.recipes : [])
          setSyncStatus('idle')
        } else {
          console.error(`Failed to fetch recipes: ${res.status}`)
          setSyncStatus('error')
        }
      } catch (err) {
        console.error('Failed to fetch recipes', err)
        setSyncStatus('error')
      } finally {
        setLoading(false)
      }
    }
    fetchRecipes()
  }, [])

  const isInitialLoad = useRef(true)

  useEffect(() => {
    if (loading) return

    if (isInitialLoad.current) {
      isInitialLoad.current = false
      return
    }

    const timeoutId = setTimeout(async () => {
      setSyncStatus('syncing')
      try {
        const res = await fetch(RECIPES_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipes }),
        })
        if (!res.ok) {
          throw new Error(`Save failed with status: ${res.status}`)
        }
        setSyncStatus('saved')
        setTimeout(() => setSyncStatus('idle'), 2000)
      } catch (err) {
        console.error('Sync failed', err)
        setSyncStatus('error')
      }
    }, 1000)
    return () => clearTimeout(timeoutId)
  }, [recipes, loading])

  return { recipes, setRecipes, loading, syncStatus }
}

// --- Sub-Components ---
import { RecipeLibrary } from './RecipeLibrary'
import { RecipeDetail } from './RecipeDetail'
import { RecipeFilters } from './RecipeFilters'

const SettingsView = ({ onExport, onImport, onDeleteAccount, onClose }) => (
  <div className="animate-in slide-in-from-right absolute inset-0 z-50 bg-md-sys-color-surface p-6">
    <div className="mb-8 flex items-center justify-between">
      <h2 className="font-display text-2xl font-bold text-md-sys-color-on-surface">
        Data Management
      </h2>
      <button onClick={onClose}>
        <X className="h-6 w-6" />
      </button>
    </div>

    <div className="space-y-8">
      <section>
        <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-md-sys-color-on-surface-variant">
          Export & Import
        </h3>
        <div className="flex flex-col gap-4">
          <button
            onClick={onExport}
            className="flex items-center gap-3 rounded-lg border border-md-sys-color-outline p-4 text-left transition-colors hover:bg-md-sys-color-surface-variant"
          >
            <div className="rounded-full bg-md-sys-color-secondary-container p-2 text-md-sys-color-on-secondary-container">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold">Export Data</div>
              <div className="text-xs opacity-70">Download your recipes as JSON</div>
            </div>
          </button>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-md-sys-color-outline p-4 text-left transition-colors hover:bg-md-sys-color-surface-variant">
            <div className="rounded-full bg-md-sys-color-tertiary-container p-2 text-md-sys-color-on-tertiary-container">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold">Import Data</div>
              <div className="text-xs opacity-70">Restore recipes from JSON backup</div>
            </div>
            <input type="file" className="hidden" onChange={onImport} accept=".json" />
          </label>
        </div>
      </section>

      <section className="border-t border-md-sys-color-outline pt-6">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-red-600">
          Danger Zone
        </h3>
        <button
          onClick={onDeleteAccount}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 font-bold text-red-600 transition-colors hover:bg-red-100"
        >
          <Trash2 className="h-5 w-5" /> Delete All Data
        </button>
      </section>
    </div>
  </div>
)

const RecipeHeader = ({
  syncStatus,
  onGenerateList,
  onAddAi,
  onAddManual,
  onOpenFilters,
  onOpenSettings,
  isSelectionMode,
  selectedCount,
  onCancelSelection,
  onDeleteSelection,
}) => (
  <header
    className={`sticky top-0 z-10 flex items-center justify-between border-b border-md-sys-color-outline px-6 py-4 transition-colors ${isSelectionMode ? 'bg-md-sys-color-secondary-container text-md-sys-color-on-secondary-container' : 'bg-md-sys-color-surface'}`}
  >
    {isSelectionMode ? (
      <>
        <div className="flex items-center gap-4">
          <button onClick={onCancelSelection} className="rounded-full p-2 hover:bg-black/10">
            <X className="h-5 w-5" />
          </button>
          <div className="text-lg font-bold">{selectedCount} Selected</div>
        </div>
        <button
          onClick={onDeleteSelection}
          className="flex items-center gap-2 rounded-full bg-md-sys-color-error px-4 py-2 font-bold text-md-sys-color-on-error shadow-md-1"
        >
          <Trash2 className="h-4 w-4" /> Delete ({selectedCount})
        </button>
      </>
    ) : (
      <>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-md-sys-color-primary">
            CHEFBOARD
          </h1>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-md-sys-color-on-surface-variant">
            {syncStatus === 'syncing' && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Syncing
              </>
            )}
            {syncStatus === 'saved' && (
              <>
                <Check className="h-3 w-3" /> Saved
              </>
            )}
            {syncStatus === 'error' && <span className="text-red-500">Sync Error</span>}
            {syncStatus === 'idle' && <span>Ready</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onOpenFilters}
            className="hover:bg-md-sys-color-primary/[0.08] rounded-full bg-md-sys-color-surface-variant p-2 text-md-sys-color-on-surface-variant"
            title="Sort & Filter"
          >
            <ListFilter className="h-5 w-5" />
          </button>

          <button
            onClick={onOpenSettings}
            className="hover:bg-md-sys-color-primary/[0.08] rounded-full bg-md-sys-color-surface-variant p-2 text-md-sys-color-on-surface-variant"
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>

          <div className="mx-1 h-9 w-px bg-gray-200"></div>

          <button
            onClick={onGenerateList}
            className="rounded-full bg-md-sys-color-secondary-container p-2 text-md-sys-color-on-secondary-container shadow-md-1 transition-all hover:shadow-md-2"
            title="Grocery List"
          >
            <ShoppingBag className="h-5 w-5" />
          </button>

          <button
            onClick={onAddAi}
            className="flex items-center justify-center rounded-full bg-md-sys-color-tertiary-container p-2 text-md-sys-color-on-tertiary-container shadow-md-1 transition-all hover:shadow-md-2"
            title="AI Add"
          >
            <Sparkles className="h-5 w-5" />
          </button>

          <button
            onClick={onAddManual}
            className="items-center gap-1 rounded-full bg-md-sys-color-primary p-2 text-md-sys-color-on-primary shadow-md-1 transition-all hover:shadow-md-2"
            title="Add Recipe"
            aria-label="Add Recipe"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </>
    )}
  </header>
)

const EmptyState = () => (
  <div className="py-20 text-center opacity-50">
    <ChefHat className="mx-auto mb-4 h-16 w-16 text-gray-300" />
    <p className="font-display text-xl">No Recipes Yet</p>
    <p className="font-body">Add your first tasty dish!</p>
  </div>
)

/* ...Keeping existing GroceryView... */
const GroceryView = ({ isGenerating, groceryList, onClose }) => (
  <div className="animate-in fade-in slide-in-from-bottom-4 h-full overflow-y-auto p-4 duration-300">
    <div className="mb-4 flex items-center justify-between">
      <h2 className="font-display text-2xl font-bold">Grocery List</h2>
      <button onClick={onClose} className="text-sm font-bold underline">
        Close
      </button>
    </div>
    {isGenerating ? (
      <div className="flex flex-col items-center justify-center rounded-md-xl border border-dashed border-md-sys-color-outline p-12">
        <Loader2 className="mb-2 h-8 w-8 animate-spin text-md-sys-color-primary" />
        <p className="animate-pulse font-medium">Consulting the AI Chef...</p>
      </div>
    ) : (
      <div className="prose prose-sm max-w-none rounded-md-xl border border-md-sys-color-outline bg-md-sys-color-surface p-6 font-body text-md-sys-color-on-surface shadow-md-1">
        <ReactMarkdown>{groceryList}</ReactMarkdown>
      </div>
    )}
  </div>
)

/* ...Keeping QuickImport and RecipeTextEditor and RecipeEditor ... */
const QuickImport = ({ rawText, setRawText, onParse, showImport, setShowImport }) => (
  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
    <button
      onClick={() => setShowImport(!showImport)}
      className="flex w-full items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500"
    >
      <span>Paste Raw Text</span>
      {showImport ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </button>
    {showImport && (
      <div className="mt-2 space-y-2">
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          className="h-24 w-full rounded border bg-white p-2 font-mono text-xs"
          placeholder="Paste recipe text here..."
        />
        <button
          onClick={onParse}
          className="bg-ink w-full rounded py-1 text-xs font-bold text-white"
        >
          Auto-fill
        </button>
      </div>
    )}
  </div>
)

const RecipeTextEditor = ({ label, id, value, onChange, placeholder }) => (
  <div>
    <label htmlFor={id} className="mb-1 block text-xs font-bold uppercase text-gray-400">
      {label}
    </label>
    <textarea
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="h-32 w-full resize-y rounded-md-s border border-md-sys-color-outline bg-md-sys-color-surface-variant p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-md-sys-color-primary"
    />
  </div>
)

const RecipeEditor = ({ recipe, onSave, onCancel, onDelete }) => {
  const [formData, setFormData] = useState(() => {
    if (recipe.id) return recipe
    return {
      id: Date.now().toString(),
      title: '',
      servings: 2,
      prepTime: 15,
      cookTime: 15,
      ingredients: [],
      steps: [],
      notes: '',
      protein: '',
      difficulty: 'Medium',
      rating: 0,
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versionHistory: [],
    }
  })
  const [rawText, setRawText] = useState('')
  const [showImport, setShowImport] = useState(false)

  // Initial load helpers
  const [ingText, setIngText] = useState(() => {
    if (!recipe.ingredients) return ''
    return recipe.ingredients
      .map((i) => {
        const prepStr = i.prep ? ` (${i.prep})` : ''
        return `${i.amount} ${i.name}${prepStr}`
      })
      .join('\n')
  })
  const [stepText, setStepText] = useState(recipe.steps?.join('\n') || '')

  const parseRawText = () => {
    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l)
    if (lines.length > 0) {
      const newData = { ...formData }
      if (!newData.title) newData.title = lines[0]
      newData.notes = rawText
      setFormData(newData)
    }
    setShowImport(false)
  }

  const handleInternalSave = () => {
    const ingredients = ingText
      .split('\n')
      .filter((l) => l.trim())
      .map((line) => {
        const parts = line.split(' ')
        const amount = parts[0]
        const name = parts.slice(1).join(' ')
        return { name, amount, prep: '' }
      })

    const steps = stepText.split('\n').filter((l) => l.trim())

    // Calculate changes for history
    const now = new Date().toISOString()
    const historyEntry = {
      date: now,
      changeType: recipe.id ? 'edit' : 'create',
    }

    const newVersionHistory = [...(formData.versionHistory || []), historyEntry]

    onSave({
      ...formData,
      ingredients,
      steps,
      updatedAt: now,
      createdAt: formData.createdAt || now, // Ensure backfill
      versionHistory: newVersionHistory,
    })
  }

  return (
    <div className="animate-in slide-in-from-bottom-4 space-y-4 rounded-md-xl border border-md-sys-color-outline bg-md-sys-color-surface p-4 shadow-md-1">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">
          {recipe.id ? 'Edit Recipe' : 'New Recipe'}
        </h2>
        <button
          onClick={onCancel}
          className="rounded-md-full bg-md-sys-color-surface-variant p-1 px-3 text-sm font-medium"
        >
          Cancel
        </button>
      </div>

      {!recipe.id && (
        <QuickImport
          rawText={rawText}
          setRawText={setRawText}
          onParse={parseRawText}
          showImport={showImport}
          setShowImport={setShowImport}
        />
      )}

      <div>
        <label htmlFor="title" className="mb-1 block text-xs font-bold uppercase text-gray-400">
          Title
        </label>
        <input
          id="title"
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Grandma's Pancakes"
          className="placeholder-md-sys-color-on-surface-variant/30 w-full border-b border-md-sys-color-outline bg-transparent py-1 font-display text-xl font-medium outline-none focus:border-md-sys-color-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="protein" className="mb-1 block text-xs font-bold uppercase text-gray-400">
            Protein
          </label>
          <select
            id="protein"
            value={formData.protein || ''}
            onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
            className="w-full rounded-md-s border border-md-sys-color-outline bg-md-sys-color-surface-variant p-2 text-sm font-medium"
          >
            <option value="">None</option>
            {['Chicken', 'Beef', 'Pork', 'Fish', 'Seafood', 'Vegetarian', 'Vegan', 'Other'].map(
              (p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ),
            )}
          </select>
        </div>
        <div>
          <label
            htmlFor="difficulty"
            className="mb-1 block text-xs font-bold uppercase text-gray-400"
          >
            Difficulty
          </label>
          <select
            id="difficulty"
            value={formData.difficulty || 'Medium'}
            onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
            className="w-full rounded-md-s border border-md-sys-color-outline bg-md-sys-color-surface-variant p-2 text-sm font-medium"
          >
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {['servings', 'prepTime', 'cookTime'].map((k) => (
          <div
            key={k}
            className="rounded-md-s border border-md-sys-color-outline bg-md-sys-color-surface-variant p-2"
          >
            <label
              htmlFor={k}
              className="mb-1 block text-[10px] font-medium uppercase text-md-sys-color-on-surface-variant"
            >
              {k.replace('Time', '')}
            </label>
            <input
              id={k}
              type="number"
              value={formData[k]}
              onChange={(e) => setFormData({ ...formData, [k]: parseInt(e.target.value) || 0 })}
              className="w-full bg-transparent font-medium text-md-sys-color-on-surface outline-none"
            />
          </div>
        ))}
      </div>

      <RecipeTextEditor
        label="Ingredients (One per line)"
        id="ingredients-editor"
        value={ingText}
        onChange={(e) => setIngText(e.target.value)}
        placeholder="2 cups Flour&#10;1 tsp Salt"
      />

      <RecipeTextEditor
        label="Instructions (One per line)"
        id="instructions-editor"
        value={stepText}
        onChange={(e) => setStepText(e.target.value)}
        placeholder="Mix dry ingredients.&#10;Add wet ingredients."
      />

      <div className="flex gap-2 pt-4">
        {recipe.id && (
          <button
            onClick={() => onDelete(recipe.id)}
            className="rounded-md-xl border border-md-sys-color-error-container bg-md-sys-color-error-container p-3 font-medium text-md-sys-color-on-error-container"
            title="Delete Recipe"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        )}
        <button
          onClick={handleInternalSave}
          className="flex flex-1 items-center justify-center gap-2 rounded-md-full bg-md-sys-color-primary py-3 font-medium text-md-sys-color-on-primary shadow-md-1 transition hover:shadow-md-2 active:shadow-none"
        >
          <Save className="h-4 w-4" /> Save Recipe
        </button>
      </div>
    </div>
  )
}

// --- MAIN COMPONENT ---
const RecipeManager = () => {
  const { recipes, setRecipes, loading, syncStatus } = useRecipes()
  const [view, setView] = useState('library') // 'library', 'detail', 'edit', 'grocery', 'ai-add'
  const [selectedRecipe, setSelectedRecipe] = useState(null)

  // Filtering & Sorting State
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState({})
  const [sort, setSort] = useState('protein')
  const [searchQuery, setSearchQuery] = useState('')

  // Selection Mode
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())

  // Grocery
  const [groceryItems, setGroceryItems] = useState([])

  // Smart Suggestion State
  const [proteinWarning, setProteinWarning] = useState(null) // { protein: string, count: number }

  const handleSaveRecipe = (recipe) => {
    if (recipes.find((r) => r.id === recipe.id)) {
      setRecipes(recipes.map((r) => (r.id === recipe.id ? recipe : r)))
    } else {
      setRecipes([...recipes, recipe])
    }
    setView('library')
    setSelectedRecipe(null)
  }

  const handleDeleteRecipe = (id) => {
    setRecipes(recipes.filter((r) => r.id !== id))
    setView('library')
    setSelectedRecipe(null)
  }

  const handleUpdateRecipe = (updatedRecipe, mode = 'save') => {
    // mode can be 'save' (direct update) or 'edit' (open editor)
    if (mode === 'edit') {
      setSelectedRecipe(updatedRecipe)
      setView('edit')
    } else {
      // Direct save (e.g. toggle "This Week")
      // We should still update 'updatedAt' for these minor interactions, or maybe not?
      // Let's update it to be safe and consistent.
      const changes = {
        ...updatedRecipe,
        updatedAt: new Date().toISOString(),
      }
      // If it's a "real" edit (title, ingredients etc), we might want to push to history.
      // But for simple toggles, maybe just update timestamp.
      handleSaveRecipe(changes)

      // If we are currently viewing it, update the view too
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
      // If we are adding the 4th+ recipe (so currently have 3+)
      // And it matches a protein of an EXISTING this-week recipe
      if (currentWeekRecipes.length >= 3) {
        const sameProteinCount = currentWeekRecipes.filter(
          (r) => r.protein === recipe.protein,
        ).length
        if (sameProteinCount >= 1) {
          // Trigger Warning
          setProteinWarning({ protein: recipe.protein, count: sameProteinCount + 1 })
          // Auto-dismiss after 5s
          setTimeout(() => setProteinWarning(null), 5000)
        }
      }
    }

    handleUpdateRecipe({ ...recipe, thisWeek: willBeInWeek })
  }

  const handleGenerateList = async () => {
    const thisWeekRecipes = recipes.filter((r) => r.thisWeek)

    // Fallback if no recipes selected
    const recipesToProcess = thisWeekRecipes.length > 0 ? thisWeekRecipes : recipes

    if (recipesToProcess.length === 0) {
      alert('No recipes found to generate a list.')
      return
    }

    setView('grocery')

    // 1. Identify recipes missing structured data
    const missingDataRecipes = recipesToProcess.filter(
      (r) => !r.structuredIngredients || r.structuredIngredients.length === 0,
    )

    if (missingDataRecipes.length > 0) {
      try {
        const response = await fetch('/api/generate-grocery-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipes: missingDataRecipes }),
        })

        if (response.ok) {
          const { ingredients } = await response.json()
          // The API returns a flat list of ALL ingredients from the batch.
          // This is a bit tricky: we need to map them back to recipes for caching to work perfectly efficiently
          // BUT the current API design aggregates them.
          // Plan Modification:
          // For now, since caching per-recipe requires the API to return per-recipe data (which `parse-recipe` does but `generate-grocery-list` aggregates),
          // we will just use the aggregated result for the View and NOT persist it back to individual recipes yet.
          // To fully implement the "Cache" plan, we'd need to loop and call `parse` for each recipe or update the API to return grouped data.
          // Given the "Task 5.1" scope, let's just make it work first:
          // We will combine:
          // A) Cached ingredients from recipes that have them
          // B) New API results for the rest

          // Actually, `generate-grocery-list` API was updated to return a flat JSON array.
          // Let's just USE that for the current session.
          // Future optimization: Save these back to recipes.

          setGroceryItems([
            ...recipesToProcess
              .filter((r) => r.structuredIngredients)
              .flatMap((r) => r.structuredIngredients),
            ...ingredients,
          ])
        } else {
          throw new Error('Failed to fetch')
        }
      } catch (err) {
        console.error('Grocery gen failed', err)
        // Fallback: Try to parse locally or show error?
        // Simple fallback: just don't show the missing ones, or show alert.
        alert('Could not generate list from AI. Please check connection.')
      }
    } else {
      // All have data!
      setGroceryItems(recipesToProcess.flatMap((r) => r.structuredIngredients || []))
    }

    setIsGenerating(false)
  }

  // Apply Sorting and Filtering
  const processedRecipes = React.useMemo(() => {
    let result = [...recipes]

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (r) =>
          r.title?.toLowerCase().includes(q) ||
          r.ingredients?.some((i) => i.name.toLowerCase().includes(q)),
      )
    }

    // Filter
    if (filters.difficulty && filters.difficulty.length > 0) {
      result = result.filter((r) => filters.difficulty.includes(r.difficulty))
    }
    if (filters.cuisine && filters.cuisine.length > 0) {
      result = result.filter((r) => filters.cuisine.includes(r.cuisine))
    }
    if (filters.onlyFavorites) {
      result = result.filter((r) => r.isFavorite)
    }

    // Sort
    result.sort((a, b) => {
      // Always put "This Week" at top if sort is 'recent' (default-ish) or maybe a new 'Plan' sort?
      // For now, let's keep standard sorts but maybe we visualize 'This Week' differently

      if (sort === 'protein') {
        const pA = a.protein || 'Other'
        const pB = b.protein || 'Other'
        if (pA === pB) return a.title.localeCompare(b.title)
        return pA.localeCompare(pB)
      }
      if (sort === 'alpha') return a.title.localeCompare(b.title)
      if (sort === 'recent') return parseInt(b.id) - parseInt(a.id) // Assuming ID is timestamp-ish
      if (sort === 'time') return a.prepTime + a.cookTime - (b.prepTime + b.cookTime)
      if (sort === 'rating') {
        const rA = a.rating || 0
        const rB = b.rating || 0
        if (rA === rB) return a.title.localeCompare(b.title)
        return rB - rA
      }
      return 0
    })

    return result
  }, [recipes, searchQuery, filters, sort])

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
      <div className="relative mx-auto flex h-full w-full max-w-2xl flex-col bg-md-sys-color-surface">
        <div className="flex items-center justify-between border-b border-md-sys-color-outline bg-md-sys-color-surface px-6 py-4">
          <h2 className="font-display text-xl font-bold">New Recipe from AI</h2>
          <button
            onClick={() => setView('library')}
            className="rounded-md-full bg-md-sys-color-surface-variant p-1 px-3 text-sm font-medium"
          >
            Cancel
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <RecipeInput
            onRecipeCreated={(recipe) => {
              handleSaveRecipe(recipe)
              setView('library')
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="relative mx-auto flex h-full w-full max-w-2xl flex-col overflow-hidden bg-md-sys-color-surface text-md-sys-color-on-surface shadow-md-3">
      {/* Toast Warning */}
      {proteinWarning && (
        <div className="animate-in slide-in-from-top-2 absolute left-4 right-4 top-20 z-50 flex items-center justify-between rounded-md border border-yellow-200 bg-yellow-50 p-4 text-yellow-800 shadow-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-bold">Variety Check!</p>
              <p className="text-sm">
                You've selected {proteinWarning.count} {proteinWarning.protein} recipes this week.
              </p>
            </div>
          </div>
          <button onClick={() => setProteinWarning(null)}>
            <X className="h-5 w-5 opacity-50 hover:opacity-100" />
          </button>
        </div>
      )}

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
        syncStatus={syncStatus}
        onGenerateList={handleGenerateList}
        onAddAi={() => setView('ai-add')}
        onAddManual={() => {
          setSelectedRecipe({})
          setView('edit')
        }}
        onOpenFilters={() => setFiltersOpen(true)}
        onOpenSettings={() => setView('settings')}
        // Selection Props
        isSelectionMode={isSelectionMode}
        selectedCount={selectedIds.size}
        onCancelSelection={() => {
          setIsSelectionMode(false)
          setSelectedIds(new Set())
        }}
        onDeleteSelection={handleBulkDelete}
      />

      <main className="relative flex-1 overflow-hidden">
        {view === 'library' && (
          <div className="scrollbar-hide h-full overflow-y-auto">
            {/* Selection Trigger (FAB or similiar? Or maybe integrated into library header if we had one) */}
            {/* For now, let's allow entering selection mode via Long Press (simulated by a button in Settings? Or a dedicated button) */}
            {/* Let's add a "Select" button to header? No header is full. */}
            {/* Let's double click to select? Or just add a small "Select" button in the library view if not empty */}

            {!isSelectionMode && recipes.length > 0 && (
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
              sort={sort}
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
            />
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
              onSave={handleSaveRecipe}
              onCancel={() => setView('library')}
              onDelete={handleDeleteRecipe}
            />
          </div>
        )}

        {view === 'grocery' && (
          <GroceryList ingredients={groceryItems} onClose={() => setView('library')} />
        )}
      </main>
    </div>
  )
}

export default RecipeManager

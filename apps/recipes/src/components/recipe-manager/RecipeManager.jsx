import React, { useState, useEffect } from 'react'
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
  MoreHorizontal,
  Sparkles,
} from 'lucide-react'
import PrepMode from './PrepMode'
import { generateGroceryList } from './grocery-utils'
import { RecipeInput } from '../RecipeInput'

const RECIPES_API_URL = '/api/user-data'

// --- Hooks ---

const useRecipes = () => {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState('idle')

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const res = await fetch(RECIPES_API_URL)
        if (res.ok) {
          const data = await res.json()
          setRecipes(Array.isArray(data.recipes) ? data.recipes : [])
        }
      } catch (err) {
        console.error('Failed to fetch recipes', err)
      } finally {
        setLoading(false)
      }
    }
    fetchRecipes()
  }, [])

  useEffect(() => {
    if (loading) return
    const timeoutId = setTimeout(async () => {
      setSyncStatus('syncing')
      try {
        await fetch(RECIPES_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipes }),
        })
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

const RecipeHeader = ({ syncStatus, onGenerateList, onAddAi, onAddManual }) => (
  <header className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-ink bg-white px-6 py-4">
    <div>
      <h1 className="font-display text-2xl font-black tracking-tight">CHEFBOARD</h1>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
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
        onClick={onGenerateList}
        className="rounded-full border-2 border-ink bg-teal p-2 text-ink shadow-hard-sm transition-all hover:translate-y-0.5 hover:shadow-none"
        title="Grocery List"
      >
        <ShoppingBag className="h-5 w-5" />
      </button>

      <button
        onClick={onAddAi}
        className="flex items-center justify-center rounded-full border-2 border-ink bg-purple-200 p-2 text-ink shadow-hard-sm transition-all hover:translate-y-0.5 hover:shadow-none"
        title="AI Add"
      >
        <Sparkles className="h-5 w-5" />
      </button>

      <button
        onClick={onAddManual}
        className="items-center gap-1 rounded-full bg-ink p-2 text-paper shadow-hard-sm transition-all hover:translate-y-0.5 hover:shadow-none"
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>
  </header>
)

const EmptyState = () => (
  <div className="py-20 text-center opacity-50">
    <ChefHat className="mx-auto mb-4 h-16 w-16 text-gray-300" />
    <p className="font-display text-xl">No Recipes Yet</p>
    <p className="font-body">Add your first tasty dish!</p>
  </div>
)

const GroceryView = ({ isGenerating, groceryList, onClose }) => (
  <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
    <div className="mb-4 flex items-center justify-between">
      <h2 className="font-display text-2xl font-bold">Grocery List</h2>
      <button onClick={onClose} className="text-sm font-bold underline">
        Close
      </button>
    </div>
    {isGenerating ? (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-12">
        <Loader2 className="mb-2 h-8 w-8 animate-spin text-teal" />
        <p className="animate-pulse font-bold">Consulting the AI Chef...</p>
      </div>
    ) : (
      <div className="prose prose-sm max-w-none rounded-xl border-2 border-ink bg-white p-6 font-body shadow-hard">
        <div dangerouslySetInnerHTML={{ __html: groceryList.replace(/\n/g, '<br/>') }} />
      </div>
    )}
  </div>
)

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
          className="w-full rounded bg-ink py-1 text-xs font-bold text-white"
        >
          Auto-fill
        </button>
      </div>
    )}
  </div>
)

const RecipeCard = ({ recipe, onEdit, onPrep }) => (
  <div className="group rounded-xl border-2 border-ink bg-white p-4 shadow-hard transition-all hover:-translate-y-0.5">
    <div className="mb-3 flex items-start justify-between">
      <h3 className="font-display text-lg font-bold leading-tight">{recipe.title}</h3>
      <div className="flex gap-1">
        <button
          onClick={onEdit}
          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-ink"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
    <div className="mb-4 flex gap-4 text-xs font-bold uppercase tracking-wider text-gray-500">
      <span>{recipe.prepTime}m Prep</span>
      <span>{recipe.cookTime}m Cook</span>
      <span>{recipe.servings} Serves</span>
    </div>
    <button
      onClick={onPrep}
      className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-ink bg-paper py-2.5 font-bold text-ink transition-colors group-hover:border-ink group-hover:bg-teal"
    >
      <ChefHat className="h-4 w-4" /> Start Cooking
    </button>
  </div>
)

const RecipeTextEditor = ({ label, value, onChange, placeholder }) => (
  <div>
    <label className="mb-1 block text-xs font-bold uppercase text-gray-400">{label}</label>
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="h-32 w-full resize-y rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-sm outline-none focus:border-ink"
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
    onSave({ ...formData, ingredients, steps })
  }

  return (
    <div className="animate-in slide-in-from-bottom-4 space-y-4 rounded-xl border-2 border-ink bg-white p-4 shadow-hard">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">
          {recipe.id ? 'Edit Recipe' : 'New Recipe'}
        </h2>
        <button onClick={onCancel} className="rounded-lg bg-gray-100 p-1 px-3 text-sm font-bold">
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
          className="w-full border-b-2 border-gray-200 py-1 font-display text-xl font-bold placeholder-gray-300 outline-none focus:border-ink"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {['servings', 'prepTime', 'cookTime'].map((k) => (
          <div key={k} className="rounded border border-ink/10 bg-paper p-2">
            <label htmlFor={k} className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
              {k.replace('Time', '')}
            </label>
            <input
              id={k}
              type="number"
              value={formData[k]}
              onChange={(e) => setFormData({ ...formData, [k]: parseInt(e.target.value) || 0 })}
              className="w-full bg-transparent font-bold text-ink outline-none"
            />
          </div>
        ))}
      </div>

      <RecipeTextEditor
        label="Ingredients (One per line)"
        value={ingText}
        onChange={(e) => setIngText(e.target.value)}
        placeholder="2 cups Flour&#10;1 tsp Salt"
      />

      <RecipeTextEditor
        label="Instructions (One per line)"
        value={stepText}
        onChange={(e) => setStepText(e.target.value)}
        placeholder="Mix dry ingredients.&#10;Add wet ingredients."
      />

      <div className="flex gap-2 pt-4">
        {recipe.id && (
          <button
            onClick={() => onDelete(recipe.id)}
            className="rounded-xl border border-red-100 bg-red-50 p-3 font-bold text-red-500"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        )}
        <button
          onClick={handleInternalSave}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-ink py-3 font-bold text-white shadow-hard transition active:translate-y-1 active:shadow-none"
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
  const [prepState, setPrepState] = useState({})
  const [view, setView] = useState('list')
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [groceryList, setGroceryList] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const handleSaveRecipe = (recipe) => {
    if (recipes.find((r) => r.id === recipe.id)) {
      setRecipes(recipes.map((r) => (r.id === recipe.id ? recipe : r)))
    } else {
      setRecipes([...recipes, recipe])
    }
    setView('list')
    setSelectedRecipe(null)
  }

  const handleDeleteRecipe = (id) => {
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      setRecipes(recipes.filter((r) => r.id !== id))
      setView('list')
      setSelectedRecipe(null)
    }
  }

  const handleTogglePrep = (recipeId, stepIdx) => {
    setPrepState((prev) => ({
      ...prev,
      [recipeId]: {
        ...prev[recipeId],
        [stepIdx]: !prev[recipeId]?.[stepIdx],
      },
    }))
  }

  const handleGenerateList = async () => {
    setIsGenerating(true)
    setView('grocery')
    const list = await generateGroceryList(recipes)
    setGroceryList(list)
    setIsGenerating(false)
  }

  // --- RENDER ---
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-paper">
        <Loader2 className="h-8 w-8 animate-spin text-ink" />
      </div>
    )
  }

  if (view === 'prep' && selectedRecipe) {
    return (
      <PrepMode
        recipe={selectedRecipe}
        prepState={prepState}
        togglePrep={handleTogglePrep}
        onClose={() => setView('list')}
      />
    )
  }

  if (view === 'ai-add') {
    return (
      <div className="relative mx-auto flex h-full w-full max-w-2xl flex-col bg-paper">
        <div className="flex items-center justify-between border-b-2 border-ink bg-white px-6 py-4">
          <h2 className="font-display text-xl font-bold">New Recipe from AI</h2>
          <button
            onClick={() => setView('list')}
            className="rounded-lg bg-gray-100 p-1 px-3 text-sm font-bold"
          >
            Cancel
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <RecipeInput
            onRecipeCreated={(recipe) => {
              handleSaveRecipe(recipe)
              setView('list')
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="relative mx-auto flex h-full w-full max-w-2xl flex-col bg-paper text-ink shadow-2xl">
      <RecipeHeader
        syncStatus={syncStatus}
        onGenerateList={handleGenerateList}
        onAddAi={() => setView('ai-add')}
        onAddManual={() => {
          setSelectedRecipe(null)
          setView('edit')
        }}
      />

      <main className="scrollbar-hide flex-1 space-y-4 overflow-y-auto p-4 pb-20">
        {view === 'list' && (
          <div className="space-y-4">
            {recipes.length === 0 && <EmptyState />}
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onEdit={() => {
                  setSelectedRecipe(recipe)
                  setView('edit')
                }}
                onPrep={() => {
                  setSelectedRecipe(recipe)
                  setView('prep')
                }}
              />
            ))}
          </div>
        )}

        {view === 'edit' && (
          <RecipeEditor
            recipe={selectedRecipe || {}}
            onSave={handleSaveRecipe}
            onCancel={() => setView('list')}
            onDelete={handleDeleteRecipe}
          />
        )}

        {view === 'grocery' && (
          <GroceryView
            isGenerating={isGenerating}
            groceryList={groceryList}
            onClose={() => setView('list')}
          />
        )}
      </main>
    </div>
  )
}

export default RecipeManager

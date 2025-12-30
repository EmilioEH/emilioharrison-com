import React, { useState } from 'react'
import { Trash2, Save } from 'lucide-react'
import { AiImporter } from './AiImporter'
import type { Recipe, Ingredient } from '../../lib/types'

// AiImporter replaced the legacy QuickImport functionality

interface RecipeTextEditorProps {
  label: string
  id: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder: string
}

const RecipeTextEditor: React.FC<RecipeTextEditorProps> = ({
  label,
  id,
  value,
  onChange,
  placeholder,
}) => (
  <div>
    <label htmlFor={id} className="mb-1 block text-xs font-bold uppercase text-gray-400">
      {label}
    </label>
    <textarea
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="bg-card-variant h-32 w-full resize-y rounded-sm border border-border p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-primary"
    />
  </div>
)

interface RecipeEditorProps {
  recipe: Partial<Recipe>
  onSave: (recipe: Partial<Recipe>) => Promise<void> | void
  onCancel: () => void
  onDelete: (id: string) => void
}

export const RecipeEditor: React.FC<RecipeEditorProps> = ({
  recipe,
  onSave,
  onCancel,
  onDelete,
}) => {
  const [formData, setFormData] = useState<Partial<Recipe>>(() => {
    if (recipe.id) return recipe
    return {
      title: '',
      servings: 2,
      prepTime: 15,
      cookTime: 15,
      ingredients: [],
      steps: [],
      notes: '',
      protein: '',
      mealType: '',
      dishType: '',
      equipment: [],
      occasion: [],
      dietary: [],
      difficulty: 'Medium',
      rating: 0,
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versionHistory: [],
    }
  })

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

  const handleRecipeParsed = (parsed: Recipe) => {
    setFormData((prev) => ({
      ...prev,
      ...parsed,
      updatedAt: new Date().toISOString(),
    }))

    if (parsed.ingredients) {
      setIngText(
        parsed.ingredients
          .map((i) => {
            const prepStr = i.prep ? ` (${i.prep})` : ''
            return `${i.amount} ${i.name}${prepStr}`
          })
          .join('\n'),
      )
    }

    if (parsed.steps) {
      setStepText(parsed.steps.join('\n'))
    }
  }

  const handleInternalSave = async () => {
    const ingredients: Ingredient[] = ingText
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
    } as const

    const newVersionHistory = [...(formData.versionHistory || []), historyEntry]

    await onSave({
      ...formData,
      ingredients,
      steps,
      updatedAt: now,
      createdAt: formData.createdAt || now, // Ensure backfill
      versionHistory: newVersionHistory,
    })
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm animate-in slide-in-from-bottom-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">
          {recipe.id ? 'Edit Recipe' : 'New Recipe'}
        </h2>
        <button
          onClick={onCancel}
          className="bg-card-variant rounded-full p-1 px-3 text-sm font-medium"
        >
          Cancel
        </button>
      </div>

      {!recipe.id && <AiImporter onRecipeParsed={handleRecipeParsed} />}

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
          className="placeholder-foreground-variant/30 w-full border-b border-border bg-transparent py-1 font-display text-xl font-medium outline-none focus:border-primary"
        />
      </div>

      <div>
        <label htmlFor="sourceUrl" className="mb-1 block text-xs font-bold uppercase text-gray-400">
          Source URL
        </label>
        <input
          id="sourceUrl"
          type="url"
          value={formData.sourceUrl || ''}
          onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
          placeholder="https://example.com/recipe"
          className="bg-card-variant w-full rounded-sm border border-border p-2 text-sm font-medium outline-none"
        />
      </div>

      {formData.sourceImage && (
        <div>
          <div className="mb-1 block text-xs font-bold uppercase text-gray-400">Source Image</div>
          <div className="relative h-48 w-full overflow-hidden rounded-xl border border-border">
            <img
              src={formData.sourceImage}
              alt="Recipe Source"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="protein" className="mb-1 block text-xs font-bold uppercase text-gray-400">
            Protein
          </label>
          <select
            id="protein"
            value={formData.protein || ''}
            onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
            className="bg-card-variant w-full rounded-sm border border-border p-2 text-sm font-medium"
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
            onChange={(e) =>
              setFormData({
                ...formData,
                difficulty: e.target.value as 'Easy' | 'Medium' | 'Hard',
              })
            }
            className="bg-card-variant w-full rounded-sm border border-border p-2 text-sm font-medium"
          >
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="mealType"
            className="mb-1 block text-xs font-bold uppercase text-gray-400"
          >
            Meal Type
          </label>
          <select
            id="mealType"
            value={formData.mealType || ''}
            onChange={(e) => setFormData({ ...formData, mealType: e.target.value })}
            className="bg-card-variant w-full rounded-sm border border-border p-2 text-sm font-medium"
          >
            <option value="">Select...</option>
            {['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Snack', 'Dessert'].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="dishType"
            className="mb-1 block text-xs font-bold uppercase text-gray-400"
          >
            Dish Type
          </label>
          <select
            id="dishType"
            value={formData.dishType || ''}
            onChange={(e) => setFormData({ ...formData, dishType: e.target.value })}
            className="bg-card-variant w-full rounded-sm border border-border p-2 text-sm font-medium"
          >
            <option value="">Select...</option>
            {['Main', 'Side', 'Appetizer', 'Salad', 'Soup', 'Drink', 'Sauce'].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <label htmlFor="dietary" className="mb-1 block text-xs font-bold uppercase text-gray-400">
            Dietary Tags
          </label>
          <input
            id="dietary"
            value={formData.dietary?.join(', ') || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                dietary: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Vegan, Gluten-Free..."
            className="bg-card-variant w-full rounded-sm border border-border p-2 text-sm font-medium outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="equipment"
            className="mb-1 block text-xs font-bold uppercase text-gray-400"
          >
            Equipment
          </label>
          <input
            id="equipment"
            value={formData.equipment?.join(', ') || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                equipment: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Air Fryer, Slow Cooker..."
            className="bg-card-variant w-full rounded-sm border border-border p-2 text-sm font-medium outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="occasion"
            className="mb-1 block text-xs font-bold uppercase text-gray-400"
          >
            Occasion
          </label>
          <input
            id="occasion"
            value={formData.occasion?.join(', ') || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                occasion: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Weeknight, Party..."
            className="bg-card-variant w-full rounded-sm border border-border p-2 text-sm font-medium outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(['servings', 'prepTime', 'cookTime'] as const).map((k) => (
          <div key={k} className="bg-card-variant rounded-sm border border-border p-2">
            <label
              htmlFor={k}
              className="text-foreground-variant mb-1 block text-[10px] font-medium uppercase"
            >
              {k.replace('Time', '')}
            </label>
            <input
              id={k}
              type="number"
              value={formData[k] as number}
              onChange={(e) => setFormData({ ...formData, [k]: parseInt(e.target.value) || 0 })}
              className="w-full bg-transparent font-medium text-foreground outline-none"
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
            onClick={() => onDelete(recipe.id!)}
            className="border-md-sys-color-error-container bg-md-sys-color-error-container text-md-sys-color-on-error-container rounded-xl border p-3 font-medium"
            title="Delete Recipe"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        )}
        <button
          onClick={handleInternalSave}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-3 font-medium text-primary-foreground shadow-sm transition hover:shadow-md active:shadow-none"
        >
          <Save className="h-4 w-4" /> Save Recipe
        </button>
      </div>
    </div>
  )
}

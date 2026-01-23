import React, { useState } from 'react'
import { Save, Trash2 } from 'lucide-react'
import { Stack, Inline, Cluster } from '@/components/ui/layout'
import { AiImporter } from './importer/AiImporter'
import type { Recipe, Ingredient } from '../../lib/types'
import { confirm } from '../../lib/dialogStore'

interface RecipeEditorProps {
  recipe: Partial<Recipe>
  onSave: (recipe: Partial<Recipe>) => void
  onCancel: () => void
  onDelete: (id: string) => void
  isEmbedded?: boolean
  candidateImages?: Array<{ url: string; alt?: string; isDefault?: boolean }>
  onImageSelect?: (url: string) => void
}

export const RecipeEditor: React.FC<RecipeEditorProps> = ({
  recipe,
  onSave,
  onCancel,
  onDelete,
  isEmbedded = false,
  candidateImages = [],
  onImageSelect,
}) => {
  const [formData, setFormData] = useState<Partial<Recipe>>(recipe)

  // Initial load helpers
  const [ingText, setIngText] = useState(() => {
    if (!recipe.ingredients) return ''
    return recipe.ingredients
      .map((i) => {
        const prepStr = i.prep ? ` (${i.prep})` : ''
        return `${i.amount || ''} ${i.name}${prepStr}`.trim()
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
      const text = parsed.ingredients
        .map((i) => {
          const prepStr = i.prep ? ` (${i.prep})` : ''
          return `${i.amount || ''} ${i.name}${prepStr}`.trim()
        })
        .join('\n')
      setIngText(text)
    }

    if (parsed.steps) {
      setStepText(parsed.steps.join('\n'))
    }
  }

  const parseIngredients = (text: string): Ingredient[] => {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        // Regex to capture amount, name, and optional prep in parentheses
        const match = line.match(
          /^(?:(\d+\s*\S*(?:\s*\d+\/\d+)?)\s*)?([^(\n]*?)(?:\s*\(([^)]+)\))?$/,
        )
        if (match) {
          const amount = match[1]?.trim() || ''
          const name = match[2]?.trim() || ''
          const prep = match[3]?.trim() || ''
          return { amount, name, prep: prep || undefined }
        }
        return { name: line, amount: '', prep: undefined } // Fallback if regex fails
      })
  }

  const handleInternalSave = () => {
    const updatedFormData = {
      ...formData,
      ingredients: parseIngredients(ingText),
      steps: stepText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    }
    onSave(updatedFormData)
  }

  const containerClasses = isEmbedded
    ? 'space-y-4'
    : 'bg-card animate-in slide-in-from-bottom-4 space-y-4 rounded-xl border border-border p-4 shadow-sm'

  return (
    <Stack spacing="md" className={containerClasses}>
      {!isEmbedded && (
        <Inline justify="between" className="mb-2">
          <h2 className="font-display text-xl font-bold">
            {recipe.id ? 'Edit Recipe' : 'New Recipe'}
          </h2>
          <button
            onClick={onCancel}
            className="bg-card-variant rounded-full p-1 px-3 text-sm font-medium"
          >
            Cancel
          </button>
        </Inline>
      )}

      {!recipe.id && <AiImporter onRecipeParsed={handleRecipeParsed} />}

      {formData.creationMethod === 'ai-infer' && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
          <p className="font-bold">✨ AI-Inferred Recipe</p>
          <p className="text-xs opacity-90">
            This recipe was reverse-engineered from a photo. Ingredients and amounts are estimates.
          </p>
        </div>
      )}

      <Stack spacing="md">
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase text-gray-400">Title</span>
          <input
            type="text"
            value={formData.title || ''}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="bg-card-variant w-full rounded-lg border border-border p-3 font-display text-lg font-bold placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="e.g. Spicy Miso Ramen"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase text-gray-400">Description</span>
          <textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="bg-card-variant min-h-[80px] w-full rounded-lg border border-border p-3 text-base placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Brief description of the dish..."
          />
        </label>
      </Stack>

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
          className="bg-card-variant w-full rounded-lg border border-border p-3 text-base font-medium outline-none"
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

      <Stack spacing="sm">
        <label
          htmlFor="sourceimage-url"
          className="mb-1 block text-xs font-bold uppercase text-gray-400"
        >
          Source Image
        </label>
        <div className="flex gap-2">
          <input
            id="sourceimage-url"
            type="url"
            value={formData.sourceImage || ''}
            onChange={(e) => setFormData({ ...formData, sourceImage: e.target.value })}
            className="bg-card-variant w-full rounded-lg border border-border p-3 text-base"
            placeholder="https://..."
          />
        </div>
      </Stack>

      {/* Image Selector for URL imports */}
      {candidateImages.length > 0 && onImageSelect && (
        <ImageSelector
          images={candidateImages}
          selectedImage={formData.sourceImage || null}
          onSelect={(url) => {
            setFormData({ ...formData, sourceImage: url })
            onImageSelect(url)
          }}
        />
      )}

      <Cluster spacing="md">
        <div className="min-w-[45%] flex-1">
          <label htmlFor="protein" className="mb-1 block text-xs font-bold uppercase text-gray-400">
            Protein
          </label>
          <select
            id="protein"
            value={formData.protein || ''}
            onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
            className="bg-card-variant w-full rounded-lg border border-border p-3 text-base font-medium"
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
        <div className="min-w-[45%] flex-1">
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
            className="bg-card-variant w-full rounded-lg border border-border p-3 text-base font-medium"
          >
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>
      </Cluster>

      <Cluster spacing="md">
        <div className="min-w-[45%] flex-1">
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
            className="bg-card-variant w-full rounded-lg border border-border p-3 text-base font-medium"
          >
            <option value="">Select...</option>
            {['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Snack', 'Dessert'].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[45%] flex-1">
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
            className="bg-card-variant w-full rounded-lg border border-border p-3 text-base font-medium"
          >
            <option value="">Select...</option>
            {['Main', 'Side', 'Appetizer', 'Salad', 'Soup', 'Drink', 'Sauce'].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </Cluster>

      <div>
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
            className="bg-card-variant w-full rounded-lg border border-border p-3 text-base font-medium outline-none"
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
            className="bg-card-variant w-full rounded-lg border border-border p-3 text-base font-medium outline-none"
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
            className="bg-card-variant w-full rounded-lg border border-border p-3 text-base font-medium outline-none"
          />
        </div>
      </div>

      <Cluster spacing="sm">
        {(['servings', 'prepTime', 'cookTime'] as const).map((k) => (
          <div
            key={k}
            className="bg-card-variant min-w-[30%] flex-1 rounded-sm border border-border p-2"
          >
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
      </Cluster>

      <div>
        <label
          htmlFor="ingredients-editor"
          className="mb-1 block text-xs font-bold uppercase text-gray-400"
        >
          Ingredients (One per line)
        </label>
        <textarea
          id="ingredients-editor"
          value={ingText}
          onChange={(e) => setIngText(e.target.value)}
          placeholder="2 cups Flour&#10;1 tsp Salt"
          className="bg-card-variant min-h-[120px] w-full rounded-lg border border-border p-3 font-mono text-base placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div>
        <label
          htmlFor="instructions-editor"
          className="mb-1 block text-xs font-bold uppercase text-gray-400"
        >
          Instructions (One per line)
        </label>
        <textarea
          id="instructions-editor"
          value={stepText}
          onChange={(e) => setStepText(e.target.value)}
          placeholder="Mix dry ingredients.&#10;Add wet ingredients."
          className="bg-card-variant min-h-[120px] w-full rounded-lg border border-border p-3 font-mono text-base placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Actions */}
      <Inline spacing="sm" className="pt-4">
        <button
          onClick={handleInternalSave}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-foreground py-3 font-bold text-background shadow-lg transition-transform hover:scale-[1.02]"
        >
          <Save className="h-4 w-4" /> Save Recipe
        </button>

        {recipe.id && (
          <button
            onClick={() => {
              confirm('Delete this recipe?').then((confirmed) => {
                if (confirmed) {
                  onDelete(recipe.id!)
                }
              })
            }}
            className="bg-card-variant flex items-center justify-center rounded-full p-3 text-red-500 hover:bg-red-500/10"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        )}
      </Inline>
    </Stack>
  )
}

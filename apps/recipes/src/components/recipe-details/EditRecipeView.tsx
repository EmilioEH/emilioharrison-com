import React, { useState } from 'react'
import type { Recipe, Ingredient, RecipeVersion } from '../../lib/types'
import { Stack, Inline, Cluster } from '../ui/layout'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Plus, Trash2, GripVertical, RotateCcw } from 'lucide-react'
import { HistoryModal } from './HistoryModal'

interface EditRecipeViewProps {
  recipe: Recipe
  onSave: (updatedRecipe: Recipe) => Promise<void>
  onCancel: () => void
}

export const EditRecipeView: React.FC<EditRecipeViewProps> = ({ recipe, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Recipe>({ ...recipe })
  const [isSaving, setIsSaving] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const handleTextChange = (field: keyof Recipe, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleNumberChange = (field: keyof Recipe, value: string) => {
    const num = value === '' ? undefined : Number(value)
    setFormData((prev) => ({ ...prev, [field]: num }))
  }

  // --- Ingredients Management ---
  const handleIngredientChange = (index: number, field: keyof Ingredient, value: string) => {
    const newIngredients = [...(formData.ingredients || [])]
    newIngredients[index] = { ...newIngredients[index], [field]: value }
    setFormData((prev) => ({ ...prev, ingredients: newIngredients }))
  }

  const addIngredient = () => {
    setFormData((prev) => ({
      ...prev,
      ingredients: [...(prev.ingredients || []), { name: '', amount: '' }],
    }))
  }

  const removeIngredient = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }))
  }

  // --- Steps Management ---
  const handleStepChange = (index: number, value: string) => {
    const newSteps = [...(formData.steps || [])]
    newSteps[index] = value
    setFormData((prev) => ({ ...prev, steps: newSteps }))
  }

  const addStep = () => {
    setFormData((prev) => ({
      ...prev,
      steps: [...(prev.steps || []), ''],
    }))
  }

  const removeStep = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index),
    }))
  }

  // --- Images Management ---
  // Note: Actual image upload is handled by Carousel/OverviewMode logic usually.
  // Here we can allow reordering or deleting if we had the UI hooks.
  // For now, let's allow removing images from the list.

  const removeImage = (url: string) => {
    const newImages = (formData.images || []).filter((img) => img !== url)
    // Also clear legacy fields if they match
    let newSource = formData.sourceImage
    let newFinished = formData.finishedImage
    if (newSource === url) newSource = undefined
    if (newFinished === url) newFinished = undefined

    setFormData((prev) => ({
      ...prev,
      images: newImages,
      sourceImage: newSource,
      finishedImage: newFinished,
    }))
  }

  const displayImages = formData.images?.length
    ? formData.images
    : ([formData.finishedImage || formData.sourceImage].filter(Boolean) as string[])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(formData)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRestore = (version: RecipeVersion) => {
    // In a real app we might diff or confirm.
    // Ideally we replace the formData with version.data
    // BUT we need to keep the ID and maybe some other fields if they aren't in the snapshot?
    // For now, assume snapshot is full recipe
    const restored = { ...version.data, id: recipe.id } // Ensure ID is stable
    setFormData(restored as Recipe)
    setHistoryOpen(false)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Sticky Header for Edit View */}
      <div className="z-10 flex items-center justify-between border-b bg-background/80 p-4 backdrop-blur-md">
        <h2 className="font-display text-lg font-bold">Edit Recipe</h2>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setHistoryOpen(true)}>
            <RotateCcw className="mr-2 h-4 w-4" /> History
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-24">
        <Stack spacing="xl">
          {/* Basic Info */}
          <Stack spacing="md">
            <div className="grid gap-2">
              <Label htmlFor="title">Recipe Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleTextChange('title', e.target.value)}
                className="text-lg font-bold"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleTextChange('description', e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="source">Source URL</Label>
              <Input
                id="source"
                value={formData.sourceUrl || ''}
                onChange={(e) => handleTextChange('sourceUrl', e.target.value)}
                placeholder="https://..."
              />
            </div>
          </Stack>

          {/* Categories & Details */}
          <Stack spacing="md">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Categories
            </h3>

            <Cluster spacing="md">
              <div className="min-w-[45%] flex-1 grid gap-2">
                <Label htmlFor="protein">Protein</Label>
                <select
                  id="protein"
                  value={formData.protein || ''}
                  onChange={(e) => handleTextChange('protein', e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                >
                  <option value="">None</option>
                  {['Chicken', 'Beef', 'Pork', 'Fish', 'Seafood', 'Vegetarian', 'Vegan', 'Other'].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="min-w-[45%] flex-1 grid gap-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <select
                  id="difficulty"
                  value={formData.difficulty || ''}
                  onChange={(e) => handleTextChange('difficulty', e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                >
                  <option value="">Select...</option>
                  {(['Easy', 'Medium', 'Hard'] as const).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </Cluster>

            <Cluster spacing="md">
              <div className="min-w-[45%] flex-1 grid gap-2">
                <Label htmlFor="mealType">Meal Type</Label>
                <select
                  id="mealType"
                  value={formData.mealType || ''}
                  onChange={(e) => handleTextChange('mealType', e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                >
                  <option value="">Select...</option>
                  {['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Snack', 'Dessert'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="min-w-[45%] flex-1 grid gap-2">
                <Label htmlFor="dishType">Dish Type</Label>
                <select
                  id="dishType"
                  value={formData.dishType || ''}
                  onChange={(e) => handleTextChange('dishType', e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
                >
                  <option value="">Select...</option>
                  {['Main', 'Side', 'Appetizer', 'Salad', 'Soup', 'Drink', 'Sauce'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </Cluster>

            <Cluster spacing="sm">
              <div className="min-w-[30%] flex-1 grid gap-2">
                <Label htmlFor="servings">Servings</Label>
                <Input
                  id="servings"
                  type="number"
                  min={1}
                  value={formData.servings ?? ''}
                  onChange={(e) => handleNumberChange('servings', e.target.value)}
                  placeholder="4"
                />
              </div>
              <div className="min-w-[30%] flex-1 grid gap-2">
                <Label htmlFor="prepTime">Prep (min)</Label>
                <Input
                  id="prepTime"
                  type="number"
                  min={0}
                  value={formData.prepTime ?? ''}
                  onChange={(e) => handleNumberChange('prepTime', e.target.value)}
                  placeholder="15"
                />
              </div>
              <div className="min-w-[30%] flex-1 grid gap-2">
                <Label htmlFor="cookTime">Cook (min)</Label>
                <Input
                  id="cookTime"
                  type="number"
                  min={0}
                  value={formData.cookTime ?? ''}
                  onChange={(e) => handleNumberChange('cookTime', e.target.value)}
                  placeholder="30"
                />
              </div>
            </Cluster>

            <Cluster spacing="md">
              <div className="min-w-[45%] flex-1 grid gap-2">
                <Label htmlFor="cuisine">Cuisine</Label>
                <Input
                  id="cuisine"
                  value={formData.cuisine || ''}
                  onChange={(e) => handleTextChange('cuisine', e.target.value)}
                  placeholder="Italian, Mexican..."
                />
              </div>
              <div className="min-w-[45%] flex-1 grid gap-2">
                <Label htmlFor="estimatedCost">Est. Cost ($)</Label>
                <Input
                  id="estimatedCost"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.estimatedCost ?? ''}
                  onChange={(e) => handleNumberChange('estimatedCost', e.target.value)}
                  placeholder="12.50"
                />
              </div>
            </Cluster>

            <div className="grid gap-2">
              <Label htmlFor="dietary">Dietary Tags</Label>
              <Input
                id="dietary"
                value={formData.dietary?.join(', ') || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    dietary: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  }))
                }
                placeholder="Gluten-Free, Dairy-Free..."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="equipment">Equipment</Label>
              <Input
                id="equipment"
                value={formData.equipment?.join(', ') || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    equipment: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  }))
                }
                placeholder="Air Fryer, Slow Cooker..."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="occasion">Occasion</Label>
              <Input
                id="occasion"
                value={formData.occasion?.join(', ') || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    occasion: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  }))
                }
                placeholder="Weeknight, Party, Meal Prep..."
              />
            </div>
          </Stack>

          {/* Images */}
          <Stack spacing="md">
            <Label>Photos</Label>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {displayImages.map((src, idx) => (
                <div
                  key={idx}
                  className="group relative aspect-square overflow-hidden rounded-lg border"
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => removeImage(src)}
                    className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition-opacity hover:bg-red-500 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sourceImage">Hero Image URL</Label>
              <Input
                id="sourceImage"
                type="url"
                value={formData.sourceImage || ''}
                onChange={(e) => handleTextChange('sourceImage', e.target.value)}
                placeholder="https://..."
              />
            </div>
          </Stack>

          {/* Ingredients */}
          <Stack spacing="md">
            <Inline justify="between">
              <Label className="text-lg">Ingredients</Label>
              <Button variant="ghost" size="sm" onClick={addIngredient}>
                <Plus className="mr-1 h-4 w-4" /> Add Ingredient
              </Button>
            </Inline>
            <div className="space-y-2">
              {formData.ingredients.map((ing, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <div className="cursor-move pt-3 text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <Input
                    value={ing.amount}
                    onChange={(e) => handleIngredientChange(idx, 'amount', e.target.value)}
                    placeholder="Qty"
                    className="w-20 shrink-0"
                  />
                  <Input
                    value={ing.name}
                    onChange={(e) => handleIngredientChange(idx, 'name', e.target.value)}
                    placeholder="Ingredient name"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeIngredient(idx)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Stack>

          {/* Steps */}
          <Stack spacing="md">
            <Inline justify="between">
              <Label className="text-lg">Instructions</Label>
              <Button variant="ghost" size="sm" onClick={addStep}>
                <Plus className="mr-1 h-4 w-4" /> Add Step
              </Button>
            </Inline>
            <div className="space-y-4">
              {formData.steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="w-6 pt-3 text-center text-sm font-bold text-muted-foreground">
                    {idx + 1}
                  </span>
                  <Textarea
                    value={step}
                    onChange={(e) => handleStepChange(idx, e.target.value)}
                    className="min-h-[80px] flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeStep(idx)}
                    className="mt-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Stack>

          {/* Notes */}
          <Stack spacing="md">
            <Label htmlFor="notes">Chef's Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => handleTextChange('notes', e.target.value)}
              className="min-h-[100px]"
            />
          </Stack>
        </Stack>
      </div>

      <HistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        versions={recipe.versions || []}
        onRestore={handleRestore}
      />
    </div>
  )
}

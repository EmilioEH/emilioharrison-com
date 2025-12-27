import React, { useState } from 'react'
import { Camera, Link as LinkIcon, Loader2, ChefHat, Save, Trash2, Upload } from 'lucide-react'
import { Button } from './ui/Button'
// import BrutalCard from './ui/BrutalCard'
import type { Recipe } from '../lib/types'

type InputMode = 'photo' | 'url'
type Status = 'idle' | 'processing' | 'review' | 'saving' | 'success' | 'error'

// --- Sub-Components ---

const SuccessView = ({ onReset }: { onReset: () => void }) => (
  <div className="animate-in fade-in zoom-in flex flex-col items-center justify-center space-y-4 py-12 text-center duration-300">
    <div className="rounded-full bg-md-sys-color-primary-container p-4 text-md-sys-color-on-primary-container">
      <ChefHat className="h-12 w-12" />
    </div>
    <h2 className="font-display text-2xl font-bold text-md-sys-color-on-surface">Recipe Saved!</h2>
    <p className="max-w-xs text-md-sys-color-on-surface-variant">
      Your delicious new recipe has been added to your collection.
    </p>
    <div className="flex gap-4">
      <Button onClick={onReset}>Add Another</Button>
      <Button intent="secondary" href=".">
        View All
      </Button>
    </div>
  </div>
)

const LinkPlaceholder = () => (
  <div className="bg-md-sys-color-surface-variant/20 flex h-20 w-20 items-center justify-center rounded-md-s border border-md-sys-color-outline shadow-md-1">
    <LinkIcon className="h-8 w-8 text-md-sys-color-on-surface-variant" />
  </div>
)

const ImageThumbnail = ({ src }: { src: string }) => (
  <img src={src} alt="Recipe Source" className="h-20 w-20 rounded-md-s object-cover shadow-md-1" />
)

const SourcePreview = ({
  mode,
  imagePreview,
  url,
}: {
  mode: InputMode
  imagePreview: string | null
  url: string
}) => (
  <div className="bg-md-sys-color-surface-variant/20 flex items-center gap-4 rounded-md-xl border border-md-sys-color-outline p-4">
    {mode === 'photo' && imagePreview ? <ImageThumbnail src={imagePreview} /> : <LinkPlaceholder />}
    <div className="text-sm">
      <p className="text-xs font-medium uppercase text-md-sys-color-on-surface-variant">Source</p>
      <p className="line-clamp-1 font-medium text-md-sys-color-on-surface">
        {mode === 'photo' ? 'Uploaded Image' : url}
      </p>
    </div>
  </div>
)

const SourceToggle = ({ mode, setMode }: { mode: InputMode; setMode: (m: InputMode) => void }) => (
  <div className="mb-6 flex border-b border-md-sys-color-outline">
    <button
      className={`flex-1 py-3 text-center font-medium uppercase tracking-wider transition-colors ${
        mode === 'photo'
          ? 'bg-md-sys-color-primary text-md-sys-color-on-primary'
          : 'hover:bg-md-sys-color-primary/[0.08] text-md-sys-color-on-surface-variant'
      }`}
      onClick={() => setMode('photo')}
    >
      <div className="flex items-center justify-center gap-2">
        <Camera className="h-4 w-4" /> Photo
      </div>
    </button>
    <button
      className={`flex-1 py-3 text-center font-medium uppercase tracking-wider transition-colors ${
        mode === 'url'
          ? 'bg-md-sys-color-primary text-md-sys-color-on-primary'
          : 'hover:bg-md-sys-color-primary/[0.08] text-md-sys-color-on-surface-variant'
      }`}
      onClick={() => setMode('url')}
    >
      <div className="flex items-center justify-center gap-2">
        <LinkIcon className="h-4 w-4" /> URL
      </div>
    </button>
  </div>
)

const PhotoUploader = ({
  imagePreview,
  setImagePreview,
  handleFileChange,
}: {
  imagePreview: string | null
  setImagePreview: (s: string | null) => void
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) => (
  <div
    className={`bg-md-sys-color-surface-variant/10 flex h-64 w-full flex-col items-center justify-center rounded-md-xl border border-dashed border-md-sys-color-outline transition-colors ${
      imagePreview ? 'border-none p-0' : 'group relative'
    }`}
  >
    {imagePreview ? (
      <div className="relative h-full w-full">
        <img
          src={imagePreview}
          className="h-full w-full rounded-md-xl object-cover"
          alt="Preview"
        />
        <button
          onClick={() => setImagePreview(null)}
          className="bg-md-sys-color-surface/90 absolute right-2 top-2 rounded-full p-2 shadow-md-1 hover:text-md-sys-color-error"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    ) : (
      <div className="flex w-full flex-col items-center gap-4 p-6">
        <div className="mb-2 rounded-full bg-md-sys-color-surface p-4 shadow-md-1">
          <Upload className="h-8 w-8 text-md-sys-color-on-surface-variant" />
        </div>
        <p className="text-sm font-medium text-md-sys-color-on-surface-variant">
          Add a photo of your dish
        </p>

        <div className="flex w-full gap-3">
          <div className="relative flex-1">
            <Button fullWidth intent="secondary">
              <Upload className="mr-2 h-4 w-4" /> Gallery
            </Button>
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={handleFileChange}
            />
          </div>

          <div className="relative flex-1">
            <Button fullWidth>
              <Camera className="mr-2 h-4 w-4" /> Camera
            </Button>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={handleFileChange}
            />
          </div>
        </div>
      </div>
    )}
  </div>
)

interface RecipeReviewFormProps {
  formData: Partial<Recipe>
  setFormData: React.Dispatch<React.SetStateAction<Partial<Recipe>>>
  imagePreview: string | null
  url: string
  mode: InputMode
  status: Status
  onSave: () => void
  onCancel: () => void
}

const RecipeReviewForm = ({
  formData,
  setFormData,
  imagePreview,
  url,
  mode,
  status,
  onSave,
  onCancel,
}: RecipeReviewFormProps) => {
  const ingredientsText = Array.isArray(formData.ingredients)
    ? formData.ingredients
        .map((i) => (typeof i === 'string' ? i : `${i.amount} ${i.name}`))
        .join('\n')
    : ''
  const instructionsText = formData.steps?.join('\n') || ''

  return (
    <div className="animate-in slide-in-from-right-8 space-y-6 duration-300">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Review & Edit</h2>
        <Button intent="tertiary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      <SourcePreview mode={mode} imagePreview={imagePreview} url={url} />

      <div className="space-y-4">
        <div>
          <label
            htmlFor="title"
            className="mb-1 block text-xs font-medium uppercase text-md-sys-color-on-surface-variant"
          >
            Title
          </label>
          <input
            id="title"
            className="w-full border-b border-md-sys-color-outline bg-transparent py-2 font-display text-xl font-medium outline-none focus:border-md-sys-color-primary"
            value={formData.title || ''}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Recipe Title"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          {['servings', 'prepTime', 'cookTime'].map((field) => (
            <div
              key={field}
              className="rounded-md-s border border-md-sys-color-outline bg-md-sys-color-surface p-2"
            >
              <label
                htmlFor={field}
                className="mb-1 block text-[10px] font-medium uppercase text-md-sys-color-on-surface-variant"
              >
                {field.replace('Time', '')}
              </label>
              <input
                id={field}
                type="number"
                className="w-full bg-transparent text-lg font-medium outline-none"
                value={(formData[field as keyof Recipe] as number) || ''}
                onChange={(e) =>
                  setFormData({ ...formData, [field]: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="protein-select"
              className="mb-1 block text-xs font-medium uppercase text-md-sys-color-on-surface-variant"
            >
              Protein
            </label>
            <select
              id="protein-select"
              className="w-full rounded-md-s border border-md-sys-color-outline bg-md-sys-color-surface p-2 font-medium outline-none focus:ring-2 focus:ring-md-sys-color-primary"
              value={formData.protein || ''}
              onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
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
              htmlFor="difficulty-select"
              className="mb-1 block text-xs font-medium uppercase text-md-sys-color-on-surface-variant"
            >
              Difficulty
            </label>
            <select
              id="difficulty-select"
              className="w-full rounded-md-s border border-md-sys-color-outline bg-md-sys-color-surface p-2 font-medium outline-none focus:ring-2 focus:ring-md-sys-color-primary"
              value={formData.difficulty || 'Medium'}
              // @ts-expect-error - difficulty type literal
              onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="cuisine"
            className="mb-1 block text-xs font-medium uppercase text-md-sys-color-on-surface-variant"
          >
            Cuisine
          </label>
          <input
            id="cuisine"
            className="w-full border-b border-md-sys-color-outline bg-transparent py-1 font-medium outline-none focus:border-md-sys-color-primary"
            placeholder="e.g. Italian"
            value={formData.cuisine || ''}
            onChange={(e) => setFormData({ ...formData, cuisine: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="mealType"
              className="mb-1 block text-xs font-medium uppercase text-md-sys-color-on-surface-variant"
            >
              Meal Type
            </label>
            <select
              id="mealType"
              className="w-full rounded-md-s border border-md-sys-color-outline bg-md-sys-color-surface p-2 font-medium outline-none"
              value={formData.mealType || ''}
              onChange={(e) => setFormData({ ...formData, mealType: e.target.value })}
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
              className="mb-1 block text-xs font-medium uppercase text-md-sys-color-on-surface-variant"
            >
              Dish Type
            </label>
            <select
              id="dishType"
              className="w-full rounded-md-s border border-md-sys-color-outline bg-md-sys-color-surface p-2 font-medium outline-none"
              value={formData.dishType || ''}
              onChange={(e) => setFormData({ ...formData, dishType: e.target.value })}
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

        <div>
          <label
            htmlFor="dietary"
            className="mb-1 block text-xs font-medium uppercase text-md-sys-color-on-surface-variant"
          >
            Dietary Tags (comma separated)
          </label>
          <input
            id="dietary"
            className="w-full border-b border-md-sys-color-outline bg-transparent py-1 font-medium outline-none focus:border-md-sys-color-primary"
            placeholder="e.g. Vegan, Gluten-Free"
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
          />
        </div>

        <div>
          <label
            htmlFor="equipment"
            className="mb-1 block text-xs font-medium uppercase text-md-sys-color-on-surface-variant"
          >
            Equipment (comma separated)
          </label>
          <input
            id="equipment"
            className="w-full border-b border-md-sys-color-outline bg-transparent py-1 font-medium outline-none focus:border-md-sys-color-primary"
            placeholder="e.g. Air Fryer, Slow Cooker"
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
          />
        </div>

        <div>
          <label
            htmlFor="occasion"
            className="mb-1 block text-xs font-medium uppercase text-md-sys-color-on-surface-variant"
          >
            Occasion (comma separated)
          </label>
          <input
            id="occasion"
            className="w-full border-b border-md-sys-color-outline bg-transparent py-1 font-medium outline-none focus:border-md-sys-color-primary"
            placeholder="e.g. Weeknight, Party"
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
          />
        </div>

        <div>
          <label
            htmlFor="ingredients"
            className="mb-1 block text-xs font-medium uppercase text-md-sys-color-on-surface-variant"
          >
            Ingredients
          </label>
          <textarea
            id="ingredients"
            className="h-40 w-full rounded-md-s border border-md-sys-color-outline bg-md-sys-color-surface p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-md-sys-color-primary"
            value={ingredientsText}
            onChange={(e) => {
              const lines = e.target.value.split('\n')
              const newIngredients = lines.map((line) => {
                const parts = line.split(' ')
                return { amount: parts[0] || '', name: parts.slice(1).join(' ') || '' }
              })
              setFormData({ ...formData, ingredients: newIngredients })
            }}
          />
          <p className="mt-1 text-[10px] text-md-sys-color-on-surface-variant">
            One ingredient per line
          </p>
        </div>

        <div>
          <label
            htmlFor="steps"
            className="mb-1 block text-xs font-medium uppercase text-md-sys-color-on-surface-variant"
          >
            Instructions
          </label>
          <textarea
            id="steps"
            className="h-40 w-full rounded-md-s border border-md-sys-color-outline bg-md-sys-color-surface p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-md-sys-color-primary"
            value={instructionsText}
            onChange={(e) => setFormData({ ...formData, steps: e.target.value.split('\n') })}
          />
        </div>
      </div>

      <div className="pt-4">
        <Button fullWidth size="lg" onClick={onSave} disabled={status === 'saving'}>
          {status === 'saving' ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Save className="h-5 w-5" />
          )}
          {status === 'saving' ? 'Saving...' : 'Save Recipe'}
        </Button>
      </div>
    </div>
  )
}

interface RecipeSourceSelectorProps {
  mode: InputMode
  setMode: (m: InputMode) => void
  url: string
  setUrl: (u: string) => void
  imagePreview: string | null
  setImagePreview: (s: string | null) => void
  errorMsg: string
  status: Status
  onProcess: () => void
}

const RecipeSourceSelector = ({
  mode,
  setMode,
  url,
  setUrl,
  imagePreview,
  setImagePreview,
  errorMsg,
  status,
  onProcess,
}: RecipeSourceSelectorProps) => {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      // Optimistic preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Upload to R2
      try {
        const formData = new FormData()
        formData.append('file', file)

        const baseUrl = import.meta.env.BASE_URL.endsWith('/')
          ? import.meta.env.BASE_URL
          : `${import.meta.env.BASE_URL}/`

        const res = await fetch(`${baseUrl}api/uploads`, {
          method: 'POST',
          body: formData,
        })

        if (res.ok) {
          const { key } = await res.json()
          // Use the proxy URL for the preview/storage
          const publicUrl = `${baseUrl}api/uploads/${key}`
          setImagePreview(publicUrl)
        } else {
          console.error('Failed to upload image')
          // Keep local preview? Or warn?
        }
      } catch (err) {
        console.error('Upload error', err)
      }
    }
  }

  return (
    <div className="rounded-md-xl border border-md-sys-color-outline bg-md-sys-color-surface p-6 shadow-md-2">
      <SourceToggle mode={mode} setMode={setMode} />

      <div className="space-y-6">
        {mode === 'photo' ? (
          <PhotoUploader
            imagePreview={imagePreview}
            setImagePreview={setImagePreview}
            handleFileChange={handleFileChange}
          />
        ) : (
          <div className="space-y-2">
            <label
              htmlFor="url-input"
              className="text-sm font-medium uppercase tracking-wider text-md-sys-color-on-surface-variant"
            >
              Paste Recipe Link
            </label>
            <input
              id="url-input"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://cooking.nytimes.com/..."
              className="bg-md-sys-color-surface-variant/20 w-full rounded-md-l border border-md-sys-color-outline p-4 font-mono text-sm outline-none transition-all focus:ring-2 focus:ring-md-sys-color-primary"
            />
            <p className="text-xs text-md-sys-color-on-surface-variant">
              We&apos;ll scrape the ingredients and instructions for you.
            </p>
          </div>
        )}

        {errorMsg && (
          <div className="animate-in shake rounded-md-s border border-md-sys-color-error bg-md-sys-color-error-container p-4 text-sm font-medium text-md-sys-color-on-error-container">
            Error: {errorMsg}
          </div>
        )}

        <Button
          fullWidth
          size="lg"
          onClick={onProcess}
          disabled={
            status === 'processing' ||
            (mode === 'url' && !url) ||
            (mode === 'photo' && !imagePreview)
          }
        >
          {status === 'processing' ? <Loader2 className="animate-spin" /> : <ChefHat />}
          {status === 'processing' ? 'Consulting Chef Gemini...' : 'Process Recipe'}
        </Button>
      </div>
    </div>
  )
}

interface RecipeInputProps {
  onRecipeCreated?: (recipe: Recipe) => void
}

export const RecipeInput = ({ onRecipeCreated }: RecipeInputProps) => {
  const [mode, setMode] = useState<InputMode>('photo')
  const [url, setUrl] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [parsedRecipe, setParsedRecipe] = useState<Recipe | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [formData, setFormData] = useState<Partial<Recipe>>({})

  const handleProcess = async () => {
    setStatus('processing')
    setErrorMsg('')
    try {
      const payload: { url?: string; image?: string } = {}
      if (mode === 'url') {
        if (!url) throw new Error('Please enter a URL')
        payload.url = url
      } else {
        if (!imagePreview) throw new Error('Please select an image')
        payload.image = imagePreview
      }

      const baseUrl = import.meta.env.BASE_URL.endsWith('/')
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`
      const res = await fetch(`${baseUrl}api/parse-recipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        let errMsg = `Failed: ${res.status} ${res.statusText}`
        try {
          const textBody = await res.text()
          try {
            const errData = JSON.parse(textBody)
            if (errData.error) errMsg = errData.error
          } catch {
            // Not JSON, use text body if short, else info
            if (textBody.length < 200) errMsg = textBody
          }
        } catch {
          // ignore
        }
        throw new Error(errMsg)
      }
      const data = await res.json()
      const recipeWithId = { ...data, id: crypto.randomUUID() }
      if (mode === 'photo' && imagePreview) {
        recipeWithId.sourceImage = imagePreview
      }
      setParsedRecipe(recipeWithId)
      setFormData(recipeWithId)
      setStatus('review')
    } catch (err: unknown) {
      console.error(err)
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('error')
    }
  }

  const handleSave = async () => {
    if (!parsedRecipe) return
    const newRecipe = { ...formData, id: formData.id || crypto.randomUUID() } as Recipe

    if (onRecipeCreated) {
      // Pass the recipe with the uploaded image URL (if set in imagePreview)
      onRecipeCreated(newRecipe)
      setStatus('success')
    }
  }

  if (status === 'success') {
    return (
      <SuccessView
        onReset={() => {
          setStatus('idle')
          setParsedRecipe(null)
          setFormData({})
          setImagePreview(null)
          setUrl('')
        }}
      />
    )
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      {status === 'review' && formData ? (
        <RecipeReviewForm
          formData={formData}
          setFormData={setFormData}
          imagePreview={imagePreview}
          url={url}
          mode={mode}
          status={status}
          onSave={handleSave}
          onCancel={() => setStatus('idle')}
        />
      ) : (
        <RecipeSourceSelector
          mode={mode}
          setMode={setMode}
          url={url}
          setUrl={setUrl}
          imagePreview={imagePreview}
          setImagePreview={setImagePreview}
          errorMsg={errorMsg}
          status={status}
          onProcess={handleProcess}
        />
      )}
    </div>
  )
}

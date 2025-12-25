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
    <div className="rounded-full bg-green-100 p-4 text-green-600">
      <ChefHat className="h-12 w-12" />
    </div>
    <h2 className="font-display text-2xl font-bold text-ink">Recipe Saved!</h2>
    <p className="max-w-xs text-gray-500">
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
  <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-white shadow-sm">
    <LinkIcon className="h-8 w-8 text-gray-300" />
  </div>
)

const ImageThumbnail = ({ src }: { src: string }) => (
  <img src={src} alt="Recipe Source" className="h-20 w-20 rounded-lg object-cover shadow-sm" />
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
  <div className="flex items-center gap-4 rounded-xl border-2 border-black/5 bg-gray-50 p-4">
    {mode === 'photo' && imagePreview ? <ImageThumbnail src={imagePreview} /> : <LinkPlaceholder />}
    <div className="text-sm">
      <p className="text-xs font-bold uppercase text-gray-500">Source</p>
      <p className="line-clamp-1 font-bold text-ink">{mode === 'photo' ? 'Uploaded Image' : url}</p>
    </div>
  </div>
)

const SourceToggle = ({ mode, setMode }: { mode: InputMode; setMode: (m: InputMode) => void }) => (
  <div className="mb-6 flex border-b-2 border-black">
    <button
      className={`flex-1 py-3 text-center font-bold uppercase tracking-wider transition-colors ${
        mode === 'photo' ? 'bg-black text-white' : 'hover:bg-gray-100'
      }`}
      onClick={() => setMode('photo')}
    >
      <div className="flex items-center justify-center gap-2">
        <Camera className="h-4 w-4" /> Photo
      </div>
    </button>
    <button
      className={`flex-1 py-3 text-center font-bold uppercase tracking-wider transition-colors ${
        mode === 'url' ? 'bg-black text-white' : 'hover:bg-gray-100'
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
    className={`flex h-64 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 transition-colors ${
      imagePreview ? 'border-transparent p-0' : 'group relative hover:border-ink hover:bg-gray-100'
    }`}
  >
    {imagePreview ? (
      <div className="relative h-full w-full">
        <img src={imagePreview} className="h-full w-full rounded-xl object-cover" alt="Preview" />
        <button
          onClick={() => setImagePreview(null)}
          className="absolute right-2 top-2 rounded-full bg-white/90 p-2 shadow-sm hover:text-red-500"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    ) : (
      <>
        <div className="mb-4 rounded-full bg-white p-4 shadow-sm">
          <Upload className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-sm font-bold text-gray-500">Tap to upload or take photo</p>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={handleFileChange}
        />
      </>
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
        <h2 className="font-display text-2xl font-black italic">Review & Edit</h2>
        <Button intent="tertiary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      <SourcePreview mode={mode} imagePreview={imagePreview} url={url} />

      <div className="space-y-4">
        <div>
          <label htmlFor="title" className="mb-1 block text-xs font-bold uppercase text-gray-400">
            Title
          </label>
          <input
            id="title"
            className="w-full border-b-2 border-gray-200 bg-transparent py-2 font-display text-xl font-bold outline-none focus:border-ink"
            value={formData.title || ''}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Recipe Title"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          {['servings', 'prepTime', 'cookTime'].map((field) => (
            <div key={field} className="rounded-lg border-2 border-gray-100 bg-white p-2">
              <label
                htmlFor={field}
                className="mb-1 block text-[10px] font-bold uppercase text-gray-400"
              >
                {field.replace('Time', '')}
              </label>
              <input
                id={field}
                type="number"
                className="w-full text-lg font-bold outline-none"
                value={(formData[field as keyof Recipe] as number) || ''}
                onChange={(e) =>
                  setFormData({ ...formData, [field]: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          ))}
        </div>

        <div>
          <label
            htmlFor="ingredients"
            className="mb-1 block text-xs font-bold uppercase text-gray-400"
          >
            Ingredients
          </label>
          <textarea
            id="ingredients"
            className="h-40 w-full rounded-lg border-2 border-gray-100 p-3 font-mono text-sm outline-none focus:border-ink"
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
          <p className="mt-1 text-[10px] text-gray-400">One ingredient per line</p>
        </div>

        <div>
          <label htmlFor="steps" className="mb-1 block text-xs font-bold uppercase text-gray-400">
            Instructions
          </label>
          <textarea
            id="steps"
            className="h-40 w-full rounded-lg border-2 border-gray-100 p-3 font-mono text-sm outline-none focus:border-ink"
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
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedMap = e.target.files[0]
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(selectedMap)
    }
  }

  return (
    <div className="border-2 border-black bg-white shadow-hard">
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
              className="text-sm font-bold uppercase tracking-wider text-gray-500"
            >
              Paste Recipe Link
            </label>
            <input
              id="url-input"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://cooking.nytimes.com/..."
              className="w-full rounded-xl border-2 border-black p-4 font-mono text-sm outline-none ring-black/10 transition-all focus:ring-4"
            />
            <p className="text-xs text-gray-400">
              We&apos;ll scrape the ingredients and instructions for you.
            </p>
          </div>
        )}

        {errorMsg && (
          <div className="animate-in shake rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
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

      const res = await fetch('/api/parse-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('Failed to parse recipe')
      const data = await res.json()
      const recipeWithId = { ...data, id: crypto.randomUUID() }
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
      onRecipeCreated(newRecipe)
      setStatus('success')
      return
    }

    setStatus('saving')
    try {
      const userRes = await fetch('/api/user-data')
      if (!userRes.ok) throw new Error('Failed to fetch user data')
      const userData = await userRes.json()
      const currentRecipes: Recipe[] = Array.isArray(userData.recipes) ? userData.recipes : []
      const saveRes = await fetch('/api/user-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipes: [...currentRecipes, newRecipe] }),
      })
      if (!saveRes.ok) throw new Error('Failed to save')
      setStatus('success')
    } catch (err: unknown) {
      console.error(err)
      setErrorMsg('Failed to save recipe')
      setStatus('error')
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

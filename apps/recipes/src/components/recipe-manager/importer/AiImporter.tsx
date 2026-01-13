import React, { useState } from 'react'
import { Loader2, ChefHat, Info, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Recipe } from '../../../lib/types'
import { processImage } from '../../../lib/image-optimization'
import { SourceToggle, type InputMode } from './SourceToggle'
import { PhotoUploader } from './PhotoUploader'
import { Stack, Cluster } from '@/components/ui/layout'

import { uploadImage, parseRecipe } from './api'
type Status = 'idle' | 'processing' | 'error'

interface AiImporterProps {
  onRecipeParsed: (recipe: Recipe) => void
}

export const AiImporter: React.FC<AiImporterProps> = ({ onRecipeParsed }) => {
  const [mode, setMode] = useState<InputMode>('photo')
  const [url, setUrl] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageData, setImageData] = useState<string | null>(null) // Base64 data for AI
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [internalIsUploading, setInternalIsUploading] = useState(false)

  // Context fields for Dish Photo mode
  const [dishName, setDishName] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [knownIngredients, setKnownIngredients] = useState('')
  const [dietaryNotes, setDietaryNotes] = useState('')
  const [tasteProfile, setTasteProfile] = useState('')
  const [isContextOpen, setIsContextOpen] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return

    const originalFile = e.target.files[0]
    setInternalIsUploading(true)

    try {
      const file = await processImage(originalFile)

      // Read as base64 for preview and fallback
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        setImagePreview(base64)
        setImageData(base64)
      }
      reader.readAsDataURL(file)

      // Upload to server
      const baseUrl = import.meta.env.BASE_URL.endsWith('/')
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`

      const publicUrl = await uploadImage(file, baseUrl)
      if (publicUrl) {
        setImagePreview(publicUrl)
      } else {
        console.error('Failed to upload image - base64 will be used directly')
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setInternalIsUploading(false)
    }
  }

  const handleProcess = async () => {
    setStatus('processing')
    setErrorMsg('')
    try {
      const payload: {
        url?: string
        image?: string
        mode?: 'parse' | 'infer'
        dishName?: string
        cuisine?: string
        knownIngredients?: string
        dietaryNotes?: string
        tasteProfile?: string
      } = {}

      if (mode === 'url') {
        if (!url) throw new Error('Please enter a URL')
        payload.url = url
      } else {
        if (!imageData) throw new Error('Please select an image')
        if (imageData.length > 1024 * 1024 * 4) {
          throw new Error('The image is too large. Please try a smaller photo.')
        }
        payload.image = imageData

        if (mode === 'dish-photo') {
          payload.mode = 'infer'
          if (dishName) payload.dishName = dishName
          if (cuisine) payload.cuisine = cuisine
          if (knownIngredients) payload.knownIngredients = knownIngredients
          if (dietaryNotes) payload.dietaryNotes = dietaryNotes
          if (tasteProfile) payload.tasteProfile = tasteProfile
        }
      }

      const baseUrl = import.meta.env.BASE_URL.endsWith('/')
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`

      const data = await parseRecipe(payload, baseUrl)

      const recipeWithSource = {
        ...(data as object),
        sourceImage: mode === 'photo' || mode === 'dish-photo' ? imagePreview : undefined,
        creationMethod: mode === 'dish-photo' ? 'ai-infer' : 'ai-parse',
      } as Recipe

      onRecipeParsed(recipeWithSource)
      setStatus('idle')
    } catch (err: unknown) {
      console.error(err)
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('error')
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-md">
      <SourceToggle mode={mode} setMode={setMode} />

      <Stack spacing="lg">
        {mode === 'photo' || mode === 'dish-photo' ? (
          <>
            <PhotoUploader
              imagePreview={imagePreview}
              onRemove={() => {
                setImagePreview(null)
                setImageData(null)
              }}
              handleFileChange={handleFileChange}
            />

            {mode === 'dish-photo' && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <div className="mb-4 rounded-lg bg-blue-500/10 p-3 text-sm text-blue-600 dark:text-blue-400">
                  <div className="flex gap-2">
                    <Info className="h-4 w-4 shrink-0 translate-y-0.5" />
                    <p>
                      <strong>Experimental:</strong> Gemini will reverse-engineer a recipe from your
                      photo. Results are estimated!
                    </p>
                  </div>
                </div>

                <Stack spacing="md">
                  <div>
                    <label
                      htmlFor="dish-name"
                      className="mb-1 block text-xs font-bold uppercase text-muted-foreground"
                    >
                      Dish Name (Recommended)
                    </label>
                    <input
                      id="dish-name"
                      type="text"
                      className="w-full rounded-lg border border-border bg-background p-3 text-sm placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="e.g. Pad Thai, Beef Bourguignon"
                      value={dishName}
                      onChange={(e) => setDishName(e.target.value)}
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between px-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setIsContextOpen(!isContextOpen)}
                  >
                    <span className="text-xs font-bold uppercase">Add More Context (Optional)</span>
                    {isContextOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>

                  {isContextOpen && (
                    <Stack spacing="md" className="pt-2 animate-in slide-in-from-top-2">
                      <Cluster spacing="md">
                        <div className="flex-1">
                          <label
                            htmlFor="cuisine"
                            className="mb-1 block text-xs font-bold uppercase text-muted-foreground"
                          >
                            Cuisine
                          </label>
                          <input
                            id="cuisine"
                            type="text"
                            className="w-full rounded-lg border border-border bg-background p-3 text-sm placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="Italian, Thai..."
                            value={cuisine}
                            onChange={(e) => setCuisine(e.target.value)}
                          />
                        </div>
                        <div className="flex-1">
                          <label
                            htmlFor="taste-profile"
                            className="mb-1 block text-xs font-bold uppercase text-muted-foreground"
                          >
                            Taste Profile
                          </label>
                          <input
                            id="taste-profile"
                            type="text"
                            className="w-full rounded-lg border border-border bg-background p-3 text-sm placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="Spicy, Sweet..."
                            value={tasteProfile}
                            onChange={(e) => setTasteProfile(e.target.value)}
                          />
                        </div>
                      </Cluster>

                      <div>
                        <label
                          htmlFor="known-ingredients"
                          className="mb-1 block text-xs font-bold uppercase text-muted-foreground"
                        >
                          Known Ingredients
                        </label>
                        <textarea
                          id="known-ingredients"
                          className="min-h-[60px] w-full rounded-lg border border-border bg-background p-3 text-sm placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Shrimp, lemongrass, peanuts..."
                          value={knownIngredients}
                          onChange={(e) => setKnownIngredients(e.target.value)}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="dietary-notes"
                          className="mb-1 block text-xs font-bold uppercase text-muted-foreground"
                        >
                          Dietary Notes
                        </label>
                        <input
                          id="dietary-notes"
                          type="text"
                          className="w-full rounded-lg border border-border bg-background p-3 text-sm placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Gluten-Free, Dairy-Free..."
                          value={dietaryNotes}
                          onChange={(e) => setDietaryNotes(e.target.value)}
                        />
                      </div>
                    </Stack>
                  )}
                  {/* End Context Section */}
                </Stack>
              </div>
            )}
          </>
        ) : (
          <Stack spacing="sm">
            <label
              htmlFor="url-input"
              className="text-foreground-variant text-sm font-medium uppercase tracking-wider"
            >
              Paste Recipe Link
            </label>
            <input
              id="url-input"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://cooking.nytimes.com/..."
              className="bg-card-variant/20 w-full rounded-lg border border-border p-4 font-mono text-sm outline-none transition-all focus:ring-2 focus:ring-primary"
            />
            <p className="text-foreground-variant text-xs">
              We&apos;ll scrape the ingredients and instructions for you.
            </p>
          </Stack>
        )}

        {errorMsg && (
          <div className="shake border-md-sys-color-error bg-md-sys-color-error-container text-md-sys-color-on-error-container rounded-sm border p-4 text-sm font-medium animate-in">
            {errorMsg}
          </div>
        )}

        <Button
          className="w-full"
          size="lg"
          onClick={handleProcess}
          disabled={
            status === 'processing' ||
            internalIsUploading ||
            (mode === 'url' && !url) ||
            ((mode === 'photo' || mode === 'dish-photo') && !imageData)
          }
        >
          {status === 'processing' || internalIsUploading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <ChefHat />
          )}
          {internalIsUploading
            ? 'Uploading Photo...'
            : status === 'processing'
              ? 'Consulting Chef Gemini...'
              : 'Process Recipe'}
        </Button>
      </Stack>
    </div>
  )
}

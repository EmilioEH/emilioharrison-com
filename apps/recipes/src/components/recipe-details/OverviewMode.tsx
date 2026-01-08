import React, { useEffect, useState, useRef } from 'react'
import {
  Clock,
  Users,
  Flame,
  Star,
  ChevronRight,
  Play,
  Check,
  AlertCircle,
  Loader2,
  MessageSquarePlus,
} from 'lucide-react'
import { StarRating } from '../ui/StarRating'
import { CheckableItem } from './CheckableItem'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Stack, Inline } from '../ui/layout'
import { ImageViewer } from '../ui/ImageViewer'
import { Carousel } from '../ui/Carousel'
import type { Recipe, FamilyRecipeData } from '../../lib/types'
import { Textarea } from '../ui/textarea'

import { useStore } from '@nanostores/react'
import { $cookingSession, cookingSessionActions } from '../../stores/cookingSession'

interface OverviewModeProps {
  recipe: Recipe
  startCooking: () => void
  onSaveCost?: (cost: number) => void
  handleRate?: (rating: number) => void
}

export const OverviewMode: React.FC<OverviewModeProps> = ({
  recipe,
  startCooking,
  onSaveCost = () => {},
  handleRate = () => {},
}) => {
  const session = useStore($cookingSession)
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({})
  const [imageViewerOpen, setImageViewerOpen] = useState(false)
  const [activeViewerImage, setActiveViewerImage] = useState<string | null>(null)

  // Family Sync State
  const [familyData, setFamilyData] = useState<FamilyRecipeData | null>(null)
  const [isLoadingFamily, setIsLoadingFamily] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [showNoteInput, setShowNoteInput] = useState(false)

  // Initialize with persisted cost if available
  const [estimatedCost, setEstimatedCost] = useState<number | null>(recipe.estimatedCost || null)
  const [isEstimating, setIsEstimating] = useState(false)
  const [estimateError, setEstimateError] = useState<string | null>(null)

  // Load family data on mount
  useEffect(() => {
    const loadFamilyData = async () => {
      try {
        const baseUrl = import.meta.env.BASE_URL.endsWith('/')
          ? import.meta.env.BASE_URL
          : `${import.meta.env.BASE_URL}/`

        const res = await fetch(`${baseUrl}api/recipes/${recipe.id}/family-data`)
        const data = await res.json()

        if (data.success && data.data) {
          setFamilyData(data.data)
        }
      } catch (error) {
        console.error('Failed to load family data:', error)
      } finally {
        setIsLoadingFamily(false)
      }
    }

    loadFamilyData()
  }, [recipe.id])

  // Handle rating with family API
  const handleFamilyRate = async (rating: number) => {
    try {
      const baseUrl = import.meta.env.BASE_URL.endsWith('/')
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`

      const res = await fetch(`${baseUrl}api/recipes/${recipe.id}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      })

      const data = await res.json()
      if (data.success && data.data) {
        setFamilyData(data.data)
      }
    } catch (error) {
      console.error('Failed to save rating:', error)
    }

    // Also call the original handler for backwards compatibility
    handleRate(rating)
  }

  // Handle adding a note
  const handleAddNote = async () => {
    if (!newNote.trim()) return

    setIsAddingNote(true)
    try {
      const baseUrl = import.meta.env.BASE_URL.endsWith('/')
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`

      const res = await fetch(`${baseUrl}api/recipes/${recipe.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newNote }),
      })

      const data = await res.json()
      if (data.success && data.data) {
        setFamilyData(data.data)
        setNewNote('')
        setShowNoteInput(false)
      }
    } catch (error) {
      console.error('Failed to add note:', error)
    } finally {
      setIsAddingNote(false)
    }
  }

  // Calculate average rating from family
  const averageRating = familyData?.ratings?.length
    ? familyData.ratings.reduce((sum, r) => sum + r.rating, 0) / familyData.ratings.length
    : recipe.rating || 0

  const handleEstimateCost = async () => {
    setIsEstimating(true)
    setEstimateError(null)
    try {
      const payload = {
        ingredients: recipe.structuredIngredients || recipe.ingredients,
      }

      const baseUrl = import.meta.env.BASE_URL.endsWith('/')
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`

      const res = await fetch(`${baseUrl}api/estimate-cost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        throw new Error(data.details || data.error || 'Estimation failed')
      }

      if (data.totalCost) {
        setEstimatedCost(data.totalCost)
        onSaveCost(data.totalCost)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not estimate cost'
      console.error('Cost estimation failed', msg)
      setEstimateError(msg)
    } finally {
      setIsEstimating(false)
    }
  }
  useEffect(() => {
    // Auto-trigger if not yet estimated
    if (estimatedCost === null && !isEstimating) {
      handleEstimateCost()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Trigger once on mount

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAddPhotoTrigger = () => {
    fileInputRef.current?.click()
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      // 1. Optimize
      // Dynamically import to avoid server-side issues if any (though this is client component)
      const { processImage } = await import('../../lib/image-optimization')
      const optimizedFile = await processImage(file)

      // 2. Upload
      const formData = new FormData()
      formData.append('file', optimizedFile)

      const baseUrl = import.meta.env.BASE_URL.endsWith('/')
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`

      const uploadRes = await fetch(`${baseUrl}api/uploads`, {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}))
        console.error('Server Upload Error:', errData)
        throw new Error(errData.error || 'Upload failed')
      }

      const { url } = await uploadRes.json()

      // 3. Update Recipe
      const currentImages = recipe.images || []
      const newImages = [url, ...currentImages]

      // If no images existed before, and there was a sourceImage/finishedImage, should we preserve them?
      // The plan said: "Existing sourceImage will be treated as a fallback... When a new photo is added... added to front".
      // But if we start using `images` array, we should probably migrate the old one into it if it's the first time.
      if (currentImages.length === 0 && (recipe.sourceImage || recipe.finishedImage)) {
        const legacy = recipe.sourceImage || recipe.finishedImage
        if (legacy && !newImages.includes(legacy)) {
          newImages.push(legacy)
        }
      }

      // Optimistic Update
      // We can't easily update props, but we can force a reload or just rely on parent to pass new data?
      // Actually checking `OverviewMode` props: it receives `recipe`.
      // We should probably call an onUpdate prop if it existed, but it doesn't.
      // We'll trust the API update and maybe reload or similar?
      // For now, let's just do the API call. The user might need to refresh or we wait for SWR/store update.
      // Wait, `recipe` comes from parent.

      await fetch(`${baseUrl}api/recipes/${recipe.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...recipe, images: newImages }),
      })

      // Reload to show changes (simplest for now without full store refactor)
      window.location.reload()
    } catch (error) {
      console.error('Failed to upload photo:', error)
      alert(`Failed to upload photo: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Construct images list
  // Prefer recipe.images. If empty, fallback to sourceImage/finishedImage as single item array
  const displayImages = recipe.images?.length
    ? recipe.images
    : ([recipe.finishedImage || recipe.sourceImage].filter(Boolean) as string[])

  return (
    <Stack spacing="none" className="flex-1 overflow-y-auto pb-20">
      <div className="relative">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handlePhotoUpload}
        />

        <div className="relative w-full">
          <Carousel
            images={displayImages}
            onImageClick={(src) => {
              // Only open viewer if there is an image
              if (src) setImageViewerOpen(true)
              // Note: ImageViewer needs a specific URL, but here we just open it.
              // logic below usually takes `recipe.sourceImage`. We need to update that too.
              // Let's store the clicked image in state.
              setActiveViewerImage(src)
            }}
            onAddPhoto={handleAddPhotoTrigger}
            className="w-full"
          />
        </div>

        <div
          className={`rounded-t-md-xl shadow-md-3 relative z-10 -mt-6 border-t border-border bg-card p-6`}
        >
          {/* Metadata Header */}
          <div className="mb-6">
            <Inline spacing="sm" className="mb-2">
              {recipe.protein && (
                <Badge variant="tag" size="sm" className="uppercase">
                  {recipe.protein}
                </Badge>
              )}
              {recipe.difficulty && (
                <Badge variant="tag" size="sm" className="uppercase">
                  {recipe.difficulty}
                </Badge>
              )}
            </Inline>
            <h1 className="mb-2 font-display text-3xl font-bold leading-tight text-foreground">
              {recipe.title}
            </h1>

            {recipe.sourceUrl && (
              <Button
                variant="link"
                size="sm"
                className="mb-4 h-auto p-0 text-xs uppercase tracking-wider"
                asChild
              >
                <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer">
                  Source: {new URL(recipe.sourceUrl).hostname.replace('www.', '')} <ChevronRight />
                </a>
              </Button>
            )}

            {recipe.description && (
              <p className="mb-4 mt-2 text-base leading-relaxed text-muted-foreground">
                {recipe.description}
              </p>
            )}

            <Inline
              spacing="md"
              className="text-foreground-variant mt-4 border-y border-border/20 py-3 text-sm font-medium"
            >
              <Inline spacing="xs">
                <Clock className="h-4 w-4 text-primary" />
                <span>{recipe.prepTime + recipe.cookTime}m</span>
              </Inline>
              <Inline spacing="xs">
                <Users className="h-4 w-4 text-primary" />
                <span>{recipe.servings} Servings</span>
              </Inline>
              <Inline spacing="xs">
                <Flame className="h-4 w-4 text-primary" />
                <span>{recipe.difficulty || 'Easy'}</span>
              </Inline>
              {recipe.updatedAt && (
                <Inline spacing="xs" className="sm:ml-auto">
                  <span className="text-xs opacity-70">
                    Updated {new Date(recipe.updatedAt).toLocaleDateString()}
                  </span>
                </Inline>
              )}
            </Inline>
          </div>

          {/* Cost Estimation (Auto) */}
          <div className="mb-6 flex justify-end">
            {isEstimating ? (
              <Inline
                spacing="xs"
                className="bg-card-variant/50 text-foreground-variant rounded-lg px-3 py-1 text-xs font-medium"
              >
                <Loader2 className="h-3 w-3 animate-spin" /> Estimating HEB Cost...
              </Inline>
            ) : estimateError ? (
              <button
                onClick={handleEstimateCost}
                className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                title={estimateError}
              >
                <AlertCircle className="h-4 w-4" /> Couldn't estimate cost
                <span className="ml-1 text-[10px] uppercase opacity-70">Tap to retry</span>
              </button>
            ) : estimatedCost !== null ? (
              <button
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-800 transition hover:bg-green-100"
                onClick={handleEstimateCost}
                title="Click to refresh cost"
                aria-label={`Estimated cost is ${estimatedCost.toFixed(2)} dollars. Click to refresh.`}
              >
                Est. Total: ${estimatedCost.toFixed(2)}
                <span className="ml-1 text-[10px] uppercase opacity-70">(HEB)</span>
              </button>
            ) : (
              // Fallback button if auto failed or initial state before effect
              <Button
                variant="link"
                size="sm"
                onClick={handleEstimateCost}
                className="h-auto p-0 text-xs uppercase tracking-wider"
              >
                Estimate Cost
              </Button>
            )}
          </div>

          {/* Quick Stats or Previous Experience */}
          {(recipe.rating || recipe.userNotes) && (
            <div className="bg-md-sys-color-tertiary-container/30 border-md-sys-color-tertiary/20 rounded-md-xl mb-8 rounded-xl border p-4">
              <Inline spacing="none" justify="between" className="mb-2">
                <Inline spacing="xs">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-4 w-4 ${s <= (recipe.rating || 0) ? 'fill-md-sys-color-tertiary text-md-sys-color-tertiary fill-yellow-400 text-yellow-400' : 'text-border'}`}
                    />
                  ))}
                </Inline>
                {recipe.lastCooked && (
                  <span className="text-[10px] font-medium uppercase tracking-wider opacity-60">
                    Last cooked: {new Date(recipe.lastCooked).toLocaleDateString()}
                  </span>
                )}
              </Inline>
              {recipe.userNotes && (
                <p
                  className="text-md-sys-color-on-tertiary-container font-body text-sm italic"
                  data-testid="recipe-notes"
                >
                  "{recipe.userNotes}"
                </p>
              )}
            </div>
          )}

          {/* Family Notes and Ratings */}
          {!isLoadingFamily &&
            familyData &&
            (familyData.notes.length > 0 || familyData.ratings.length > 0) && (
              <div className="bg-tertiary/5 mb-6 rounded-xl border border-border/20 p-4">
                {/* Family Ratings */}
                {familyData.ratings.length > 0 && (
                  <div className="mb-4">
                    <Inline spacing="xs" className="mb-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-4 w-4 ${s <= Math.round(averageRating) ? 'fill-yellow-400 text-yellow-400' : 'text-border'}`}
                        />
                      ))}
                      <span className="text-xs text-muted-foreground">
                        ({averageRating.toFixed(1)} from {familyData.ratings.length}{' '}
                        {familyData.ratings.length === 1 ? 'rating' : 'ratings'})
                      </span>
                    </Inline>
                    <div className="mt-2 space-y-1">
                      {familyData.ratings.map((rating, idx) => (
                        <div key={idx} className="text-xs text-muted-foreground">
                          <strong>{rating.userName}:</strong> {rating.rating}/5 stars
                          {' · '}
                          <span className="opacity-70">
                            {new Date(rating.ratedAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Family Notes */}
                {familyData.notes.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-bold text-foreground">Family Notes</h3>
                    <Stack spacing="sm">
                      {familyData.notes.map((note, idx) => (
                        <div key={idx} className="rounded-lg bg-card/50 p-3 text-sm">
                          <div className="mb-1 flex items-center justify-between">
                            <strong className="text-xs font-semibold text-foreground">
                              {note.userName}
                            </strong>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(note.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm italic text-muted-foreground">"{note.text}"</p>
                        </div>
                      ))}
                    </Stack>
                  </div>
                )}
              </div>
            )}

          {/* Add Note Section */}
          <div className="mb-6">
            {!showNoteInput ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNoteInput(true)}
                className="w-full"
              >
                <MessageSquarePlus className="h-4 w-4" /> Add a Note
              </Button>
            ) : (
              <div className="rounded-lg border border-border bg-card/50 p-3">
                <Textarea
                  placeholder="Share your thoughts about this recipe..."
                  value={newNote}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setNewNote(e.target.value)
                  }
                  className="mb-2"
                  rows={3}
                />
                <Inline spacing="sm" justify="end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowNoteInput(false)
                      setNewNote('')
                    }}
                    disabled={isAddingNote}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || isAddingNote}
                  >
                    {isAddingNote ? 'Saving...' : 'Save Note'}
                  </Button>
                </Inline>
              </div>
            )}
          </div>

          <Inline spacing="none" justify="between" className="mt-4">
            <StarRating rating={Math.round(averageRating)} onRate={handleFamilyRate} size="lg" />
            {/* Placeholder for future specific rating text or count */}
          </Inline>

          {/* Ingredients */}
          <div className="mb-8">
            <Inline
              as="h2"
              spacing="none"
              justify="between"
              className="mb-4 font-display text-xl font-bold text-foreground"
            >
              <Inline spacing="sm">
                Ingredients
                <span className="text-foreground-variant font-body text-sm font-normal">
                  ({recipe.ingredients?.length || 0})
                </span>
              </Inline>
            </Inline>
            <div className={`bg-card-variant/20 rounded-lg border border-dashed border-border p-2`}>
              {recipe.ingredients.map((ing, idx) => {
                const prep = ing.prep ? `, ${ing.prep}` : ''
                const text = `${ing.amount} ${ing.name}${prep}`
                const isChecked = session.checkedIngredients.includes(idx)
                return (
                  <CheckableItem
                    key={idx}
                    text={text}
                    isChecked={isChecked}
                    onToggle={() => cookingSessionActions.toggleIngredient(idx)}
                    size="lg"
                  />
                )
              })}
            </div>

            {/* Estimate Cost Section - Moved to Header */}
          </div>

          {/* Steps */}
          <div className="mb-8">
            <Inline
              as="h2"
              spacing="none"
              justify="between"
              className="mb-4 font-display text-xl font-bold text-foreground"
            >
              Instructions
              <Button
                variant="outline"
                size="sm"
                onClick={startCooking}
                className="h-auto rounded-full px-3 py-1 text-xs uppercase tracking-widest"
              >
                Cooking Mode <Play className="fill-current" />
              </Button>
            </Inline>
            <Stack spacing="md">
              {recipe.steps.map((step, idx) => (
                <Inline key={idx} spacing="md" align="start">
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border font-bold transition-colors ${checkedSteps[idx] ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground'}`}
                  >
                    {checkedSteps[idx] ? <Check className="h-4 w-4" /> : idx + 1}
                  </div>
                  <button
                    onClick={() => setCheckedSteps((p) => ({ ...p, [idx]: !p[idx] }))}
                    className={`text-left font-body text-foreground transition-opacity ${checkedSteps[idx] ? 'line-through opacity-50' : ''}`}
                  >
                    {step}
                  </button>
                </Inline>
              ))}
            </Stack>
          </div>

          {recipe.notes && (
            <div className="border-md-sys-color-tertiary bg-md-sys-color-tertiary-container text-md-sys-color-on-tertiary-container mb-8 rounded-lg border-l-4 p-4 text-sm">
              <strong>Chef's Notes:</strong>
              <p className="mt-1">{recipe.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Image Viewer Modal */}
      {activeViewerImage && (
        <ImageViewer
          isOpen={imageViewerOpen}
          imageUrl={activeViewerImage}
          onClose={() => setImageViewerOpen(false)}
          alt={recipe.title}
        />
      )}
    </Stack>
  )
}

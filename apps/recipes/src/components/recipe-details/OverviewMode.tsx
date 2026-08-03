import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { Clock, Flame, ChevronRight, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { RecipeReviews } from './RecipeReviews'
import { IngredientRow } from './IngredientRow'
import { useStore } from '@nanostores/react'
import { MetadataCard } from './MetadataCard'
import { ServingsStepper } from './ServingsStepper'
import { scaleRecipe } from '../../lib/servings-scale'
import { setWeekServings } from '../../lib/weekStore'
import { $recipeFamilyData } from '../../lib/familyStore'
import { InstructionCard } from './InstructionCard'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Stack, Inline } from '../ui/layout'
import { ImageViewer } from '../ui/ImageViewer'
import { Carousel } from '../ui/Carousel'
import {
  getCheckedIngredients,
  getCheckedSteps,
  toggleIngredient,
  toggleStep,
} from '../../stores/overviewCooking'
import {
  computeStepIngredientMappings,
  hasUsefulStepIngredientMappings,
  areStepIngredientMappingsEqual,
} from '../../lib/step-ingredient-mapping'
import type { Recipe, FamilyRecipeData, StructuredStep, Ingredient } from '../../lib/types'

interface OverviewModeProps {
  recipe: Recipe
  isRefreshing?: boolean
  refreshProgress?: string
  onRecipeRefresh?: () => void | Promise<void>
  onPersistStepIngredients?: (stepIngredients: Array<{ indices: number[] }>) => void | Promise<void>
}

export const OverviewMode: React.FC<OverviewModeProps> = ({
  recipe,
  isRefreshing = false,
  refreshProgress = '',
  onRecipeRefresh,
  onPersistStepIngredients,
}) => {
  // Smart View was removed: recipes now always render their own transcribed steps and a flat
  // ingredient list. The Kenji-style rewrite it displayed reworded instructions, invented
  // specifics the source never stated, and merged steps together, so it was removed at the
  // owner's request along with the background job that generated it.
  const [checkedIngredientsList, setCheckedIngredientsList] = useState<number[]>(() =>
    getCheckedIngredients(recipe.id),
  )
  const [checkedStepsList, setCheckedStepsList] = useState<number[]>(() =>
    getCheckedSteps(recipe.id),
  )
  const [imageViewerOpen, setImageViewerOpen] = useState(false)
  const [activeViewerImage, setActiveViewerImage] = useState<string | null>(null)
  const [ingredientsOpen, setIngredientsOpen] = useState(true)

  /**
   * The recipe as it is being cooked this week.
   *
   * The count lives on the family's plan entry, so it is shared and survives a reload — and the
   * stored recipe is never rewritten, because a number chosen for one week must not change the
   * recipe for everyone forever. Everything below reads `shownRecipe`, so the ingredient list, the
   * checklist count and the header all agree.
   */
  const familyPlanData = useStore($recipeFamilyData)
  const weekServings = familyPlanData[recipe.id]?.weekPlan?.servings
  const shownRecipe = useMemo(() => scaleRecipe(recipe, weekServings), [recipe, weekServings])

  const handleToggleIngredient = useCallback(
    (index: number) => {
      const updated = toggleIngredient(recipe.id, index)
      setCheckedIngredientsList(updated)
    },
    [recipe.id],
  )

  const handleToggleStep = useCallback(
    (globalIdx: number) => {
      const updated = toggleStep(recipe.id, globalIdx)
      setCheckedStepsList(updated)
    },
    [recipe.id],
  )

  // Family Sync State
  const [familyData, setFamilyData] = useState<FamilyRecipeData | null>(null)

  const lastPersistedStepIngredientSignature = useRef<string | null>(null)

  const loadFamilyData = async () => {
    try {
      const baseUrl = import.meta.env.BASE_URL.endsWith('/')
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`

      const res = await fetch(`${baseUrl}api/recipes/${recipe.id}/family-data`, {
        cache: 'no-store',
      })
      const data = await res.json()

      if (data.success && data.data) {
        setFamilyData(data.data)
      }
    } catch (error) {
      console.error('Failed to load family data:', error)
    }
  }

  // Load family data on mount
  useEffect(() => {
    loadFamilyData()
  }, [recipe.id])

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAddPhotoTrigger = () => {
    fileInputRef.current?.click()
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      // 1. Optimize: full-size variant plus a small library-card thumbnail (P5), both generated
      // from the original file via the same processImage() machinery.
      // Dynamically import to avoid server-side issues if any (though this is client component)
      const { processImage, createThumbnail } = await import('../../lib/image-optimization')
      const [optimizedFile, thumbFile] = await Promise.all([
        processImage(file),
        createThumbnail(file),
      ])

      const baseUrl = import.meta.env.BASE_URL.endsWith('/')
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`

      const uploadOne = async (fileToUpload: File): Promise<string> => {
        const formData = new FormData()
        formData.append('file', fileToUpload)

        const uploadRes = await fetch(`${baseUrl}api/uploads`, {
          method: 'POST',
          body: formData,
        })

        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}))
          console.error('Server Upload Error:', errData)
          throw new Error(errData.error || 'Upload failed')
        }

        const { key } = await uploadRes.json()
        // Construct full URL with baseUrl (aligned with importer/api.ts pattern)
        return `${baseUrl}api/uploads/${key}`
      }

      // 2. Upload both variants
      const [uploadedUrl, uploadedThumbUrl] = await Promise.all([
        uploadOne(optimizedFile),
        uploadOne(thumbFile),
      ])

      // 3. Update Recipe
      const currentImages = recipe.images || []
      const newImages = [uploadedUrl, ...currentImages]

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

      // thumbUrl tracks the newest/primary photo (images[0]) — the card renders it in place of the
      // full image. Existing recipes without a thumbUrl keep falling back to the full image
      // (RecipeCard.tsx) until a photo is (re-)uploaded here.
      await fetch(`${baseUrl}api/recipes/${recipe.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...recipe, images: newImages, thumbUrl: uploadedThumbUrl }),
      })

      // Reload to show changes (simplest for now without full store refactor)
      window.location.reload()
    } catch (error) {
      console.error('Failed to upload photo:', error)
      alert(`Failed to upload photo: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Construct images list
  // Prefer recipe.images. If empty, fallback to sourceImage/finishedImage as single item array.
  // Also include any review photos from family data (for immediate visibility after submitting a review).
  const displayImages = useMemo(() => {
    const baseImages =
      Array.isArray(recipe.images) && recipe.images.length > 0
        ? recipe.images
        : ([recipe.finishedImage || recipe.sourceImage].filter(Boolean) as string[])

    // Collect photo URLs from reviews
    const reviewPhotos = (familyData?.reviews || [])
      .map((r) => r.photoUrl)
      .filter((url): url is string => !!url)

    // Merge, de-duplicate, and keep review photos that aren't already in the base set
    const baseSet = new Set(baseImages)
    const extraPhotos = reviewPhotos.filter((url) => !baseSet.has(url))

    return [...baseImages, ...extraPhotos]
  }, [recipe.images, recipe.finishedImage, recipe.sourceImage, familyData?.reviews])

  // Memoized ingredient groups with fallback to flat list
  const displayGroups = useMemo((): Array<{
    header: string | null
    items: Ingredient[]
    startIndex: number
  }> => {
    const ingredientsArray = Array.isArray(shownRecipe.ingredients) ? shownRecipe.ingredients : []
    return [{ header: null, items: ingredientsArray, startIndex: 0 }]
  }, [shownRecipe.ingredients])

  // Memoized structured steps with fallback to plain text
  const displaySteps = useMemo((): StructuredStep[] => {
    // VIEW MODE LOGIC: If 'original' text requested or no structured steps
    // original steps are in recipe.steps
    const stepsArray = Array.isArray(recipe.steps) ? recipe.steps : []
    return stepsArray.map((text: string) => ({ text, title: undefined, tip: undefined }))
  }, [recipe.steps])

  // Memoized step groups with fallback to flat list
  const displayStepGroups = useMemo((): Array<{
    header: string | null
    items: StructuredStep[]
    startIndex: number
  }> => {
    return [{ header: null, items: displaySteps, startIndex: 0 }]
  }, [displaySteps])

  const computedStepIngredients = useMemo(
    () =>
      computeStepIngredientMappings(
        Array.isArray(shownRecipe.ingredients) ? shownRecipe.ingredients : [],
        Array.isArray(recipe.steps) ? recipe.steps : [],
        Array.isArray(recipe.structuredSteps) ? recipe.structuredSteps : [],
      ),
    [shownRecipe.ingredients, recipe.steps, recipe.structuredSteps],
  )

  const stepCount = Array.isArray(recipe.steps) ? recipe.steps.length : 0
  const hasPersistedUsefulMappings = hasUsefulStepIngredientMappings(
    recipe.stepIngredients,
    stepCount,
  )
  const hasComputedUsefulMappings = hasUsefulStepIngredientMappings(
    computedStepIngredients,
    stepCount,
  )

  const effectiveStepIngredients = hasPersistedUsefulMappings
    ? recipe.stepIngredients
    : computedStepIngredients

  useEffect(() => {
    if (!onPersistStepIngredients) return
    if (hasPersistedUsefulMappings) return
    if (!hasComputedUsefulMappings) return
    if (areStepIngredientMappingsEqual(recipe.stepIngredients, computedStepIngredients)) return

    const signature = `${recipe.id}:${JSON.stringify(computedStepIngredients)}`
    if (lastPersistedStepIngredientSignature.current === signature) return
    lastPersistedStepIngredientSignature.current = signature

    Promise.resolve(onPersistStepIngredients(computedStepIngredients)).catch((error) => {
      console.warn('Failed to persist computed stepIngredients mapping:', error)
    })
  }, [
    onPersistStepIngredients,
    hasPersistedUsefulMappings,
    hasComputedUsefulMappings,
    recipe.stepIngredients,
    recipe.id,
    computedStepIngredients,
  ])

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

            {/* A page that prints a name over a description of the dish — "GREEK SPINACH AND FETA
             * PIE" above "Spanakopita" — stores the second line as `subtitle`. It was being
             * transcribed and then never shown, because nothing rendered this field.
             *
             * Skipped when the title already contains it. Most stored subtitles restate the
             * title ("Skillet Shrimp Scampi with Orzo and Tomatoes" storing "with Orzo and
             * Tomatoes"), and printing the same words twice reads as a bug. */}
            {(() => {
              const subtitle = String(recipe.subtitle ?? '').trim()
              if (!subtitle) return null
              const squash = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '')
              if (squash(recipe.title).includes(squash(subtitle))) return null
              return (
                <p
                  className="mb-2 font-body text-lg leading-snug text-muted-foreground"
                  data-testid="recipe-subtitle"
                >
                  {subtitle}
                </p>
              )
            })()}

            {recipe.sourceUrl &&
              (() => {
                try {
                  const hostname = new URL(recipe.sourceUrl).hostname.replace('www.', '')
                  return (
                    <Button
                      variant="link"
                      size="sm"
                      className="mb-4 h-auto p-0 text-xs uppercase tracking-wider"
                      asChild
                    >
                      <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer">
                        Source: {hostname} <ChevronRight />
                      </a>
                    </Button>
                  )
                } catch {
                  // Invalid URL, just show the raw link
                  return (
                    <Button
                      variant="link"
                      size="sm"
                      className="mb-4 h-auto p-0 text-xs uppercase tracking-wider"
                      asChild
                    >
                      <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer">
                        View Source <ChevronRight />
                      </a>
                    </Button>
                  )
                }
              })()}

            {/* Modification Date (Critical for tests/features) */}
            <div className="mb-4 text-xs text-muted-foreground">
              Updated {new Date(recipe.updatedAt || recipe.createdAt || '').toLocaleDateString()}
            </div>

            {recipe.description && (
              <p className="mb-4 mt-2 text-base italic leading-relaxed text-muted-foreground">
                {recipe.description}
              </p>
            )}

            {/* Metadata Cards Grid */}
            <div className="my-6 flex items-center justify-between divide-x divide-border">
              <div className="flex-1">
                <MetadataCard
                  icon={Clock}
                  label="TOTAL"
                  value={`${recipe.prepTime + recipe.cookTime}m`}
                />
              </div>
              <div className="flex-1">
                <ServingsStepper
                  recipeServings={recipe.servings}
                  weekServings={weekServings}
                  onChange={(next) => setWeekServings(recipe.id, next)}
                />
              </div>
              <div className="flex-1">
                <MetadataCard icon={Flame} label="LEVEL" value={recipe.difficulty || 'Easy'} />
              </div>
            </div>
          </div>

          {/* AI Refresh Progress Banner */}
          {isRefreshing && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-primary/10 p-3 text-sm text-primary animate-in fade-in slide-in-from-top-2">
              <Sparkles className="h-4 w-4 animate-pulse" />
              <span className="font-medium">{refreshProgress || 'Refreshing with AI...'}</span>
            </div>
          )}

          {/* Recipe Reviews */}
          {/* The average is gone: `RecipeReviews` shows the household's verdict instead. Averaging
           * mixed two scales that used the same numbers for different things, and the
           * three-point scale that replaces them cannot be averaged at all. */}
          <RecipeReviews
            totalRatings={
              familyData?.reviews?.length || familyData?.ratings?.length || (recipe.rating ? 1 : 0)
            }
            lastCooked={recipe.lastCooked}
            familyData={familyData}
            recipeId={recipe.id}
            onRefresh={loadFamilyData}
            onRecipeRefresh={onRecipeRefresh}
          />

          {/* Ingredients */}
          <div className="mb-8" data-testid="overview-ingredients-section">
            <button
              onClick={() => setIngredientsOpen((o) => !o)}
              className="mb-4 flex w-full items-center justify-between transition-opacity hover:opacity-80"
              aria-expanded={ingredientsOpen}
            >
              <Inline
                as="span"
                spacing="sm"
                className="font-display text-xl font-bold text-foreground"
              >
                Ingredients
                {checkedIngredientsList.length > 0 ? (
                  <span className="font-body text-sm font-normal text-primary">
                    {checkedIngredientsList.length}/{shownRecipe.ingredients?.length || 0} ready
                  </span>
                ) : (
                  <span className="text-foreground-variant font-body text-sm font-normal">
                    ({shownRecipe.ingredients?.length || 0})
                  </span>
                )}
              </Inline>
              {ingredientsOpen ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </button>

            {/* Grouped Ingredients Display */}
            {ingredientsOpen &&
              (displayGroups.length === 1 && displayGroups[0].items.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No ingredients listed yet.
                </div>
              ) : (
                <Stack spacing="lg">
                  {displayGroups.map((group, gIdx) => (
                    <div key={gIdx} className="rounded-lg bg-muted/20 p-3">
                      {group.header && (
                        <h3
                          className="mb-3 border-b border-border/70 pb-2 text-base font-semibold uppercase tracking-wide text-foreground/80"
                          data-testid="ingredients-group-header"
                        >
                          {group.header}
                        </h3>
                      )}
                      <Stack spacing="xs">
                        {group.items.map((ing, idx) => {
                          const globalIdx = group.startIndex + idx
                          return (
                            <IngredientRow
                              key={globalIdx}
                              ingredient={ing}
                              isChecked={checkedIngredientsList.includes(globalIdx)}
                              onToggle={() => handleToggleIngredient(globalIdx)}
                            />
                          )
                        })}
                      </Stack>
                    </div>
                  ))}
                </Stack>
              ))}
          </div>
          <div className="mb-8" data-testid="overview-instructions-section">
            <Inline
              as="h2"
              spacing="none"
              justify="between"
              className="mb-4 font-display text-xl font-bold text-foreground"
            >
              Instructions
            </Inline>

            {/* Grouped Steps Display */}
            {displayStepGroups.length === 1 && displayStepGroups[0].items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No instructions listed yet.
              </div>
            ) : (
              // ONE layout for both views — only the content differs. Smart View supplies phase
              // headers, step titles and tips; Original supplies plain numbered steps
              // (displayStepGroups already collapses to a single header-less group there).
              //
              // These were previously two separate render branches that had drifted apart in
              // padding, type scale and — most importantly — interaction: Smart View rendered
              // steps as static prose, so the view people actually cook from was the one where
              // steps couldn't be checked off at all.
              <div className="rounded-lg bg-muted/20 p-3" data-testid="instructions-group">
                <Stack spacing="xs">
                  {displayStepGroups.map((group, gIdx) => (
                    <React.Fragment key={gIdx}>
                      {group.header && (
                        <h3
                          data-testid="instructions-group-header"
                          className="px-1 pb-1 pt-4 text-xs font-bold uppercase tracking-widest text-muted-foreground first:pt-1"
                        >
                          {group.header}
                        </h3>
                      )}
                      {group.items.map((step, idx) => {
                        const globalIdx = group.startIndex + idx
                        const ingredientsArray = Array.isArray(shownRecipe.ingredients)
                          ? shownRecipe.ingredients
                          : []
                        const targetIndices = effectiveStepIngredients?.[globalIdx]?.indices
                        const targetIndicesArray = Array.isArray(targetIndices) ? targetIndices : []
                        return (
                          <InstructionCard
                            key={globalIdx}
                            stepNumber={globalIdx + 1}
                            title={step.title}
                            text={step.text}
                            highlightedText={step.highlightedText}
                            tip={step.tip}
                            ingredients={ingredientsArray}
                            targetIngredientIndices={targetIndicesArray}
                            fullIngredients={ingredientsArray}
                            isChecked={checkedStepsList.includes(globalIdx)}
                            hideNumber={false}
                            onToggle={() => handleToggleStep(globalIdx)}
                          />
                        )
                      })}
                    </React.Fragment>
                  ))}
                </Stack>
              </div>
            )}
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

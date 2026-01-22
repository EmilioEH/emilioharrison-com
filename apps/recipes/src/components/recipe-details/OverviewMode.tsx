import React, { useEffect, useState, useRef, useMemo } from 'react'
import { useStore } from '@nanostores/react'
import {
  Clock,
  Users,
  Flame,
  ChevronRight,
  Play,
  DollarSign,
  Sparkles,
  AlertCircle,
} from 'lucide-react'
import { CookingHistorySummary } from './CookingHistorySummary'
import { IngredientRow } from './IngredientRow'
import { MetadataCard } from './MetadataCard'
import { InstructionCard } from './InstructionCard'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Stack, Inline } from '../ui/layout'
import { ImageViewer } from '../ui/ImageViewer'
import { Carousel } from '../ui/Carousel'
import { aiOperationStore } from '../../lib/aiOperationStore'
import type {
  Recipe,
  FamilyRecipeData,
  StructuredStep,
  Ingredient,
  IngredientGroup,
} from '../../lib/types'

interface OverviewModeProps {
  recipe: Recipe
  startCooking: () => void
  onSaveCost?: (cost: number) => void
  isRefreshing?: boolean
  refreshProgress?: string
}

export const OverviewMode: React.FC<OverviewModeProps> = ({
  recipe,
  startCooking,
  onSaveCost = () => {},
  isRefreshing = false,
  refreshProgress = '',
}) => {
  // Track AI operations to detect background enhancement
  const aiOperations = useStore(aiOperationStore)
  const enhanceOpId = `enhance-${recipe.id}`
  const isEnhancing = aiOperations.operations.some(
    (op) => op.id === enhanceOpId && op.status === 'processing',
  )

  // Validate enhanced content exists
  const hasEnhancedContent =
    (recipe.structuredSteps?.length || 0) > 0 || (recipe.ingredientGroups?.length || 0) > 0

  // NEW: View Mode State with localStorage persistence
  const [viewMode, setViewMode] = useState<'original' | 'enhanced'>(() => {
    // Guard against SSR where localStorage is not available
    if (typeof window === 'undefined') {
      return hasEnhancedContent ? 'enhanced' : 'original'
    }
    const savedPreference = localStorage.getItem('recipe-view-mode')
    if (savedPreference === 'original' || savedPreference === 'enhanced') {
      return savedPreference
    }
    // Default to enhanced if available
    return hasEnhancedContent ? 'enhanced' : 'original'
  })

  // Save preference when user manually changes it
  const handleViewModeChange = (mode: 'original' | 'enhanced') => {
    setViewMode(mode)
    localStorage.setItem('recipe-view-mode', mode)
  }

  // Effect: When background enhancement finishes (prop update), notify user or auto-switch?
  // User asked for "Instantly toggle... notification".
  // Let's us show a notification badge on the toggle if enhanced becomes available while viewing 'original'.
  useEffect(() => {
    if (hasEnhancedContent && viewMode === 'original') {
      // We could auto-switch, but let's respect user context.
      // Just ensure the toggle is enabled.
    }
  }, [hasEnhancedContent, viewMode])

  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({})
  const [imageViewerOpen, setImageViewerOpen] = useState(false)
  const [activeViewerImage, setActiveViewerImage] = useState<string | null>(null)

  // Family Sync State
  const [familyData, setFamilyData] = useState<FamilyRecipeData | null>(null)

  // Initialize with persisted cost if available
  const [estimatedCost, setEstimatedCost] = useState<number | null>(recipe.estimatedCost || null)
  const [isEstimating, setIsEstimating] = useState(false)
  const [estimateError, setEstimateError] = useState<string | null>(null)

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
    }
  }

  // Load family data on mount
  useEffect(() => {
    loadFamilyData()
  }, [recipe.id])

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

      const { key } = await uploadRes.json()
      // Construct full URL with baseUrl (aligned with importer/api.ts pattern)
      const uploadedUrl = `${baseUrl}api/uploads/${key}`

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

  // Memoized ingredient groups with fallback to flat list
  const displayGroups = useMemo((): Array<{
    header: string | null
    items: Ingredient[]
    startIndex: number
  }> => {
    const groups = recipe.ingredientGroups

    // VIEW MODE LOGIC: If 'original', force flat list
    if (viewMode === 'enhanced' && groups?.length) {
      return groups.map((group: IngredientGroup) => ({
        header: group.header,
        items: recipe.ingredients.slice(group.startIndex, group.endIndex + 1),
        startIndex: group.startIndex,
      }))
    }
    // Fallback: single ungrouped list
    return [{ header: null, items: recipe.ingredients, startIndex: 0 }]
  }, [recipe.ingredientGroups, recipe.ingredients, viewMode])

  // Memoized structured steps with fallback to plain text
  const displaySteps = useMemo((): StructuredStep[] => {
    // VIEW MODE LOGIC: If 'modified' (original text) requested or no structured steps
    // original steps are in recipe.steps
    if (viewMode === 'original' && recipe.steps && recipe.steps.length > 0) {
      return recipe.steps.map((text: string) => ({ text, title: undefined, tip: undefined }))
    }

    const steps = recipe.structuredSteps
    if (steps?.length) {
      return steps
    }

    // Fallback if enhanced mode requested but no data (shouldn't happen due to toggle disable logic)
    if (recipe.steps && recipe.steps.length > 0) {
      return recipe.steps.map((text: string) => ({ text, title: undefined, tip: undefined }))
    }

    return []
  }, [recipe.structuredSteps, recipe.steps, viewMode])

  // Memoized step groups with fallback to flat list
  const displayStepGroups = useMemo((): Array<{
    header: string | null
    items: StructuredStep[]
    startIndex: number
  }> => {
    const groups = recipe.stepGroups

    // VIEW MODE LOGIC: If 'original', force flat list
    if (viewMode === 'enhanced' && groups?.length) {
      return groups.map((group) => ({
        header: group.header,
        items: displaySteps.slice(group.startIndex, group.endIndex + 1),
        startIndex: group.startIndex,
      }))
    }
    // Fallback: single ungrouped list
    return [{ header: null, items: displaySteps, startIndex: 0 }]
  }, [recipe.stepGroups, displaySteps, viewMode])

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
              {recipe.difficulty && (
                <Badge variant="tag" size="sm" className="uppercase">
                  {recipe.difficulty}
                </Badge>
              )}
            </Inline>

            <Inline justify="between" align="start">
              <h1 className="mb-2 flex-1 font-display text-3xl font-bold leading-tight text-foreground">
                {recipe.title}
              </h1>

              {/* VIEW MODE TOGGLE */}
              {(hasEnhancedContent || isEnhancing) && (
                <div className="ml-2 flex shrink-0 rounded-full border border-border bg-muted p-1">
                  <button
                    onClick={() => handleViewModeChange('original')}
                    disabled={isEnhancing}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${viewMode === 'original' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'} ${isEnhancing ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    Original
                  </button>
                  <button
                    onClick={() => handleViewModeChange('enhanced')}
                    disabled={isEnhancing || !hasEnhancedContent}
                    className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition-all ${viewMode === 'enhanced' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'} ${isEnhancing || !hasEnhancedContent ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <Sparkles className={`h-3 w-3 ${isEnhancing ? 'animate-pulse' : ''}`} />
                    {isEnhancing ? 'Processing...' : 'Smart View'}
                  </button>
                </div>
              )}
            </Inline>

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
                <MetadataCard icon={Users} label="SERVES" value={recipe.servings} />
              </div>
              <div className="flex-1">
                <MetadataCard icon={Flame} label="LEVEL" value={recipe.difficulty || 'Easy'} />
              </div>
              <div className="flex-1">
                <MetadataCard
                  icon={DollarSign}
                  label="COST"
                  value={
                    isEstimating ? '...' : estimatedCost ? `$${estimatedCost.toFixed(2)}` : '—'
                  }
                />
              </div>
            </div>
          </div>

          {/* Cost Estimation Error (only shown if failed) */}
          {estimateError && (
            <div className="mb-6 flex justify-end">
              <button
                onClick={handleEstimateCost}
                className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                title={estimateError}
              >
                <AlertCircle className="h-4 w-4" /> Couldn't estimate cost
                <span className="ml-1 text-[10px] uppercase opacity-70">Tap to retry</span>
              </button>
            </div>
          )}

          {/* AI Refresh Progress Banner */}
          {isRefreshing && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-primary/10 p-3 text-sm text-primary animate-in fade-in slide-in-from-top-2">
              <Sparkles className="h-4 w-4 animate-pulse" />
              <span className="font-medium">{refreshProgress || 'Refreshing with AI...'}</span>
            </div>
          )}

          {/* Cooking History Summary */}
          <CookingHistorySummary
            averageRating={averageRating}
            totalRatings={familyData?.ratings?.length || (recipe.rating ? 1 : 0)}
            lastCooked={recipe.lastCooked}
            familyData={familyData}
            recipeId={recipe.id}
            onRefresh={loadFamilyData}
          />

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

            {/* Grouped Ingredients Display */}
            <Stack spacing="lg">
              {displayGroups.map((group, gIdx) => (
                <div key={gIdx}>
                  {group.header && (
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      • {group.header}
                    </h3>
                  )}
                  <Stack spacing="xs">
                    {group.items.map((ing, idx) => (
                      <IngredientRow key={idx} ingredient={ing} />
                    ))}
                  </Stack>
                </div>
              ))}
            </Stack>
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

            {/* Grouped Steps Display */}
            <Stack spacing="lg">
              {displayStepGroups.map((group, gIdx) => (
                <div key={gIdx}>
                  {group.header && (
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background">
                        {gIdx + 1}
                      </div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        {group.header}
                      </h3>
                    </div>
                  )}
                  <Stack spacing="lg">
                    {group.items.map((step, idx) => {
                      const globalIdx = group.startIndex + idx
                      return (
                        <InstructionCard
                          key={globalIdx}
                          stepNumber={idx + 1}
                          title={group.header ? undefined : step.title}
                          text={step.text}
                          highlightedText={step.highlightedText}
                          tip={step.tip}
                          ingredients={recipe.ingredients}
                          targetIngredientIndices={recipe.stepIngredients?.[globalIdx]?.indices}
                          isChecked={checkedSteps[globalIdx]}
                          hideBadge={!!group.header} // Hide the badge entirely if in a group
                          hideNumber={!!group.header} // Also hide the number in the title
                          onToggle={() =>
                            setCheckedSteps((p) => ({
                              ...p,
                              [globalIdx]: !p[globalIdx],
                            }))
                          }
                        />
                      )
                    })}
                  </Stack>
                </div>
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

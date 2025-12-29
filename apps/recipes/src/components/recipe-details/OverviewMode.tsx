import React, { useEffect } from 'react'
import { Clock, Users, Flame, Star, ChevronRight, Play, Check } from 'lucide-react'
import { StarRating } from '../ui/StarRating'
import { CheckableItem } from './CheckableItem'
import type { Recipe } from '../../lib/types'
import type { CookingStage } from './DetailHeader'

interface OverviewModeProps {
  recipe: Recipe
  cookingMode: boolean
  checkedIngredients: Record<number, boolean>
  setCheckedIngredients: React.Dispatch<React.SetStateAction<Record<number, boolean>>>
  checkedSteps: Record<number, boolean>
  setCheckedSteps: React.Dispatch<React.SetStateAction<Record<number, boolean>>>
  setCookingStage: (stage: CookingStage) => void
  handleRate: (rating: number) => void
  startCooking: () => void
  onSaveCost: (cost: number) => void
}

export const OverviewMode: React.FC<OverviewModeProps> = ({
  recipe,
  cookingMode,
  checkedIngredients,
  setCheckedIngredients,
  checkedSteps,
  setCheckedSteps,
  setCookingStage,
  handleRate,
  startCooking,
  onSaveCost,
}) => {
  // Initialize with persisted cost if available
  const [estimatedCost, setEstimatedCost] = React.useState<number | null>(
    recipe.estimatedCost || null,
  )
  const [isEstimating, setIsEstimating] = React.useState(false)
  const [estimateError, setEstimateError] = React.useState<string | null>(null)

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

  return (
    <div className={`flex-1 overflow-y-auto pb-20 ${cookingMode ? 'px-4' : ''}`}>
      <div className="relative">
        {recipe.sourceImage && !cookingMode && (
          <div className="h-64 w-full">
            <img src={recipe.sourceImage} className="h-full w-full object-cover" alt="Recipe" />
          </div>
        )}

        <div
          className={`relative bg-md-sys-color-surface ${cookingMode ? 'pt-4' : '-mt-6 rounded-t-md-xl border-t border-md-sys-color-outline p-6 shadow-md-3'}`}
        >
          {/* Metadata Header */}
          <div className="mb-6">
            <div className="mb-2 flex gap-2">
              {recipe.protein && (
                <span className="rounded-full bg-md-sys-color-secondary-container px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-md-sys-color-on-secondary-container">
                  {recipe.protein}
                </span>
              )}
              {recipe.difficulty && (
                <span className="rounded-full bg-md-sys-color-surface-variant px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-md-sys-color-on-surface-variant">
                  {recipe.difficulty}
                </span>
              )}
            </div>
            <h1 className="mb-2 font-display text-3xl font-bold leading-tight text-md-sys-color-on-surface">
              {recipe.title}
            </h1>

            {recipe.sourceUrl && (
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-4 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-md-sys-color-primary hover:underline"
              >
                Source: {new URL(recipe.sourceUrl).hostname.replace('www.', '')}{' '}
                <ChevronRight className="h-3 w-3" />
              </a>
            )}

            <div className="border-md-sys-color-outline/20 mt-4 flex gap-4 border-y py-3 text-sm font-medium text-md-sys-color-on-surface-variant">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-md-sys-color-primary" />
                <span>{recipe.prepTime + recipe.cookTime}m</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4 text-md-sys-color-primary" />
                <span>{recipe.servings} Servings</span>
              </div>
              <div className="flex items-center gap-1">
                <Flame className="h-4 w-4 text-md-sys-color-primary" />
                <span>{recipe.difficulty || 'Easy'}</span>
              </div>
              {recipe.updatedAt && (
                <div className="flex items-center gap-1 sm:ml-auto" title="Last Modified">
                  <span className="text-xs opacity-70">
                    Updated {new Date(recipe.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Cost Estimation (Auto) */}
          <div className="mb-6 flex justify-end">
            {isEstimating ? (
              <div className="bg-md-sys-color-surface-variant/50 flex items-center gap-2 rounded-md-l px-3 py-1 text-xs font-medium text-md-sys-color-on-surface-variant">
                <span className="animate-spin">⟳</span> Estimating HEB Cost...
              </div>
            ) : estimateError ? (
              <button
                onClick={handleEstimateCost}
                className="flex items-center gap-2 rounded-md-l bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                title={estimateError}
              >
                ⚠️ Couldn't estimate cost
                <span className="ml-1 text-[10px] uppercase opacity-70">Tap to retry</span>
              </button>
            ) : estimatedCost !== null ? (
              <button
                className="flex cursor-pointer items-center gap-2 rounded-md-l bg-green-50 px-3 py-2 text-sm font-medium text-green-800 transition hover:bg-green-100"
                onClick={handleEstimateCost}
                title="Click to refresh cost"
                aria-label={`Estimated cost is ${estimatedCost.toFixed(2)} dollars. Click to refresh.`}
              >
                Est. Total: ${estimatedCost.toFixed(2)}
                <span className="ml-1 text-[10px] uppercase opacity-70">(HEB)</span>
              </button>
            ) : (
              // Fallback button if auto failed or initial state before effect
              <button
                onClick={handleEstimateCost}
                className="text-xs font-bold uppercase tracking-wider text-md-sys-color-primary hover:underline"
              >
                Estimate Cost
              </button>
            )}
          </div>

          {/* Quick Stats or Previous Experience */}
          {(recipe.rating || recipe.userNotes) && (
            <div className="bg-md-sys-color-tertiary-container/30 border-md-sys-color-tertiary/20 mb-8 rounded-md-xl border p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-4 w-4 ${s <= (recipe.rating || 0) ? 'fill-md-sys-color-tertiary text-md-sys-color-tertiary' : 'text-md-sys-color-outline'}`}
                    />
                  ))}
                </div>
                {recipe.lastCooked && (
                  <span className="text-[10px] font-medium uppercase tracking-wider opacity-60">
                    Last cooked: {new Date(recipe.lastCooked).toLocaleDateString()}
                  </span>
                )}
              </div>
              {recipe.userNotes && (
                <p className="font-body text-sm italic text-md-sys-color-on-tertiary-container">
                  "{recipe.userNotes}"
                </p>
              )}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <StarRating rating={recipe.rating || 0} onRate={handleRate} size="lg" />
            {/* Placeholder for future specific rating text or count */}
          </div>

          {/* Ingredients */}
          <div className="mb-8">
            <h2 className="mb-4 flex items-center justify-between font-display text-xl font-bold text-md-sys-color-on-surface">
              <div className="flex items-center gap-2">
                Ingredients
                <span className="font-body text-sm font-normal text-md-sys-color-on-surface-variant">
                  ({recipe.ingredients?.length || 0})
                </span>
              </div>
              <button
                onClick={() => setCookingStage('pre')}
                className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-md-sys-color-primary hover:underline"
              >
                Start Prepping <ChevronRight className="h-3 w-3" />
              </button>
            </h2>
            <div
              className={`rounded-md-l border border-dashed border-md-sys-color-outline p-2 ${cookingMode ? 'bg-md-sys-color-tertiary-container/20 border-md-sys-color-tertiary-container' : 'bg-md-sys-color-surface-variant/20'}`}
            >
              {recipe.ingredients.map((ing, idx) => {
                const prep = ing.prep ? `, ${ing.prep}` : '' // Fix this line to ensure proper text content
                const text = `${ing.amount} ${ing.name}${prep}`
                return (
                  <CheckableItem
                    key={idx}
                    text={text}
                    isChecked={!!checkedIngredients[idx]}
                    onToggle={() => setCheckedIngredients((p) => ({ ...p, [idx]: !p[idx] }))}
                  />
                )
              })}
            </div>

            {/* Estimate Cost Section - Moved to Header */}
          </div>

          {/* Steps */}
          <div className="mb-8">
            <h2 className="mb-4 flex items-center justify-between font-display text-xl font-bold text-md-sys-color-on-surface">
              Instructions
              <button
                onClick={startCooking}
                className="bg-md-sys-color-primary/10 hover:bg-md-sys-color-primary/20 flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest text-md-sys-color-primary"
              >
                Cooking Mode <Play className="h-3 w-3 fill-current" />
              </button>
            </h2>
            <div className="space-y-4">
              {recipe.steps.map((step, idx) => (
                <div key={idx} className="flex gap-4">
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border font-bold transition-colors ${checkedSteps[idx] ? 'border-md-sys-color-primary bg-md-sys-color-primary text-md-sys-color-on-primary' : 'border-md-sys-color-outline bg-md-sys-color-surface text-md-sys-color-on-surface'}`}
                  >
                    {checkedSteps[idx] ? <Check className="h-4 w-4" /> : idx + 1}
                  </div>
                  <button
                    onClick={() => setCheckedSteps((p) => ({ ...p, [idx]: !p[idx] }))}
                    className={`text-left font-body text-md-sys-color-on-surface transition-opacity ${cookingMode ? 'text-lg leading-relaxed' : ''} ${checkedSteps[idx] ? 'line-through opacity-50' : ''}`}
                  >
                    {step}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {recipe.notes && (
            <div className="mb-8 rounded-md-l border-l-4 border-md-sys-color-tertiary bg-md-sys-color-tertiary-container p-4 text-sm text-md-sys-color-on-tertiary-container">
              <strong>Chef's Notes:</strong>
              <p className="mt-1">{recipe.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

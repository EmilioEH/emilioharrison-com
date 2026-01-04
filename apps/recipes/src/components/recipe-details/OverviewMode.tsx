import React, { useEffect } from 'react'
import { Clock, Users, Flame, Star, ChevronRight, Play, Check } from 'lucide-react'
import { StarRating } from '../ui/StarRating'
import { CheckableItem } from './CheckableItem'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import type { Recipe } from '../../lib/types'

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
  const [checkedSteps, setCheckedSteps] = React.useState<Record<number, boolean>>({})
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
    <div className={`flex-1 overflow-y-auto pb-20`}>
      <div className="relative">
        {recipe.sourceImage && (
          <div className="h-64 w-full">
            <img src={recipe.sourceImage} className="h-full w-full object-cover" alt="Recipe" />
          </div>
        )}

        <div
          className={`rounded-t-md-xl shadow-md-3 relative -mt-6 border-t border-border bg-card p-6`}
        >
          {/* Metadata Header */}
          <div className="mb-6">
            <div className="mb-2 flex gap-2">
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
            </div>
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

            <div className="text-foreground-variant mt-4 flex gap-4 border-y border-border/20 py-3 text-sm font-medium">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-primary" />
                <span>{recipe.prepTime + recipe.cookTime}m</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4 text-primary" />
                <span>{recipe.servings} Servings</span>
              </div>
              <div className="flex items-center gap-1">
                <Flame className="h-4 w-4 text-primary" />
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
              <div className="bg-card-variant/50 text-foreground-variant flex items-center gap-2 rounded-lg px-3 py-1 text-xs font-medium">
                <span className="animate-spin">⟳</span> Estimating HEB Cost...
              </div>
            ) : estimateError ? (
              <button
                onClick={handleEstimateCost}
                className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                title={estimateError}
              >
                ⚠️ Couldn't estimate cost
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
              <div className="mb-2 flex items-center justify-between">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-4 w-4 ${s <= (recipe.rating || 0) ? 'fill-md-sys-color-tertiary text-md-sys-color-tertiary fill-yellow-400 text-yellow-400' : 'text-border'}`}
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
                <p
                  className="text-md-sys-color-on-tertiary-container font-body text-sm italic"
                  data-testid="recipe-notes"
                >
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
            <h2 className="mb-4 flex items-center justify-between font-display text-xl font-bold text-foreground">
              <div className="flex items-center gap-2">
                Ingredients
                <span className="text-foreground-variant font-body text-sm font-normal">
                  ({recipe.ingredients?.length || 0})
                </span>
              </div>
            </h2>
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
            <h2 className="mb-4 flex items-center justify-between font-display text-xl font-bold text-foreground">
              Instructions
              <Button
                variant="outline"
                size="sm"
                onClick={startCooking}
                className="h-auto rounded-full px-3 py-1 text-xs uppercase tracking-widest"
              >
                Cooking Mode <Play className="fill-current" />
              </Button>
            </h2>
            <div className="space-y-4">
              {recipe.steps.map((step, idx) => (
                <div key={idx} className="flex gap-4">
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
                </div>
              ))}
            </div>
          </div>

          {recipe.notes && (
            <div className="border-md-sys-color-tertiary bg-md-sys-color-tertiary-container text-md-sys-color-on-tertiary-container mb-8 rounded-lg border-l-4 p-4 text-sm">
              <strong>Chef's Notes:</strong>
              <p className="mt-1">{recipe.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

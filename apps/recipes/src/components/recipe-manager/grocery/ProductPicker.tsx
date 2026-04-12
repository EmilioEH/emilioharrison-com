import React, { useState, useCallback, useMemo } from 'react'
import { ShoppingBag, Check, Loader2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { Stack, Inline } from '@/components/ui/layout'
import { ProductSelectionSheet } from './ProductSelectionSheet'
import { hebProductToIngredientFields } from '../../../lib/heb-url'
import type {
  ShoppableIngredient,
  HebProduct,
  ProductMatchResult,
  ProductOverride,
} from '../../../lib/types'

interface ProductPickerProps {
  ingredients: ShoppableIngredient[]
  productMatches: ProductMatchResult[]
  productPickerStatus: 'pending' | 'searching' | 'ready' | 'complete' | undefined
  weekStartDate: string
  userId: string
  onItemMatched: () => void
}

export const ProductPicker: React.FC<ProductPickerProps> = ({
  ingredients,
  productMatches,
  productPickerStatus,
  weekStartDate,
  userId,
  onItemMatched,
}) => {
  const [selectedIngredient, setSelectedIngredient] = useState<ShoppableIngredient | null>(null)
  const [selectedResults, setSelectedResults] = useState<HebProduct[]>([])
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [matchingItem, setMatchingItem] = useState<string | null>(null)

  // Build a map of ingredient name → match results
  const matchMap = useMemo(() => {
    const map = new Map<string, ProductMatchResult>()
    for (const match of productMatches) {
      map.set(match.ingredientName.toLowerCase().trim(), match)
    }
    return map
  }, [productMatches])

  // Filter to only unmatched ingredients (no hebProductId)
  const unmatchedIngredients = useMemo(() => {
    return ingredients.filter((ing) => !ing.hebProductId)
  }, [ingredients])

  // Count matched items from this session
  const matchedThisSession = useMemo(() => {
    return productMatches.filter((m) => m.status === 'matched' || m.status === 'skipped').length
  }, [productMatches])

  const totalToMatch = unmatchedIngredients.length
  const progressPercent =
    totalToMatch > 0 ? Math.round((matchedThisSession / totalToMatch) * 100) : 100

  const getBaseUrl = useCallback(() => {
    const base = import.meta.env.BASE_URL
    return base.endsWith('/') ? base : `${base}/`
  }, [])

  const handleOpenPicker = (ingredient: ShoppableIngredient) => {
    const match = matchMap.get(ingredient.name.toLowerCase().trim())
    setSelectedIngredient(ingredient)
    setSelectedResults(match?.results || [])
  }

  const handleSelect = useCallback(
    async (product: HebProduct) => {
      if (!selectedIngredient) return

      setMatchingItem(selectedIngredient.name)
      const baseUrl = getBaseUrl()
      const fields = hebProductToIngredientFields(product)

      try {
        // 1. Update the ingredient in the grocery list
        await fetch(`${baseUrl}api/grocery/items`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weekStartDate,
            userId,
            itemName: selectedIngredient.name,
            updates: fields,
          }),
        })

        // 2. Save as product override for future weeks
        const override: ProductOverride = {
          name: selectedIngredient.name,
          ...fields,
          updatedAt: new Date().toISOString(),
        }
        await fetch(`${baseUrl}api/grocery/overrides`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, override }),
        })

        onItemMatched()
      } catch (err) {
        console.error('[ProductPicker] Failed to save selection:', err)
      } finally {
        setMatchingItem(null)
        setSelectedIngredient(null)
      }
    },
    [selectedIngredient, weekStartDate, userId, onItemMatched, getBaseUrl],
  )

  const handleSkip = useCallback(() => {
    setSelectedIngredient(null)
  }, [])

  // Don't render if all items are already matched or status is complete
  if (
    productPickerStatus === 'complete' ||
    (productPickerStatus !== 'searching' && unmatchedIngredients.length === 0)
  ) {
    return null
  }

  const isSearching = productPickerStatus === 'searching'

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex w-full items-center justify-between rounded-t-xl border border-border bg-card px-4 py-3 text-left shadow-sm transition-colors hover:bg-muted/30"
      >
        <Inline spacing="sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <ShoppingBag className="h-4 w-4 text-primary" />
          </div>
          <Stack spacing="xs">
            <span className="text-sm font-bold">Product Picker</span>
            <span className="text-xs text-muted-foreground">
              {isSearching
                ? 'Finding products at H-E-B...'
                : `${unmatchedIngredients.length} item${unmatchedIngredients.length !== 1 ? 's' : ''} need matching`}
            </span>
          </Stack>
        </Inline>
        <Inline spacing="sm">
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <span className="text-xs font-medium text-muted-foreground">{progressPercent}%</span>
          )}
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
        </Inline>
      </button>

      {/* Progress Bar */}
      {!isCollapsed && (
        <div className="h-1 w-full overflow-hidden bg-muted">
          <div
            className={cn(
              'h-full transition-all duration-500',
              isSearching ? 'animate-pulse bg-primary/50' : 'bg-primary',
            )}
            style={{ width: isSearching ? '100%' : `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Item Cards */}
      {!isCollapsed && (
        <div className="overflow-hidden rounded-b-xl border border-t-0 border-border bg-card shadow-sm">
          {isSearching ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 animate-pulse text-primary" />
              Searching H-E-B for your items...
            </div>
          ) : (
            <div className="divide-y divide-border">
              {unmatchedIngredients.map((ingredient) => {
                const match = matchMap.get(ingredient.name.toLowerCase().trim())
                const topResult = match?.results?.[0]
                const isMatching = matchingItem === ingredient.name
                const hasResults = match && match.results.length > 0

                return (
                  <button
                    key={ingredient.name}
                    type="button"
                    onClick={() => !isMatching && handleOpenPicker(ingredient)}
                    disabled={isMatching}
                    className={cn(
                      'flex w-full items-center gap-3 p-3 text-left transition-colors',
                      isMatching ? 'opacity-50' : 'hover:bg-muted/30',
                    )}
                  >
                    {/* Preview thumbnail (top result or placeholder) */}
                    {topResult?.imageUrl ? (
                      <img
                        src={topResult.imageUrl}
                        alt=""
                        className="h-24 w-24 rounded-lg object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-muted text-lg">
                        🔍
                      </div>
                    )}

                    {/* Ingredient info */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold capitalize">{ingredient.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {ingredient.purchaseAmount > 0
                          ? `${ingredient.purchaseAmount} ${ingredient.purchaseUnit}`
                          : ''}
                        {hasResults && topResult && (
                          <span className="ml-1">
                            · Top match: {topResult.name.substring(0, 30)}
                            {topResult.name.length > 30 ? '...' : ''}
                          </span>
                        )}
                      </p>
                      {hasResults && topResult && topResult.price > 0 && (
                        <span className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">
                          ${topResult.price.toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Status indicator */}
                    {isMatching ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : !hasResults ? (
                      <span className="text-xs text-muted-foreground">No results</span>
                    ) : (
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        Pick
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* All matched state */}
          {!isSearching && unmatchedIngredients.length === 0 && matchedThisSession > 0 && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-green-600">
              <Check className="h-4 w-4" />
              All products matched!
            </div>
          )}
        </div>
      )}

      {/* Product Selection Sheet */}
      {selectedIngredient && (
        <ProductSelectionSheet
          ingredient={selectedIngredient}
          results={selectedResults}
          onSelect={handleSelect}
          onSkip={handleSkip}
          onClose={() => setSelectedIngredient(null)}
        />
      )}
    </div>
  )
}

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { X, Search, Check, MapPin, DollarSign, Loader2, SkipForward } from 'lucide-react'
import { cn } from '../../../lib/utils'
import type { HebProduct, ShoppableIngredient } from '../../../lib/types'
import { useHebSearchUrl } from '../../../hooks/useHebSearchUrl'

interface ProductSelectionSheetProps {
  ingredient: ShoppableIngredient
  results: HebProduct[]
  onSelect: (product: HebProduct) => void
  onSkip: () => void
  onClose: () => void
}

export const ProductSelectionSheet: React.FC<ProductSelectionSheetProps> = ({
  ingredient,
  results: initialResults,
  onSelect,
  onSkip,
  onClose,
}) => {
  const { buildUrl } = useHebSearchUrl()
  const [results, setResults] = useState<HebProduct[]>(initialResults)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const handleSearch = useCallback(
    (query: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)

      if (query.length < 2) {
        setResults(initialResults)
        setSearching(false)
        return
      }

      setSearching(true)
      debounceRef.current = setTimeout(async () => {
        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller

        try {
          const baseUrl = import.meta.env.BASE_URL.endsWith('/')
            ? import.meta.env.BASE_URL
            : `${import.meta.env.BASE_URL}/`

          const response = await fetch(buildUrl(query, baseUrl), { signal: controller.signal })

          if (!response.ok) throw new Error('Search failed')

          const data = (await response.json()) as {
            results: Array<{ product: HebProduct }>
          }
          if (!controller.signal.aborted) {
            setResults(data.results.map((r) => r.product))
            setSearching(false)
          }
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return
          if (!abortRef.current?.signal.aborted) {
            setSearching(false)
          }
        }
      }, 350)
    },
    [initialResults, buildUrl],
  )

  useEffect(() => {
    if (searchQuery) handleSearch(searchQuery)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    }
  }, [searchQuery, handleSearch])

  const handleSelect = (product: HebProduct) => {
    setSelectedId(product.productId)
    // Brief delay to show selection feedback
    setTimeout(() => onSelect(product), 200)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close product picker"
      />

      {/* Sheet */}
      <div className="relative w-full max-w-lg rounded-t-2xl border border-border bg-card shadow-xl duration-300 animate-in slide-in-from-bottom">
        <div className="flex max-h-[85vh] flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">Pick a product for</p>
              <h3 className="font-display text-lg font-bold capitalize">
                {ingredient.purchaseAmount > 0
                  ? `${ingredient.purchaseAmount} ${ingredient.purchaseUnit} `
                  : ''}
                {ingredient.name}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search Input */}
          <div className="border-b border-border px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search H-E-B for something else..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted/50 py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto p-2">
            {results.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {searching ? 'Searching...' : 'No products found'}
              </div>
            ) : (
              <div className="space-y-1">
                {results.map((product) => {
                  const isSelected = selectedId === product.productId
                  const isStatic = product.productId.startsWith('static-')

                  return (
                    <button
                      key={product.productId}
                      type="button"
                      onClick={() => handleSelect(product)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-xl p-3 text-left transition-all',
                        isSelected ? 'bg-primary/10 ring-2 ring-primary' : 'hover:bg-muted/50',
                      )}
                    >
                      {/* Product Image */}
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt=""
                          className="h-16 w-16 rounded-lg object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted text-2xl">
                          🛒
                        </div>
                      )}

                      {/* Product Info */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-tight">{product.name}</p>
                        {product.brand && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{product.brand}</p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {product.price > 0 && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              <DollarSign className="h-3 w-3" />
                              {product.salePrice ? (
                                <>
                                  <span className="line-through opacity-60">
                                    {product.price.toFixed(2)}
                                  </span>
                                  <span className="ml-0.5">{product.salePrice.toFixed(2)}</span>
                                </>
                              ) : (
                                product.price.toFixed(2)
                              )}
                              {product.priceUnit && (
                                <span className="font-normal opacity-75">/{product.priceUnit}</span>
                              )}
                            </span>
                          )}
                          {product.size && (
                            <span className="text-xs text-muted-foreground">{product.size}</span>
                          )}
                          {isStatic && (
                            <span className="text-[10px] text-muted-foreground/60">Estimated</span>
                          )}
                        </div>
                        {product.storeLocation && (
                          <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                            <MapPin className="h-2.5 w-2.5" />
                            {product.storeLocation}
                          </p>
                        )}
                        {!product.inStock && (
                          <p className="mt-1 text-[10px] font-medium text-red-500">Out of stock</p>
                        )}
                      </div>

                      {/* Selection indicator */}
                      {isSelected && (
                        <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                          <Check className="h-3.5 w-3.5 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer: Skip button */}
          <div className="border-t border-border p-4">
            <button
              type="button"
              onClick={onSkip}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <SkipForward className="h-4 w-4" />
              Skip — I'll pick later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

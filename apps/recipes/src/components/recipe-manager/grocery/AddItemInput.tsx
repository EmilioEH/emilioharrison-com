import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Search, Plus, X, DollarSign, Link2, Loader2, MapPin, Tag } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { isHebUrl } from '../../../lib/heb-url'
import { HEB_CATEGORY_ORDER } from '../../../lib/heb-manor-aisles'
import type { ShoppableIngredient, HebProduct } from '../../../lib/types'

interface AddItemInputProps {
  onAddItem: (item: ShoppableIngredient) => Promise<void>
  isLoading?: boolean
}

/** Shape returned by /api/grocery/heb-search */
interface HebSearchResult {
  product: HebProduct
  ingredientFields: Partial<ShoppableIngredient>
}

interface FormState {
  name: string
  quantity: string
  unit: string
  category: string
  hebPrice?: number
  hebPriceUnit?: string
  hebUnitPrice?: number
  hebUnitPriceUnit?: string
  aisle?: number
  hebProductId?: string
  hebProductUrl?: string
  imageUrl?: string
  hebSize?: string
  storeLocation?: string
}

const DEFAULT_FORM: FormState = {
  name: '',
  quantity: '1',
  unit: 'item',
  category: 'Pantry & Condiments',
}

export const AddItemInput: React.FC<AddItemInputProps> = ({ onAddItem, isLoading }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<HebSearchResult[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [searching, setSearching] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)

  // HEB URL import state
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [hebUrl, setHebUrl] = useState('')
  const [urlLoading, setUrlLoading] = useState(false)
  const [urlError, setUrlError] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Debounced live search via HEB GraphQL API
  const handleSearch = useCallback((searchQuery: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (searchQuery.length < 2) {
      setResults([])
      setShowDropdown(false)
      setSearching(false)
      return
    }

    setSearching(true)

    debounceRef.current = setTimeout(async () => {
      // Cancel any in-flight request
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const baseUrl = import.meta.env.BASE_URL.endsWith('/')
          ? import.meta.env.BASE_URL
          : `${import.meta.env.BASE_URL}/`

        const response = await fetch(
          `${baseUrl}api/grocery/heb-search?q=${encodeURIComponent(searchQuery)}`,
          { signal: controller.signal },
        )

        if (!response.ok) throw new Error('Search failed')

        const data = (await response.json()) as { results: HebSearchResult[] }
        if (!controller.signal.aborted) {
          setResults(data.results)
          setShowDropdown(data.results.length > 0)
          setSearching(false)
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (!controller.signal.aborted) {
          setResults([])
          setShowDropdown(false)
          setSearching(false)
        }
      }
    }, 350)
  }, [])

  useEffect(() => {
    handleSearch(query)
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      abortRef.current?.abort()
    }
  }, [query, handleSearch])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus URL input when shown
  useEffect(() => {
    if (showUrlInput) {
      urlInputRef.current?.focus()
    }
  }, [showUrlInput])

  const selectProduct = (result: HebSearchResult) => {
    const { product, ingredientFields } = result
    setForm({
      name: product.name,
      quantity: '1',
      unit: product.priceUnit || 'each',
      category: ingredientFields.category || product.category || 'Pantry & Condiments',
      hebPrice: ingredientFields.hebPrice,
      hebPriceUnit: ingredientFields.hebPriceUnit,
      hebProductId: ingredientFields.hebProductId,
      hebProductUrl: product.productUrl ? `https://www.heb.com${product.productUrl}` : undefined,
      imageUrl: ingredientFields.imageUrl,
      hebSize: ingredientFields.hebSize,
      storeLocation: ingredientFields.storeLocation,
      hebUnitPrice: product.unitPrice,
      hebUnitPriceUnit: product.unitPriceUnit,
    })
    setQuery('')
    setShowDropdown(false)
    setShowForm(true)
  }

  const handleHebUrlSubmit = async () => {
    if (!hebUrl.trim()) return

    if (!isHebUrl(hebUrl)) {
      setUrlError('Please enter a valid H-E-B product URL')
      return
    }

    setUrlLoading(true)
    setUrlError('')

    try {
      const baseUrl = import.meta.env.BASE_URL.endsWith('/')
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`

      const response = await fetch(`${baseUrl}api/grocery/heb-lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: hebUrl.trim() }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to look up product')
      }

      const { product, ingredientFields } = (await response.json()) as {
        source: string
        product: HebProduct
        ingredientFields: Partial<ShoppableIngredient>
      }

      setForm({
        name: product.name,
        quantity: '1',
        unit: product.priceUnit || 'each',
        category: ingredientFields.category || 'Pantry & Condiments',
        hebPrice: ingredientFields.hebPrice,
        hebPriceUnit: ingredientFields.hebPriceUnit,
        hebProductId: ingredientFields.hebProductId,
        hebProductUrl: ingredientFields.hebProductUrl,
        imageUrl: ingredientFields.imageUrl,
        hebSize: ingredientFields.hebSize,
        storeLocation: ingredientFields.storeLocation,
      })

      setHebUrl('')
      setShowUrlInput(false)
      setShowForm(true)
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : 'Failed to look up product')
    } finally {
      setUrlLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || submitting) return

    const quantity = parseFloat(form.quantity) || 1

    const item: ShoppableIngredient = {
      name: form.name.trim(),
      purchaseAmount: quantity,
      purchaseUnit: form.unit || 'item',
      category: form.category,
      isManual: true,
      sources: [],
      ...(form.hebPrice && { hebPrice: form.hebPrice }),
      ...(form.hebPriceUnit && { hebPriceUnit: form.hebPriceUnit }),
      ...(form.hebUnitPrice && { hebUnitPrice: form.hebUnitPrice }),
      ...(form.hebUnitPriceUnit && { hebUnitPriceUnit: form.hebUnitPriceUnit }),
      ...(form.aisle && { aisle: form.aisle }),
      ...(form.hebProductId && { hebProductId: form.hebProductId }),
      ...(form.hebProductUrl && { hebProductUrl: form.hebProductUrl }),
      ...(form.imageUrl && { imageUrl: form.imageUrl }),
      ...(form.hebSize && { hebSize: form.hebSize }),
      ...(form.storeLocation && { storeLocation: form.storeLocation }),
    }

    setSubmitting(true)
    try {
      await onAddItem(item)
      setForm(DEFAULT_FORM)
      setShowForm(false)
    } catch (err) {
      console.error('Failed to add item:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const cancelForm = () => {
    setShowForm(false)
    setForm(DEFAULT_FORM)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowDropdown(false)
      if (showForm) {
        cancelForm()
      }
    } else if (e.key === 'Enter' && !showDropdown && query.trim()) {
      e.preventDefault()
      setForm({ ...DEFAULT_FORM, name: query.trim() })
      setQuery('')
      setShowDropdown(false)
      setShowForm(true)
    }
  }

  return (
    <div className="relative mb-4" ref={dropdownRef}>
      {/* Search Input */}
      {!showForm && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => query.length >= 2 && results.length > 0 && setShowDropdown(true)}
              placeholder="Search H-E-B products..."
              className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-10 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={isLoading}
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Action buttons: Custom item | HEB URL */}
          {!showUrlInput && (
            <div className="mt-2 flex items-center gap-3 px-1">
              <button
                type="button"
                onClick={() => {
                  setForm({ ...DEFAULT_FORM, name: query.trim() || '' })
                  setQuery('')
                  setShowDropdown(false)
                  setShowForm(true)
                }}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                <Plus className="h-3 w-3" />
                Add custom item
              </button>
              <span className="text-xs text-muted-foreground/40">|</span>
              <button
                type="button"
                onClick={() => setShowUrlInput(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                <Link2 className="h-3 w-3" />
                Import from H-E-B URL
              </button>
            </div>
          )}

          {/* HEB URL Input */}
          {showUrlInput && (
            <div className="mt-2 flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={urlInputRef}
                  type="url"
                  value={hebUrl}
                  onChange={(e) => {
                    setHebUrl(e.target.value)
                    setUrlError('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleHebUrlSubmit()
                    }
                    if (e.key === 'Escape') {
                      setShowUrlInput(false)
                      setHebUrl('')
                      setUrlError('')
                    }
                  }}
                  placeholder="https://www.heb.com/product-detail/..."
                  className={cn(
                    'w-full rounded-xl border bg-card py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1',
                    urlError
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                      : 'border-border focus:border-primary focus:ring-primary',
                  )}
                  disabled={urlLoading}
                />
              </div>
              <button
                type="button"
                onClick={handleHebUrlSubmit}
                disabled={urlLoading || !hebUrl.trim()}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-4 py-3 text-sm font-bold transition-colors',
                  urlLoading || !hebUrl.trim()
                    ? 'cursor-not-allowed bg-muted text-muted-foreground'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90',
                )}
              >
                {urlLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUrlInput(false)
                  setHebUrl('')
                  setUrlError('')
                }}
                className="rounded-xl p-3 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {urlError && <p className="mt-1 px-1 text-xs text-red-500">{urlError}</p>}
        </>
      )}

      {/* Autocomplete Dropdown */}
      {showDropdown && !showForm && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
          {results.map((result, idx) => {
            const { product } = result
            const unitPriceStr =
              product.unitPrice && product.unitPriceUnit
                ? `$${product.unitPrice.toFixed(2)}/${product.unitPriceUnit}`
                : null
            return (
              <button
                key={`${product.productId}-${idx}`}
                type="button"
                onClick={() => selectProduct(result)}
                className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted"
              >
                {/* Product image */}
                {product.imageUrl && (
                  <img
                    src={product.imageUrl}
                    alt=""
                    className="mt-0.5 h-10 w-10 flex-shrink-0 rounded-lg object-cover"
                    loading="lazy"
                  />
                )}
                {/* Product info */}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{product.name}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    {product.storeLocation && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" />
                        {product.storeLocation}
                      </span>
                    )}
                    {product.category && (
                      <span className="flex items-center gap-0.5">
                        <Tag className="h-3 w-3" />
                        {product.category}
                      </span>
                    )}
                  </div>
                </div>
                {/* Price badge */}
                {product.price > 0 && (
                  <div className="flex flex-shrink-0 flex-col items-end gap-0.5">
                    <span className="flex items-center gap-0.5 rounded-md bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <DollarSign className="h-3 w-3" />
                      {(product.salePrice ?? product.price).toFixed(2)}
                    </span>
                    {unitPriceStr && (
                      <span className="text-[10px] text-muted-foreground">{unitPriceStr}</span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Add Item Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Product image thumbnail */}
              {form.imageUrl && (
                <img
                  src={form.imageUrl}
                  alt={form.name}
                  className="h-12 w-12 rounded-lg object-cover"
                />
              )}
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">{form.name}</h3>
                {form.hebSize && <p className="text-xs text-muted-foreground">{form.hebSize}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={cancelForm}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Price & location info */}
          {(form.hebPrice || form.storeLocation) && (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {form.hebPrice && (
                <span className="flex items-center gap-0.5">
                  <DollarSign className="h-3.5 w-3.5" />${form.hebPrice.toFixed(2)} /{' '}
                  {form.hebPriceUnit || 'each'}
                </span>
              )}
              {form.hebUnitPrice && form.hebUnitPriceUnit && (
                <span className="text-xs">
                  (${form.hebUnitPrice.toFixed(2)}/{form.hebUnitPriceUnit})
                </span>
              )}
              {form.aisle && <span>• Aisle {form.aisle}</span>}
              {form.storeLocation && <span className="text-xs">• {form.storeLocation}</span>}
            </div>
          )}

          <div className="flex gap-3">
            {/* Quantity */}
            <div className="w-20">
              <label
                htmlFor="add-item-qty"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                Qty
              </label>
              <input
                id="add-item-qty"
                type="number"
                step="0.1"
                min="0.1"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            {/* Unit */}
            <div className="flex-1">
              <label
                htmlFor="add-item-unit"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                Unit
              </label>
              <input
                id="add-item-unit"
                type="text"
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                placeholder="item, lb, oz..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            {/* Category */}
            <div className="flex-1">
              <label
                htmlFor="add-item-category"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                Category
              </label>
              <select
                id="add-item-category"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
              >
                {HEB_CATEGORY_ORDER.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !form.name.trim()}
            className={cn(
              'mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-display font-bold transition-colors',
              submitting || !form.name.trim()
                ? 'cursor-not-allowed bg-muted text-muted-foreground'
                : 'bg-primary text-primary-foreground hover:bg-primary/90',
            )}
          >
            <Plus className="h-4 w-4" />
            {submitting ? 'Adding...' : 'Add to List'}
          </button>
        </form>
      )}
    </div>
  )
}

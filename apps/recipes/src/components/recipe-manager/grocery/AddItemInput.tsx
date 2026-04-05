import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Search, Plus, X, DollarSign } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { searchProducts, type SearchResult } from '../../../lib/heb-products'
import { HEB_CATEGORY_ORDER } from '../../../lib/heb-manor-aisles'
import type { ShoppableIngredient } from '../../../lib/types'

interface AddItemInputProps {
  onAddItem: (item: ShoppableIngredient) => Promise<void>
  isLoading?: boolean
}

interface FormState {
  name: string
  quantity: string
  unit: string
  category: string
  hebPrice?: number
  hebPriceUnit?: string
  aisle?: number
}

const DEFAULT_FORM: FormState = {
  name: '',
  quantity: '1',
  unit: 'item',
  category: 'Pantry & Condiments',
}

export const AddItemInput: React.FC<AddItemInputProps> = ({ onAddItem, isLoading }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced search
  const handleSearch = useCallback((searchQuery: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (searchQuery.length < 2) {
      setResults([])
      setShowDropdown(false)
      return
    }

    debounceRef.current = setTimeout(() => {
      const searchResults = searchProducts(searchQuery, 8)
      setResults(searchResults)
      setShowDropdown(searchResults.length > 0)
    }, 200)
  }, [])

  useEffect(() => {
    handleSearch(query)
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
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

  const selectProduct = (result: SearchResult) => {
    const { product } = result
    setForm({
      name: product.name,
      quantity: '1',
      unit: product.hebPriceUnit || 'item',
      category: product.category,
      hebPrice: product.hebPrice,
      hebPriceUnit: product.hebPriceUnit,
      aisle: product.aisle,
    })
    setQuery('')
    setShowDropdown(false)
    setShowForm(true)
  }

  const handleCustomItem = () => {
    if (!query.trim()) return
    setForm({
      ...DEFAULT_FORM,
      name: query.trim(),
    })
    setQuery('')
    setShowDropdown(false)
    setShowForm(true)
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
      ...(form.aisle && { aisle: form.aisle }),
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
      handleCustomItem()
    }
  }

  return (
    <div className="relative mb-4" ref={dropdownRef}>
      {/* Search Input */}
      {!showForm && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => query.length >= 2 && results.length > 0 && setShowDropdown(true)}
            placeholder="Add item to list..."
            className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isLoading}
          />
        </div>
      )}

      {/* Autocomplete Dropdown */}
      {showDropdown && !showForm && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
          {results.map((result, idx) => (
            <button
              key={`${result.product.name}-${idx}`}
              type="button"
              onClick={() => selectProduct(result)}
              className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">{result.product.name}</div>
                <div className="text-xs text-muted-foreground">
                  {result.product.category}
                  {result.product.aisle && ` • Aisle ${result.product.aisle}`}
                </div>
              </div>
              {result.product.hebPrice && (
                <span className="ml-2 flex items-center gap-0.5 rounded bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <DollarSign className="h-3 w-3" />
                  {result.product.hebPrice.toFixed(2)}
                </span>
              )}
            </button>
          ))}
          {/* Custom item option */}
          {query.trim() && (
            <button
              type="button"
              onClick={handleCustomItem}
              className="flex w-full items-center gap-2 border-t border-border px-4 py-3 text-left transition-colors hover:bg-muted"
            >
              <Plus className="h-4 w-4 text-primary" />
              <span className="text-foreground">
                Add &quot;{query.trim()}&quot; as custom item
              </span>
            </button>
          )}
        </div>
      )}

      {/* Add Item Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-foreground">{form.name}</h3>
            <button
              type="button"
              onClick={cancelForm}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Price badge if available */}
          {form.hebPrice && (
            <div className="mb-3 flex items-center gap-1 text-sm text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" />
              <span>
                ${form.hebPrice.toFixed(2)} / {form.hebPriceUnit || 'each'}
              </span>
              {form.aisle && <span className="ml-2">• Aisle {form.aisle}</span>}
            </div>
          )}

          <div className="flex gap-3">
            {/* Quantity */}
            <div className="w-20">
              <label htmlFor="add-item-qty" className="mb-1 block text-xs font-medium text-muted-foreground">Qty</label>
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
              <label htmlFor="add-item-unit" className="mb-1 block text-xs font-medium text-muted-foreground">Unit</label>
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
              <label htmlFor="add-item-category" className="mb-1 block text-xs font-medium text-muted-foreground">
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

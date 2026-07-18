import React, { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { CATEGORY_ORDER } from '../../../lib/grocery-utils'
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
}

const DEFAULT_FORM: FormState = {
  name: '',
  quantity: '1',
  unit: 'item',
  category: 'Pantry',
}

export const AddItemInput: React.FC<AddItemInputProps> = ({ onAddItem, isLoading }) => {
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)

  const openForm = () => {
    if (!query.trim()) return
    setForm({ ...DEFAULT_FORM, name: query.trim() })
    setQuery('')
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
      if (showForm) {
        cancelForm()
      }
    } else if (e.key === 'Enter' && query.trim()) {
      e.preventDefault()
      openForm()
    }
  }

  return (
    <div className="relative mb-4">
      {/* Item name input */}
      {!showForm && (
        <div className="relative">
          <Plus className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={openForm}
            placeholder="Add an item..."
            className="w-full rounded-xl border border-dashed border-primary/40 bg-card py-3 pl-10 pr-10 text-foreground placeholder:text-muted-foreground focus:border-solid focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isLoading}
          />
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
                {CATEGORY_ORDER.map((cat) => (
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

import React, { useState, useEffect } from 'react'
import { X, Minus, Plus, DollarSign, ExternalLink, Trash2 } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { HEB_CATEGORY_ORDER } from '../../../lib/heb-manor-aisles'
import type { ShoppableIngredient, ProductOverride } from '../../../lib/types'

interface GroceryItemEditSheetProps {
  item: ShoppableIngredient
  onSave: (updates: Partial<ShoppableIngredient>) => Promise<void>
  onRemove: () => Promise<void>
  onSaveOverride: (override: ProductOverride) => Promise<void>
  onClose: () => void
}

export const GroceryItemEditSheet: React.FC<GroceryItemEditSheetProps> = ({
  item,
  onSave,
  onRemove,
  onSaveOverride,
  onClose,
}) => {
  const [qty, setQty] = useState(item.purchaseAmount)
  const [price, setPrice] = useState(item.hebPrice?.toString() || '')
  const [unit, setUnit] = useState(item.purchaseUnit)
  const [category, setCategory] = useState(item.category)
  const [aisle, setAisle] = useState(item.aisle?.toString() || '')
  const [storeLocation, setStoreLocation] = useState(item.storeLocation || '')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // Prevent body scroll when sheet is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updates: Partial<ShoppableIngredient> = {
        purchaseAmount: qty,
        purchaseUnit: unit,
        category,
        ...(price && { hebPrice: parseFloat(price) }),
        ...(aisle && { aisle: parseInt(aisle) }),
        ...(storeLocation && { storeLocation }),
      }

      await onSave(updates)

      // Also save as product override for future lists
      const override: ProductOverride = {
        name: item.name,
        ...(item.hebProductId && { hebProductId: item.hebProductId }),
        ...(item.hebProductUrl && { hebProductUrl: item.hebProductUrl }),
        ...(item.imageUrl && { imageUrl: item.imageUrl }),
        ...(price && { hebPrice: parseFloat(price) }),
        ...(item.hebPriceUnit && { hebPriceUnit: item.hebPriceUnit }),
        ...(item.hebUnitPrice !== undefined && { hebUnitPrice: item.hebUnitPrice }),
        ...(item.hebUnitPriceUnit && { hebUnitPriceUnit: item.hebUnitPriceUnit }),
        ...(item.hebSize && { hebSize: item.hebSize }),
        category,
        ...(aisle && { aisle: parseInt(aisle) }),
        ...(storeLocation && { storeLocation }),
        updatedAt: new Date().toISOString(),
      }
      await onSaveOverride(override)

      onClose()
    } catch (err) {
      console.error('Failed to save item:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    setRemoving(true)
    try {
      await onRemove()
      onClose()
    } catch (err) {
      console.error('Failed to remove item:', err)
    } finally {
      setRemoving(false)
    }
  }

  const sources = item.sources ?? []

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        className="fixed inset-0 z-50 bg-black/50 duration-200 animate-in fade-in"
        onClick={onClose}
        aria-label="Close edit sheet"
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-border bg-card shadow-xl duration-300 animate-in slide-in-from-bottom">
        {/* Drag handle */}
        <div className="sticky top-0 z-10 flex justify-center bg-card pb-2 pt-3">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="px-5 pb-8">
          {/* Header with image */}
          <div className="mb-5 flex items-start gap-4">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="h-20 w-20 rounded-xl object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-muted text-2xl">
                🛒
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-display text-xl font-bold text-foreground">{item.name}</h3>
              {item.hebSize && (
                <p className="mt-0.5 text-sm text-muted-foreground">{item.hebSize}</p>
              )}
              {item.hebPrice && (
                <p className="mt-0.5 text-sm font-semibold text-green-700 dark:text-green-400">
                  ${item.hebPrice.toFixed(2)}
                  {item.hebPriceUnit && ` / ${item.hebPriceUnit}`}
                  {item.hebUnitPrice && item.hebUnitPriceUnit && (
                    <span className="ml-1 font-normal text-muted-foreground">
                      (${item.hebUnitPrice.toFixed(2)}/{item.hebUnitPriceUnit})
                    </span>
                  )}
                </p>
              )}
              {item.storeLocation && (
                <p className="mt-0.5 text-xs text-muted-foreground">{item.storeLocation}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quantity stepper */}
          <div className="mb-5">
            <label
              htmlFor="edit-item-qty"
              className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              Quantity
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQty(Math.max(0.5, qty - 1))}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background text-foreground transition-colors hover:bg-muted"
              >
                <Minus className="h-5 w-5" />
              </button>
              <input
                id="edit-item-qty"
                type="number"
                value={qty}
                onChange={(e) => setQty(parseFloat(e.target.value) || 1)}
                step="0.5"
                min="0.5"
                className="h-12 w-20 rounded-xl border border-border bg-background text-center font-display text-2xl font-bold text-foreground focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setQty(qty + 1)}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background text-foreground transition-colors hover:bg-muted"
              >
                <Plus className="h-5 w-5" />
              </button>
              <span className="text-sm text-muted-foreground">{unit}</span>
            </div>
          </div>

          {/* Edit details toggle */}
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="mb-4 text-sm font-medium text-primary hover:underline"
          >
            {showDetails ? 'Hide details' : 'Edit details'}
          </button>

          {/* Editable details */}
          {showDetails && (
            <div className="mb-5 space-y-3 rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label
                    htmlFor="edit-price"
                    className="mb-1 block text-xs font-medium text-muted-foreground"
                  >
                    Price
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="edit-price"
                      type="number"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label
                    htmlFor="edit-unit"
                    className="mb-1 block text-xs font-medium text-muted-foreground"
                  >
                    Unit
                  </label>
                  <input
                    id="edit-unit"
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="each, lb, oz..."
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label
                    htmlFor="edit-category"
                    className="mb-1 block text-xs font-medium text-muted-foreground"
                  >
                    Category
                  </label>
                  <select
                    id="edit-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                  >
                    {HEB_CATEGORY_ORDER.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <label
                    htmlFor="edit-aisle"
                    className="mb-1 block text-xs font-medium text-muted-foreground"
                  >
                    Aisle
                  </label>
                  <input
                    id="edit-aisle"
                    type="number"
                    value={aisle}
                    onChange={(e) => setAisle(e.target.value)}
                    placeholder="—"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="edit-location"
                  className="mb-1 block text-xs font-medium text-muted-foreground"
                >
                  Store Location
                </label>
                <input
                  id="edit-location"
                  type="text"
                  value={storeLocation}
                  onChange={(e) => setStoreLocation(e.target.value)}
                  placeholder="e.g., In Dairy on the Back Wall"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* HEB link */}
          {item.hebProductUrl && (
            <a
              href={item.hebProductUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-4 flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View on heb.com
            </a>
          )}

          {/* Source recipes */}
          {sources.length > 0 && (
            <div className="mb-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                From recipes
              </p>
              <div className="space-y-1">
                {sources.map((source, idx) => (
                  <div
                    key={`${source.recipeId}-${idx}`}
                    className="flex items-baseline justify-between text-sm"
                  >
                    <span className="font-medium text-foreground">{source.recipeTitle}</span>
                    <span className="text-xs text-muted-foreground">{source.originalAmount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 font-display font-bold transition-colors',
                saving
                  ? 'cursor-not-allowed bg-muted text-muted-foreground'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90',
              )}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 font-bold transition-colors',
                removing
                  ? 'cursor-not-allowed bg-muted text-muted-foreground'
                  : 'border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/20',
              )}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

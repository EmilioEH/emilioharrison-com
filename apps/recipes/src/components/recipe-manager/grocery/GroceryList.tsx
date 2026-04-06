import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { cn } from '../../../lib/utils'
import {
  Check,
  Trash2,
  ArrowLeft,
  ShoppingBasket,
  ChevronRight,
  ChevronDown,
  ListFilter,
  X,
  CheckSquare,
  DollarSign,
  Tag,
  CalendarDays,
  MapPin,
} from 'lucide-react'
import { Stack, Inline } from '@/components/ui/layout'
import {
  mergeShoppableIngredients,
  categorizeShoppableIngredients,
} from '../../../lib/grocery-logic'
import { confirm } from '../../../lib/dialogStore'
import type { Recipe, ShoppableIngredient, ProductOverride } from '../../../lib/types'
import { AddItemInput } from './AddItemInput'
import { RecurringItemToggle } from './RecurringItemToggle'
import { GroceryItemEditSheet } from './GroceryItemEditSheet'

interface GroceryListProps {
  ingredients: ShoppableIngredient[]
  isLoading?: boolean
  onClose: () => void
  recipes?: Recipe[]
  onOpenRecipe?: (recipe: Recipe) => void
  embedded?: boolean // Hide header when embedded in workspace
  // For manual item addition
  weekStartDate?: string
  userId?: string
  onItemAdded?: () => void // Callback to refresh list after adding item
}

export const GroceryList: React.FC<GroceryListProps> = ({
  ingredients,
  isLoading,
  onClose,
  recipes = [],
  onOpenRecipe,
  embedded = false,
  weekStartDate,
  userId,
  onItemAdded,
}) => {
  // 1. Merge & Categorize (Memoized)
  const categorizedList = useMemo(() => {
    // Safety check: ensure ingredients is an array
    const validIngredients = Array.isArray(ingredients) ? ingredients : []
    const merged = mergeShoppableIngredients(validIngredients)
    return categorizeShoppableIngredients(merged)
  }, [ingredients])

  // 2. Checked State (Persisted)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('grocery-checked')
      if (saved) {
        return new Set(JSON.parse(saved))
      }
    }
    return new Set()
  })

  // 3. Expanded State for accordion items
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // 4. Edit sheet state
  const [editingItem, setEditingItem] = useState<ShoppableIngredient | null>(null)

  // Persist effect
  useEffect(() => {
    localStorage.setItem('grocery-checked', JSON.stringify(Array.from(checkedItems)))
  }, [checkedItems])

  const toggleItem = (name: string) => {
    const next = new Set(checkedItems)
    if (next.has(name)) {
      next.delete(name)
    } else {
      next.add(name)
    }
    setCheckedItems(next)
  }

  const toggleExpanded = (itemKey: string, e: React.MouseEvent) => {
    e.stopPropagation() // Don't trigger check when expanding
    const next = new Set(expandedItems)
    if (next.has(itemKey)) {
      next.delete(itemKey)
    } else {
      next.add(itemKey)
    }
    setExpandedItems(next)
  }

  const clearChecked = async () => {
    if (await confirm('Remove all checked items?')) {
      setCheckedItems(new Set())
    }
  }

  // Base URL helper
  const getBaseUrl = useCallback(() => {
    const base = import.meta.env.BASE_URL
    return base.endsWith('/') ? base : `${base}/`
  }, [])

  // 5. Manual Item Addition
  const handleAddItem = useCallback(
    async (item: ShoppableIngredient) => {
      if (!weekStartDate || !userId) {
        console.warn('Cannot add item: missing weekStartDate or userId')
        return
      }

      const response = await fetch(`${getBaseUrl()}api/grocery/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekStartDate,
          userId,
          item,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add item')
      }

      // Refresh the list
      onItemAdded?.()
    },
    [weekStartDate, userId, onItemAdded, getBaseUrl],
  )

  // 6. Edit item (update in current list)
  const handleEditItem = useCallback(
    async (itemName: string, updates: Partial<ShoppableIngredient>) => {
      if (!weekStartDate || !userId) return

      const response = await fetch(`${getBaseUrl()}api/grocery/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekStartDate,
          userId,
          itemName,
          updates,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update item')
      }

      onItemAdded?.()
    },
    [weekStartDate, userId, onItemAdded, getBaseUrl],
  )

  // 7. Remove item from current list
  const handleRemoveItem = useCallback(
    async (itemName: string) => {
      if (!weekStartDate || !userId) return

      const response = await fetch(`${getBaseUrl()}api/grocery/items`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekStartDate,
          userId,
          itemName,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to remove item')
      }

      onItemAdded?.()
    },
    [weekStartDate, userId, onItemAdded, getBaseUrl],
  )

  // 8. Save product override (persists across weeks)
  const handleSaveOverride = useCallback(
    async (override: ProductOverride) => {
      if (!userId) return

      await fetch(`${getBaseUrl()}api/grocery/overrides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, override }),
      })
    },
    [userId, getBaseUrl],
  )

  // 9. Recurring Item Toggle
  const handleToggleRecurring = useCallback(
    async (itemName: string, frequencyWeeks: number | null) => {
      if (!userId) {
        console.warn('Cannot toggle recurring: missing userId')
        return
      }

      const baseUrl = getBaseUrl()

      // Find the item in the current list to get its details
      const item = ingredients.find(
        (ing) => ing.name.toLowerCase().trim() === itemName.toLowerCase().trim(),
      )

      if (frequencyWeeks === null) {
        // Remove from recurring - need to find the item ID first
        const getResponse = await fetch(`${baseUrl}api/grocery/recurring`)
        if (getResponse.ok) {
          const { items } = await getResponse.json()
          const recurringItem = items?.find(
            (i: { name: string }) => i.name.toLowerCase().trim() === itemName.toLowerCase().trim(),
          )
          if (recurringItem) {
            await fetch(`${baseUrl}api/grocery/recurring`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                itemId: recurringItem.id,
              }),
            })
          }
        }
      } else if (item) {
        // Add or update recurring item
        await fetch(`${baseUrl}api/grocery/recurring`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item: {
              name: item.name,
              purchaseAmount: item.purchaseAmount,
              purchaseUnit: item.purchaseUnit,
              category: item.category,
              frequencyWeeks,
              ...(item.aisle !== undefined && { aisle: item.aisle }),
              ...(item.hebPrice !== undefined && { hebPrice: item.hebPrice }),
              ...(item.hebPriceUnit !== undefined && { hebPriceUnit: item.hebPriceUnit }),
            },
          }),
        })
      }

      // Refresh the list to show updated recurring status
      if (weekStartDate) {
        await fetch(`${baseUrl}api/grocery/items`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weekStartDate,
            userId,
            itemName,
            updates:
              frequencyWeeks !== null
                ? { isRecurring: true, recurringFrequencyWeeks: frequencyWeeks }
                : { isRecurring: false, recurringFrequencyWeeks: undefined },
          }),
        })
      }
      onItemAdded?.()
    },
    [userId, weekStartDate, ingredients, onItemAdded, getBaseUrl],
  )

  // 10. Sharing

  // Helper to find recipe by ID for navigation
  const findRecipeById = (id: string): Recipe | undefined => {
    return recipes.find((r) => r.id === id)
  }

  // Info Modal State
  const [activeInfo, setActiveInfo] = useState<{
    recipeTitle: string
    ingredientAmount: string
    ingredientName: string
  } | null>(null)

  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col bg-card transition-colors duration-500',
        embedded ? 'w-full' : 'h-full duration-300 animate-in slide-in-from-right-4',
      )}
    >
      {/* Header - hidden when embedded */}
      {!embedded && (
        <Inline justify="between" className="px-4 pt-4">
          <h2 className="font-display text-2xl font-bold">Grocery List</h2>
          <Inline spacing="sm">
            <button
              onClick={() => console.log('Filters')}
              className="rounded-full bg-muted p-2 text-muted-foreground hover:text-foreground"
            >
              <ListFilter className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="rounded-full bg-muted p-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </Inline>
        </Inline>
      )}

      {/* Content */}
      <Stack spacing="lg" className="flex-1 overflow-y-auto p-4 pb-20">
        {/* Empty State */}
        {ingredients.length === 0 && (
          <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
            <div className="mb-4 rounded-full bg-muted p-6">
              <CheckSquare className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h3 className="font-display text-lg font-bold">All clear!</h3>
            <p className="max-w-xs text-sm text-muted-foreground">
              You haven't added any recipes to your plan yet.
            </p>
          </div>
        )}
        {/* Recipe Sources Header - scrolls with content */}
        {!embedded && !isLoading && recipes.length > 0 && (
          <div className="-mx-4 -mt-4 mb-6 border-b border-border bg-muted/30 px-6 py-4">
            <p className="text-base font-bold text-muted-foreground">
              Shopping for {recipes.length} Recipes
            </p>
            <Stack spacing="sm">
              {recipes.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => onOpenRecipe?.(recipe)}
                  className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2 text-sm font-medium transition-colors hover:bg-background hover:text-primary"
                >
                  <span className="truncate">{recipe.title}</span>
                  <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
                </button>
              ))}
            </Stack>
          </div>
        )}

        {/* Add Item Input - always show when we have weekStartDate and userId */}
        {weekStartDate && userId && !isLoading && (
          <AddItemInput onAddItem={handleAddItem} isLoading={isLoading} />
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="mt-4 font-bold">Generating shopping list...</p>
          </div>
        ) : (
          <>
            {categorizedList.map((category) => (
              <div key={category.name} className="duration-500 animate-in fade-in">
                <h3 className="mb-3 px-2 text-sm font-bold uppercase tracking-wider text-primary">
                  {category.name}
                </h3>
                <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                  {category.items.map((item) => {
                    const itemKey = `${item.name}-${item.purchaseUnit}`
                    const isChecked = checkedItems.has(item.name)
                    const isExpanded = expandedItems.has(itemKey)
                    const sources = item.sources ?? []
                    const multipleSources = sources.length > 1

                    return (
                      <div
                        key={itemKey}
                        className={`border-b border-border last:border-0 ${isChecked ? 'opacity-50' : ''}`}
                      >
                        {/* Main Item Row */}
                        <div className="flex flex-col p-4">
                          <div className="flex items-start">
                            {/* Expand/Collapse Toggle (Only if > 1 source) */}
                            {multipleSources ? (
                              <button
                                type="button"
                                onClick={(e) => toggleExpanded(itemKey, e)}
                                className="mr-2 mt-1 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                aria-label={isExpanded ? 'Collapse' : 'Expand'}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            ) : (
                              <div className="w-8" /> // Spacer to align with toggle items
                            )}

                            {/* Checkbox */}
                            <button
                              type="button"
                              onClick={() => toggleItem(item.name)}
                              aria-pressed={isChecked}
                              className="mt-1 flex items-center gap-4"
                            >
                              <div
                                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                                  isChecked
                                    ? 'border-primary bg-primary'
                                    : 'border-border hover:border-primary'
                                }`}
                              >
                                {isChecked && (
                                  <Check className="h-3.5 w-3.5 text-primary-foreground" />
                                )}
                              </div>
                            </button>

                            {/* Product thumbnail or unmatched indicator */}
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt=""
                                className="ml-2 mt-0.5 h-9 w-9 rounded-lg object-cover"
                                loading="lazy"
                              />
                            ) : !item.hebProductId && !item.isManual ? (
                              <div
                                className="ml-2 mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground/50"
                                title="No H-E-B product linked"
                              >
                                <ShoppingBasket className="h-4 w-4" />
                              </div>
                            ) : null}

                            {/* Item Details — tappable for edit */}
                            <button
                              type="button"
                              onClick={() => weekStartDate && userId && setEditingItem(item)}
                              className={cn(
                                'ml-3 flex-1 text-left',
                                isChecked
                                  ? 'text-muted-foreground line-through'
                                  : 'text-foreground',
                                weekStartDate && userId && 'cursor-pointer',
                              )}
                            >
                              <div className="flex flex-wrap items-baseline gap-1">
                                <span className="font-display text-lg font-bold">
                                  {item.purchaseAmount > 0
                                    ? Math.round(item.purchaseAmount * 100) / 100
                                    : ''}
                                </span>
                                <span className="text-sm font-medium opacity-80">
                                  {item.purchaseUnit !== 'unit' ? item.purchaseUnit : ''}
                                </span>
                                <span className="font-medium capitalize">{item.name}</span>
                                {/* Price Badge */}
                                {item.hebPrice && (
                                  <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-green-100 px-1 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                    <DollarSign className="h-2.5 w-2.5" />
                                    {item.hebPrice.toFixed(2)}
                                    {item.hebUnitPrice && item.hebUnitPriceUnit && (
                                      <span className="ml-0.5 font-normal opacity-75">
                                        ({item.hebUnitPrice.toFixed(2)}/{item.hebUnitPriceUnit})
                                      </span>
                                    )}
                                  </span>
                                )}
                                {/* Manual Item Badge */}
                                {item.isManual && (
                                  <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-blue-100 px-1 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                    <Tag className="h-2.5 w-2.5" />
                                    Manual
                                  </span>
                                )}
                                {/* Recurring Item Badge */}
                                {item.isRecurring && item.recurringFrequencyWeeks && (
                                  <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-purple-100 px-1 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                    <CalendarDays className="h-2.5 w-2.5" />
                                    {item.recurringFrequencyWeeks}w
                                  </span>
                                )}
                              </div>

                              {/* Size + Location row */}
                              {(item.hebSize || item.storeLocation) && (
                                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] text-muted-foreground">
                                  {item.hebSize && <span>{item.hebSize}</span>}
                                  {item.storeLocation && (
                                    <span className="flex items-center gap-0.5">
                                      <MapPin className="h-2.5 w-2.5" />
                                      {item.storeLocation}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Source Tags */}
                              <div className="mt-2 flex flex-wrap gap-2">
                                {sources.map((source, idx) => (
                                  <span
                                    key={`${source.recipeId}-${idx}`}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setActiveInfo({
                                        recipeTitle: source.recipeTitle,
                                        ingredientAmount: source.originalAmount,
                                        ingredientName: item.name,
                                      })
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.stopPropagation()
                                        setActiveInfo({
                                          recipeTitle: source.recipeTitle,
                                          ingredientAmount: source.originalAmount,
                                          ingredientName: item.name,
                                        })
                                      }
                                    }}
                                    className="flex max-w-[200px] items-center gap-1 overflow-hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted-foreground/20 hover:text-foreground"
                                  >
                                    <span className="truncate">{source.recipeTitle}</span>
                                  </span>
                                ))}
                              </div>
                            </button>

                            {/* Recurring Toggle */}
                            {userId && (
                              <RecurringItemToggle
                                itemName={item.name}
                                isRecurring={item.isRecurring}
                                recurringFrequencyWeeks={item.recurringFrequencyWeeks}
                                onToggleRecurring={handleToggleRecurring}
                                disabled={isChecked}
                              />
                            )}
                          </div>
                        </div>

                        {/* Expanded Source Details (Only if > 1 source) */}
                        {multipleSources && isExpanded && (
                          <div className="border-t border-border bg-muted/30 px-4 py-3 pl-14">
                            <Stack spacing="xs">
                              {sources.map((source, idx) => {
                                const recipe = findRecipeById(source.recipeId)
                                return (
                                  <div key={`${source.recipeId}-${idx}`} className="mb-2 last:mb-0">
                                    <button
                                      onClick={() => recipe && onOpenRecipe?.(recipe)}
                                      className="text-sm font-medium text-foreground transition-colors hover:text-primary"
                                      disabled={!recipe}
                                    >
                                      {source.recipeTitle}
                                    </button>
                                    <p className="ml-4 text-xs text-muted-foreground">
                                      {source.originalAmount}
                                    </p>
                                  </div>
                                )
                              })}
                            </Stack>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {categorizedList.length === 0 && ingredients.length > 0 && (
              <div className="py-20 text-center opacity-50">
                <ShoppingBasket className="mx-auto mb-4 h-16 w-16 text-muted-foreground/50" />
                <p>No ingredients found.</p>
              </div>
            )}
          </>
        )}
      </Stack>

      {/* Floating Action / Footer */}
      {checkedItems.size > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <button
            onClick={clearChecked}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-foreground px-6 py-3 font-medium text-background shadow-lg transition-transform hover:scale-105"
          >
            <Trash2 className="h-4 w-4" /> Uncheck All
          </button>
        </div>
      )}

      {/* Info Modal */}
      {activeInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 duration-200 animate-in fade-in">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl duration-200 animate-in zoom-in-95">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Source Details</h3>
              <button
                onClick={() => setActiveInfo(null)}
                className="rounded-full p-1 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Recipe</p>
                <p className="font-medium text-foreground">{activeInfo.recipeTitle}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Ingredient</p>
                <p className="font-medium capitalize text-foreground">
                  {activeInfo.ingredientName}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Original Quantity
                </p>
                <p className="font-display text-2xl font-bold text-primary">
                  {activeInfo.ingredientAmount}
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveInfo(null)}
              className="mt-6 w-full rounded-lg bg-primary py-2 font-bold text-primary-foreground hover:opacity-90"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Edit Bottom Sheet */}
      {editingItem && (
        <GroceryItemEditSheet
          item={editingItem}
          onSave={(updates) => handleEditItem(editingItem.name, updates)}
          onRemove={() => handleRemoveItem(editingItem.name)}
          onSaveOverride={handleSaveOverride}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  )
}

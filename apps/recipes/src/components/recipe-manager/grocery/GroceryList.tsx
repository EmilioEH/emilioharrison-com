import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
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
  Tag,
  ListChecks,
  Undo2,
} from 'lucide-react'
import { Stack, Inline } from '@/components/ui/layout'
import {
  mergeShoppableIngredients,
  categorizeShoppableIngredients,
} from '../../../lib/grocery-logic'
import { confirm } from '../../../lib/dialogStore'
import type { Recipe, ShoppableIngredient } from '../../../lib/types'
import { AddItemInput } from './AddItemInput'
import { GroceryItemEditSheet } from './GroceryItemEditSheet'
import { GroceryListSelectionBar } from './GroceryListSelectionBar'
import { triggerHaptic, LONG_PRESS_MS } from '../../../lib/haptics'

type ListFilterMode = 'default' | 'archived' | 'unneeded'

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
  // When false, skip combining same-name/unit ingredients across recipes — each stays its own
  // row, still category-grouped. Used by the "Raw" view (see RawIngredientsList usage in
  // WeekWorkspace.tsx) so it can share this component's full row/checkbox/category styling
  // without adopting Smart's cross-recipe aggregation.
  mergeIngredients?: boolean
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
  mergeIngredients = true,
}) => {
  // 1a. Filter mode: default (hide archived/unneeded) vs archived/unneeded views
  const [listFilter, setListFilter] = useState<ListFilterMode>('default')

  // 1b. Apply filter before merge+categorize
  const visibleIngredients = useMemo(() => {
    const valid = Array.isArray(ingredients) ? ingredients : []
    if (listFilter === 'archived') return valid.filter((i) => i.archivedAt)
    if (listFilter === 'unneeded') return valid.filter((i) => i.unneededThisWeek)
    return valid.filter((i) => !i.archivedAt && !i.unneededThisWeek)
  }, [ingredients, listFilter])

  // 1c. Counts for filter pills (from full ingredients list, not filtered)
  const filterCounts = useMemo(() => {
    const valid = Array.isArray(ingredients) ? ingredients : []
    let archived = 0
    let unneeded = 0
    for (const i of valid) {
      if (i.archivedAt) archived += 1
      if (i.unneededThisWeek) unneeded += 1
    }
    return { archived, unneeded }
  }, [ingredients])

  // 1d. Merge (optional) & Categorize visible ingredients
  const categorizedList = useMemo(() => {
    const base = mergeIngredients ? mergeShoppableIngredients(visibleIngredients) : visibleIngredients
    return categorizeShoppableIngredients(base)
  }, [visibleIngredients, mergeIngredients])

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

  // 4b. Category pill filter state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const categoryRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // 4c. Selection mode state
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())

  // 4c-ii. Long-press to enter selection mode
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const longPressTriggered = useRef(false)

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

  // 10. Selection & bulk actions
  const toggleSelection = useCallback((itemName: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(itemName)) {
        next.delete(itemName)
      } else {
        next.add(itemName)
      }
      return next
    })
  }, [])

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false)
    setSelectedKeys(new Set())
  }, [])

  // Long-press handlers
  const handleLongPressStart = useCallback((itemName: string) => {
    longPressTriggered.current = false
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true
      triggerHaptic('medium')
      setSelectionMode(true)
      setSelectedKeys(new Set([itemName]))
    }, LONG_PRESS_MS)
  }, [])

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  // Select all visible items
  const visibleItemNames = useMemo(() => {
    const names: string[] = []
    for (const category of categorizedList) {
      for (const item of category.items) {
        names.push(item.name)
      }
    }
    return names
  }, [categorizedList])

  const allSelected = visibleItemNames.length > 0 && selectedKeys.size === visibleItemNames.length

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedKeys(new Set())
    } else {
      setSelectedKeys(new Set(visibleItemNames))
    }
  }, [allSelected, visibleItemNames])

  const handleBulkShopped = useCallback(() => {
    if (selectedKeys.size === 0) return
    setCheckedItems((prev) => {
      const next = new Set(prev)
      selectedKeys.forEach((name) => next.add(name))
      return next
    })
    exitSelectionMode()
  }, [selectedKeys, exitSelectionMode])

  const bulkPatchItems = useCallback(
    async (updates: Record<string, unknown>) => {
      if (!userId || !weekStartDate || selectedKeys.size === 0) return
      await fetch(`${getBaseUrl()}api/grocery/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekStartDate,
          userId,
          names: Array.from(selectedKeys),
          updates,
        }),
      })
    },
    [userId, weekStartDate, selectedKeys, getBaseUrl],
  )

  const handleBulkArchive = useCallback(async () => {
    await bulkPatchItems({ archivedAt: new Date().toISOString() })
    exitSelectionMode()
    onItemAdded?.()
  }, [bulkPatchItems, exitSelectionMode, onItemAdded])

  const handleBulkUnneeded = useCallback(async () => {
    await bulkPatchItems({ unneededThisWeek: true })
    exitSelectionMode()
    onItemAdded?.()
  }, [bulkPatchItems, exitSelectionMode, onItemAdded])

  const handleBulkDelete = useCallback(async () => {
    if (!userId || !weekStartDate || selectedKeys.size === 0) return
    const count = selectedKeys.size
    if (!(await confirm(`Delete ${count} item${count === 1 ? '' : 's'}?`))) return

    await fetch(`${getBaseUrl()}api/grocery/items`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weekStartDate,
        userId,
        names: Array.from(selectedKeys),
      }),
    })

    exitSelectionMode()
    onItemAdded?.()
  }, [userId, weekStartDate, selectedKeys, getBaseUrl, exitSelectionMode, onItemAdded])

  // 11. Restore archived/unneeded item (from filter views)
  const handleRestoreItem = useCallback(
    async (itemName: string) => {
      if (!userId || !weekStartDate) return
      const updates = listFilter === 'archived' ? { archivedAt: null } : { unneededThisWeek: false }
      await fetch(`${getBaseUrl()}api/grocery/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekStartDate,
          userId,
          itemName,
          updates,
        }),
      })
      onItemAdded?.()
    },
    [userId, weekStartDate, listFilter, getBaseUrl, onItemAdded],
  )

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
            {userId && !selectionMode && listFilter === 'default' && (
              <button
                onClick={() => setSelectionMode(true)}
                className="rounded-full bg-muted p-2 text-muted-foreground hover:text-foreground"
                aria-label="Select items"
                title="Select items"
              >
                <ListChecks className="h-5 w-5" />
              </button>
            )}
            {selectionMode && (
              <button
                onClick={handleSelectAll}
                className={cn(
                  'rounded-full p-2 transition-colors',
                  allSelected
                    ? 'text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
                aria-label={allSelected ? 'Deselect all' : 'Select all'}
                title={allSelected ? 'Deselect all' : 'Select all'}
              >
                <CheckSquare className="h-5 w-5" />
              </button>
            )}
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

        {/* Embedded-mode toolbar: Select + Recurring entry points */}
        {embedded && userId && !isLoading && (
          <div className="-mt-2 flex items-center gap-2">
            {!selectionMode && listFilter === 'default' && (
              <button
                type="button"
                onClick={() => setSelectionMode(true)}
                className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
              >
                <ListChecks className="h-3.5 w-3.5" />
                Select
              </button>
            )}
            {selectionMode && (
              <button
                type="button"
                onClick={handleSelectAll}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-bold transition-colors hover:text-foreground',
                  allSelected ? 'text-primary' : 'text-muted-foreground',
                )}
                aria-label={allSelected ? 'Deselect all' : 'Select all'}
              >
                <CheckSquare className="h-3.5 w-3.5" />
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>
        )}

        {/* Add Item Input - always show when we have weekStartDate and userId */}
        {weekStartDate && userId && !isLoading && !selectionMode && (
          <AddItemInput onAddItem={handleAddItem} isLoading={isLoading} />
        )}

        {/* Category pill bar for quick navigation */}
        {!isLoading &&
          (categorizedList.length > 1 ||
            filterCounts.archived > 0 ||
            filterCounts.unneeded > 0) && (
            <div className="-mx-4 -mt-2 mb-2 border-b border-border bg-background/95 backdrop-blur-sm">
              <div
                className="scrollbar-hide flex gap-2 overflow-x-auto px-4 py-2.5"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <button
                  onClick={() => {
                    setListFilter('default')
                    setSelectedCategory(null)
                  }}
                  className={`shrink-0 rounded-full border-2 px-3 py-1 text-xs font-bold transition-colors ${
                    listFilter === 'default' && selectedCategory === null
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                  }`}
                >
                  All
                </button>
                {filterCounts.archived > 0 && (
                  <button
                    onClick={() => {
                      setListFilter(listFilter === 'archived' ? 'default' : 'archived')
                      setSelectedCategory(null)
                    }}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full border-2 px-3 py-1 text-xs font-bold transition-colors ${
                      listFilter === 'archived'
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    }`}
                  >
                    <span>Archived</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                        listFilter === 'archived'
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {filterCounts.archived}
                    </span>
                  </button>
                )}
                {filterCounts.unneeded > 0 && (
                  <button
                    onClick={() => {
                      setListFilter(listFilter === 'unneeded' ? 'default' : 'unneeded')
                      setSelectedCategory(null)
                    }}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full border-2 px-3 py-1 text-xs font-bold transition-colors ${
                      listFilter === 'unneeded'
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    }`}
                  >
                    <span>Skipped</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                        listFilter === 'unneeded'
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {filterCounts.unneeded}
                    </span>
                  </button>
                )}
                {categorizedList.map((category) => {
                  const isActive = selectedCategory === category.name
                  return (
                    <button
                      key={category.name}
                      onClick={() => {
                        setSelectedCategory(isActive ? null : category.name)
                        // Scroll to category section
                        const el = categoryRefs.current.get(category.name)
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }
                      }}
                      className={`flex shrink-0 items-center gap-1.5 rounded-full border-2 px-3 py-1 text-xs font-bold transition-colors ${
                        isActive
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background text-foreground hover:border-primary/50'
                      }`}
                    >
                      <span>{category.name}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                          isActive
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {category.items.length}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="mt-4 font-bold">Generating shopping list...</p>
          </div>
        ) : (
          <>
            {categorizedList
              .filter((category) => !selectedCategory || category.name === selectedCategory)
              .map((category) => (
                <div
                  key={category.name}
                  ref={(el) => {
                    if (el) categoryRefs.current.set(category.name, el)
                  }}
                  className="duration-500 animate-in fade-in"
                >
                  <h3 className="mb-3 px-2 text-sm font-bold uppercase tracking-wider text-primary">
                    {category.name}
                  </h3>
                  <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                    {category.items.map((item) => {
                      const itemKey = `${item.name}-${item.purchaseUnit}`
                      const isChecked = checkedItems.has(item.name)
                      const isSelected = selectedKeys.has(item.name)
                      const isExpanded = expandedItems.has(itemKey)
                      const sources = item.sources ?? []
                      const multipleSources = sources.length > 1
                      const showingRestore = listFilter !== 'default'

                      return (
                        <div
                          key={itemKey}
                          className={cn(
                            'border-b border-border last:border-0',
                            isChecked && !selectionMode && 'opacity-50',
                            isSelected && 'bg-primary/10',
                          )}
                        >
                          {/* Main Item Row */}
                          <div className="flex flex-col p-4">
                            <div className="flex items-start">
                              {/* Expand/Collapse Toggle (Only if > 1 source, hidden in selection mode) */}
                              {multipleSources && !selectionMode ? (
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

                              {/* Checkbox (toggles shopped by default, selection when in selection mode) */}
                              <button
                                type="button"
                                onClick={() =>
                                  selectionMode ? toggleSelection(item.name) : toggleItem(item.name)
                                }
                                aria-pressed={selectionMode ? isSelected : isChecked}
                                className="mt-1 flex items-center gap-4"
                              >
                                <div
                                  className={cn(
                                    'flex items-center justify-center border-2 transition-colors',
                                    selectionMode ? 'h-5 w-5 rounded-md' : 'h-6 w-6 rounded-full',
                                    selectionMode
                                      ? isSelected
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-muted-foreground/30'
                                      : isChecked
                                        ? 'border-primary bg-primary'
                                        : 'border-border hover:border-primary',
                                  )}
                                >
                                  {selectionMode && isSelected && (
                                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                                      <path
                                        d="M2 6l3 3 5-5"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  )}
                                  {!selectionMode && isChecked && (
                                    <Check className="h-3.5 w-3.5 text-primary-foreground" />
                                  )}
                                </div>
                              </button>

                              {/* Item Details — tappable for edit (or select in selection mode), long-press to enter selection */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (longPressTriggered.current) return
                                  if (selectionMode) {
                                    toggleSelection(item.name)
                                  } else if (weekStartDate && userId) {
                                    setEditingItem(item)
                                  }
                                }}
                                {...(!selectionMode && listFilter === 'default' && userId
                                  ? {
                                      onTouchStart: () => handleLongPressStart(item.name),
                                      onTouchEnd: handleLongPressEnd,
                                      onTouchCancel: handleLongPressEnd,
                                      onMouseDown: () => handleLongPressStart(item.name),
                                      onMouseUp: handleLongPressEnd,
                                      onMouseLeave: handleLongPressEnd,
                                    }
                                  : {})}
                                className={cn(
                                  'ml-3 flex-1 text-left',
                                  isChecked && !selectionMode
                                    ? 'text-muted-foreground line-through'
                                    : 'text-foreground',
                                  (selectionMode || (weekStartDate && userId)) && 'cursor-pointer',
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
                                  {/* Manual Item Badge */}
                                  {item.isManual && (
                                    <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-blue-100 px-1 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                      <Tag className="h-2.5 w-2.5" />
                                      Manual
                                    </span>
                                  )}
                                </div>

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

                              {/* Trailing control: Restore (filter view) / Recurring toggle (default) / hidden (selection mode) */}
                              {userId && !selectionMode && showingRestore && (
                                <button
                                  type="button"
                                  onClick={() => handleRestoreItem(item.name)}
                                  className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                                  aria-label={`Restore ${item.name}`}
                                  title="Restore to list"
                                >
                                  <Undo2 className="h-4 w-4" />
                                </button>
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
                                    <div
                                      key={`${source.recipeId}-${idx}`}
                                      className="mb-2 last:mb-0"
                                    >
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
      {checkedItems.size > 0 && !selectionMode && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
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
          onClose={() => setEditingItem(null)}
        />
      )}

      {/* Bulk-action Selection Bar */}
      {selectionMode && (
        <GroceryListSelectionBar
          selectedCount={selectedKeys.size}
          totalCount={visibleItemNames.length}
          onCancel={exitSelectionMode}
          onMarkShopped={handleBulkShopped}
          onArchive={handleBulkArchive}
          onUnneededThisWeek={handleBulkUnneeded}
          onDelete={handleBulkDelete}
        />
      )}
    </div>
  )
}

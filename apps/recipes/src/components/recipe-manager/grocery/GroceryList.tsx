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
  Plus,
  MapPin,
} from 'lucide-react'
import { Stack, Inline } from '@/components/ui/layout'
import {
  mergeShoppableIngredients,
  categorizeShoppableIngredients,
} from '../../../lib/grocery-logic'
import { confirm } from '../../../lib/dialogStore'
import { getPriceForItem, searchSuggestions } from '../../../lib/grocery-matcher'
import type { GrocerySuggestion } from '../../../lib/grocery-suggestions'
import type { Recipe, ShoppableIngredient } from '../../../lib/types'

interface ManualItem {
  name: string
  category: string
  hebPrice?: number
  hebPriceUnit?: string
}

function getManualItemsKey(weekStart?: string): string {
  return `grocery-manual-items${weekStart ? `_${weekStart}` : ''}`
}

function loadManualItems(weekStart?: string): ManualItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(getManualItemsKey(weekStart))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveManualItems(items: ManualItem[], weekStart?: string) {
  localStorage.setItem(getManualItemsKey(weekStart), JSON.stringify(items))
}

interface GroceryListProps {
  ingredients: ShoppableIngredient[]
  isLoading?: boolean
  onClose: () => void
  recipes?: Recipe[]
  onOpenRecipe?: (recipe: Recipe) => void
  embedded?: boolean
  weekStart?: string
}

export const GroceryList: React.FC<GroceryListProps> = ({
  ingredients,
  isLoading,
  onClose,
  recipes = [],
  onOpenRecipe,
  embedded = false,
  weekStart,
}) => {
  const [manualItems, setManualItems] = useState<ManualItem[]>(() =>
    loadManualItems(weekStart),
  )

  const allIngredients = useMemo(() => {
    const manualAsShoppable: ShoppableIngredient[] = manualItems.map((m) => ({
      name: m.name,
      purchaseAmount: 1,
      purchaseUnit: 'unit',
      category: m.category,
      sources: [],
    }))
    return [...(Array.isArray(ingredients) ? ingredients : []), ...manualAsShoppable]
  }, [ingredients, manualItems])

  const categorizedList = useMemo(() => {
    const merged = mergeShoppableIngredients(allIngredients)
    return categorizeShoppableIngredients(merged)
  }, [allIngredients])

  const priceMap = useMemo(() => {
    const map = new Map<string, { price: number; unit: string }>()
    for (const cat of categorizedList) {
      for (const item of cat.items) {
        const manual = manualItems.find(
          (m) => m.name.toLowerCase() === item.name.toLowerCase(),
        )
        if (manual?.hebPrice && manual.hebPriceUnit) {
          map.set(item.name.toLowerCase(), {
            price: manual.hebPrice,
            unit: manual.hebPriceUnit,
          })
        } else {
          const p = getPriceForItem(item.name)
          if (p) map.set(item.name.toLowerCase(), p)
        }
      }
    }
    return map
  }, [categorizedList, manualItems])

  const estimatedTotal = useMemo(() => {
    let total = 0
    for (const [, p] of priceMap) {
      total += p.price
    }
    return total
  }, [priceMap])

  const [checkedItems, setCheckedItems] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('grocery-checked')
      if (saved) return new Set(JSON.parse(saved))
    }
    return new Set()
  })

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [showAddInput, setShowAddInput] = useState(false)
  const [addQuery, setAddQuery] = useState('')
  const [suggestions, setSuggestions] = useState<GrocerySuggestion[]>([])

  useEffect(() => {
    localStorage.setItem('grocery-checked', JSON.stringify(Array.from(checkedItems)))
  }, [checkedItems])

  useEffect(() => {
    saveManualItems(manualItems, weekStart)
  }, [manualItems, weekStart])

  useEffect(() => {
    if (addQuery.length >= 2) {
      setSuggestions(searchSuggestions(addQuery, 6))
    } else {
      setSuggestions([])
    }
  }, [addQuery])

  const toggleItem = (name: string) => {
    const next = new Set(checkedItems)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    setCheckedItems(next)
  }

  const toggleExpanded = (itemKey: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = new Set(expandedItems)
    if (next.has(itemKey)) next.delete(itemKey)
    else next.add(itemKey)
    setExpandedItems(next)
  }

  const clearChecked = async () => {
    if (await confirm('Remove all checked items?')) {
      setCheckedItems(new Set())
    }
  }

  const addManualItem = useCallback(
    (suggestion: GrocerySuggestion) => {
      if (manualItems.some((m) => m.name.toLowerCase() === suggestion.name.toLowerCase()))
        return
      setManualItems((prev) => [
        ...prev,
        {
          name: suggestion.name,
          category: suggestion.category,
          hebPrice: suggestion.hebPrice,
          hebPriceUnit: suggestion.hebPriceUnit,
        },
      ])
      setAddQuery('')
      setSuggestions([])
      setShowAddInput(false)
    },
    [manualItems],
  )

  const addCustomItem = useCallback(
    (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      if (manualItems.some((m) => m.name.toLowerCase() === trimmed.toLowerCase())) return
      setManualItems((prev) => [
        ...prev,
        { name: trimmed, category: 'Other' },
      ])
      setAddQuery('')
      setSuggestions([])
      setShowAddInput(false)
    },
    [manualItems],
  )

  const removeManualItem = useCallback((name: string) => {
    setManualItems((prev) => prev.filter((m) => m.name !== name))
  }, [])

  const findRecipeById = (id: string): Recipe | undefined => {
    return recipes.find((r) => r.id === id)
  }

  const isManualItem = useCallback(
    (itemName: string) =>
      manualItems.some((m) => m.name.toLowerCase() === itemName.toLowerCase()),
    [manualItems],
  )

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

      <Stack spacing="lg" className="flex-1 overflow-y-auto p-4 pb-20">
        {allIngredients.length === 0 && (
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

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="mt-4 font-bold">Generating shopping list...</p>
          </div>
        ) : (
          <>
            {/* Estimated Total */}
            {estimatedTotal > 0 && categorizedList.length > 0 && embedded && (
              <div className="-mx-4 -mt-4 border-b border-border bg-muted/20 px-4 py-3">
                <Inline justify="between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    H-E-B Estimate
                  </span>
                  <span className="font-display text-lg font-bold text-green-700">
                    ~${estimatedTotal.toFixed(2)}
                  </span>
                </Inline>
              </div>
            )}

            {categorizedList.map((category) => {
              const categoryTotal = category.items.reduce((sum, item) => {
                const p = priceMap.get(item.name.toLowerCase())
                return sum + (p ? p.price * item.purchaseAmount : 0)
              }, 0)

              return (
                <div key={category.name} className="duration-500 animate-in fade-in">
                  <Inline justify="between" className="mb-3 px-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
                        {category.name}
                      </h3>
                      {category.aisleInfo && (
                        <span className="flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          <MapPin className="h-2.5 w-2.5" />
                          {category.aisleInfo}
                        </span>
                      )}
                    </div>
                    {categoryTotal > 0 && (
                      <span className="text-xs font-bold text-muted-foreground">
                        ~${categoryTotal.toFixed(2)}
                      </span>
                    )}
                  </Inline>
                  <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                    {category.items.map((item) => {
                      const itemKey = `${item.name}-${item.purchaseUnit}`
                      const isChecked = checkedItems.has(item.name)
                      const isExpanded = expandedItems.has(itemKey)
                      const multipleSources = item.sources.length > 1
                      const itemPrice = priceMap.get(item.name.toLowerCase())
                      const isManual = isManualItem(item.name)

                      return (
                        <div
                          key={itemKey}
                          className={`border-b border-border last:border-0 ${isChecked ? 'opacity-50' : ''}`}
                        >
                          <div className="flex flex-col p-4">
                            <div className="flex items-start">
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
                                <div className="w-8" />
                              )}

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

                              <div
                                className={`ml-3 flex-1 ${isChecked ? 'text-muted-foreground line-through' : 'text-foreground'}`}
                              >
                                <Inline justify="between">
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
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {itemPrice && (
                                      <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
                                        ${itemPrice.price.toFixed(2)}/{itemPrice.unit}
                                      </span>
                                    )}
                                    {isManual && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          removeManualItem(item.name)
                                        }}
                                        className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                        aria-label={`Remove ${item.name}`}
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </Inline>

                                {item.sources.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {item.sources.map((source, idx) => (
                                      <button
                                        key={`${source.recipeId}-${idx}`}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setActiveInfo({
                                            recipeTitle: source.recipeTitle,
                                            ingredientAmount: source.originalAmount,
                                            ingredientName: item.name,
                                          })
                                        }}
                                        className="flex max-w-[200px] items-center gap-1 overflow-hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted-foreground/20 hover:text-foreground"
                                      >
                                        <span className="truncate">{source.recipeTitle}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {multipleSources && isExpanded && (
                            <div className="border-t border-border bg-muted/30 px-4 py-3 pl-14">
                              <Stack spacing="xs">
                                {item.sources.map((source, idx) => {
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
              )
            })}

            {categorizedList.length === 0 && allIngredients.length > 0 && (
              <div className="py-20 text-center opacity-50">
                <ShoppingBasket className="mx-auto mb-4 h-16 w-16 text-muted-foreground/50" />
                <p>No ingredients found.</p>
              </div>
            )}
          </>
        )}
      </Stack>

      {/* Add Item Input */}
      {showAddInput && (
        <div className="border-t border-border bg-card px-4 pb-4 pt-3 shadow-lg">
          <div className="relative">
            <input
              type="text"
              value={addQuery}
              onChange={(e) => setAddQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && addQuery.trim()) {
                  if (suggestions.length > 0) addManualItem(suggestions[0])
                  else addCustomItem(addQuery)
                }
                if (e.key === 'Escape') {
                  setShowAddInput(false)
                  setAddQuery('')
                  setSuggestions([])
                }
              }}
              placeholder="Add item (e.g. paper towels, dog food...)"
              className="h-11 w-full rounded-lg border border-border bg-secondary/50 px-3 text-sm shadow-sm transition-all focus:border-primary focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
            <button
              onClick={() => {
                setShowAddInput(false)
                setAddQuery('')
                setSuggestions([])
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {suggestions.length > 0 && (
            <div className="mt-2 overflow-hidden rounded-lg border border-border bg-background shadow-md">
              {suggestions.map((s) => (
                <button
                  key={s.name}
                  onClick={() => addManualItem(s)}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent active:scale-[0.98]"
                >
                  <div>
                    <span className="font-medium text-foreground">{s.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{s.category}</span>
                  </div>
                  {s.hebPrice != null && (
                    <span className="text-xs font-medium text-muted-foreground">
                      ${s.hebPrice.toFixed(2)}
                    </span>
                  )}
                </button>
              ))}
              {addQuery.trim() && !suggestions.some(
                (s) => s.name.toLowerCase() === addQuery.trim().toLowerCase(),
              ) && (
                <button
                  onClick={() => addCustomItem(addQuery)}
                  className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add "{addQuery.trim()}" as custom item
                </button>
              )}
            </div>
          )}
          {addQuery.trim() && suggestions.length === 0 && (
            <button
              onClick={() => addCustomItem(addQuery)}
              className="mt-2 flex w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent"
            >
              <Plus className="h-3.5 w-3.5" />
              Add "{addQuery.trim()}" as custom item
            </button>
          )}
        </div>
      )}

      {/* Floating buttons */}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center gap-3 px-4">
        {checkedItems.size > 0 && (
          <button
            onClick={clearChecked}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-foreground px-6 py-3 font-medium text-background shadow-lg transition-transform hover:scale-105"
          >
            <Trash2 className="h-4 w-4" /> Uncheck All
          </button>
        )}
        {!showAddInput && (
          <button
            onClick={() => setShowAddInput(true)}
            className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
            aria-label="Add item"
          >
            <Plus className="h-5 w-5" />
          </button>
        )}
      </div>

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
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Ingredient
                </p>
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
    </div>
  )
}

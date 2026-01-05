import React, { useState, useEffect, useMemo } from 'react'
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
} from 'lucide-react'
import { Stack, Inline } from '@/components/ui/layout'
import { mergeShoppableIngredients, categorizeShoppableIngredients } from '../../lib/grocery-logic'
import type { Recipe, ShoppableIngredient } from '../../lib/types'

interface GroceryListProps {
  ingredients: ShoppableIngredient[]
  isLoading?: boolean
  onClose: () => void
  recipes?: Recipe[]
  onOpenRecipe?: (recipe: Recipe) => void
  embedded?: boolean // Hide header when embedded in workspace
}

export const GroceryList: React.FC<GroceryListProps> = ({
  ingredients,
  isLoading,
  onClose,
  recipes = [],
  onOpenRecipe,
  embedded = false,
}) => {
  // 1. Merge & Categorize (Memoized)
  const categorizedList = useMemo(() => {
    const merged = mergeShoppableIngredients(ingredients)
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

  const clearChecked = () => {
    if (confirm('Remove all checked items?')) {
      setCheckedItems(new Set())
    }
  }

  // 4. Sharing

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
      className={`flex h-full flex-col bg-card ${embedded ? '' : 'duration-300 animate-in slide-in-from-right-4'}`}
    >
      {/* Header - hidden when embedded */}
      {!embedded && (
        <Inline justify="between" className="px-4 pt-4">
          <h2 className="font-display text-2xl font-bold">Grocery List</h2>
          <Inline spacing="sm">
            <button
              onClick={() => console.log('Filters')}
              className="bg-card-variant rounded-full p-2 text-muted-foreground hover:text-foreground"
            >
              <ListFilter className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="bg-card-variant rounded-full p-2 text-muted-foreground hover:text-foreground"
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
            <div className="bg-card-variant mb-4 rounded-full p-6">
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
          <div className="bg-card-container -mx-4 -mt-4 mb-6 border-b border-border px-6 py-4">
            <p className="text-foreground-variant text-base font-bold">
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
            {categorizedList.map((category) => (
              <div key={category.name} className="duration-500 animate-in fade-in">
                <h3 className="mb-3 px-2 text-sm font-bold uppercase tracking-wider text-primary">
                  {category.name}
                </h3>
                <div className="bg-card-container-low border-border-variant overflow-hidden rounded-xl border shadow-sm">
                  {category.items.map((item) => {
                    const itemKey = `${item.name}-${item.purchaseUnit}`
                    const isChecked = checkedItems.has(item.name)
                    const isExpanded = expandedItems.has(itemKey)
                    const multipleSources = item.sources.length > 1

                    return (
                      <div
                        key={itemKey}
                        className={`border-border-variant border-b last:border-0 ${isChecked ? 'bg-card-container-high opacity-50' : ''}`}
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

                            {/* Item Details */}
                            <div
                              className={`ml-3 flex-1 ${isChecked ? 'text-foreground-variant line-through' : 'text-foreground'}`}
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
                              </div>

                              {/* Source Tags */}
                              <div className="mt-2 flex flex-wrap gap-2">
                                {item.sources.map((source, idx) => {
                                  // Truncate logic can be CSS based (max-w)
                                  return (
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
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Source Details (Only if > 1 source) */}
                        {multipleSources && isExpanded && (
                          <div className="border-border-variant border-t bg-muted/30 px-4 py-3 pl-14">
                            <Stack spacing="xs">
                              {item.sources.map((source, idx) => {
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
                <ShoppingBasket className="mx-auto mb-4 h-16 w-16 text-gray-300" />
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
    </div>
  )
}

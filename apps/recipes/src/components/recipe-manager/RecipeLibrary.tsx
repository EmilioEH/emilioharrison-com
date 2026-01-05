import React, { useState, useLayoutEffect, useRef, useEffect } from 'react'
import { motion, type Variants } from 'framer-motion'
import { ChefHat, MoreVertical, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AccordionGroup } from '@/components/ui/AccordionGroup'
import type { Recipe } from '../../lib/types'
import { useRecipeGrouping } from './hooks/useRecipeGrouping'
import { useStore } from '@nanostores/react'
import {
  allPlannedRecipes,
  getPlannedDatesForRecipe,
  removeRecipeFromDay,
} from '../../lib/weekStore'
import { RecipeManagementSheet } from './week-planner/RecipeManagementSheet'

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      bounce: 0,
      duration: 0.4,
    },
  },
}

// Global scroll cache
const scrollCache: Record<string, string | number> = {}

interface RecipeLibraryProps {
  recipes: Recipe[]
  onSelectRecipe: (recipe: Recipe) => void
  onToggleThisWeek: (id: string) => void
  sort: string
  isSelectionMode: boolean
  selectedIds: Set<string>
  onClearSearch?: () => void
  // onSearchChange removed
  searchQuery?: string
  hasSearch?: boolean
  scrollContainer?: HTMLElement | null
  // New Header Tools Props removed (onOpenFilters, activeFilterCount, onSearchExpandedChange, hideSearch)
  // Week management props
  allowManagement?: boolean // show management menu for week context
  currentWeekStart?: string // current week context for management
}

declare global {
  interface Window {
    recipeScrollContainer?: HTMLElement
  }
}

export const RecipeLibrary: React.FC<RecipeLibraryProps> = ({
  recipes,
  onSelectRecipe,
  onToggleThisWeek,
  sort,
  isSelectionMode,
  selectedIds,
  hasSearch,
  scrollContainer,
  allowManagement = false,
  currentWeekStart: _currentWeekStart,
}) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  // Management UI state
  const [managementRecipeId, setManagementRecipeId] = useState<string | null>(null)
  // Subscribe to all planned recipes to trigger re-renders when plans change
  useStore(allPlannedRecipes)

  const containerRef = useRef<HTMLDivElement>(null)
  const isProgrammaticScroll = useRef(false)

  // Scrollspy & Tabs
  const [activeGroup, setActiveGroup] = useState<string>(() => {
    return (scrollCache['library_activeGroup'] as string) || ''
  })
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const navRef = useRef<HTMLDivElement>(null)

  // Use custom hook for complex grouping logic
  const { groupedRecipes, getGroupTitle } = useRecipeGrouping(recipes, sort)

  // Initialize active group if none exists
  useEffect(() => {
    if (groupedRecipes.sortedKeys.length > 0 && !activeGroup) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveGroup(groupedRecipes.sortedKeys[0])
    }
  }, [groupedRecipes.sortedKeys, activeGroup])

  // 1. One-time Scroll Restoration
  useLayoutEffect(() => {
    const cachedScroll = Number(scrollCache['library']) || 0
    const container = scrollContainer || window.recipeScrollContainer

    if (container && cachedScroll > 0) {
      container.scrollTo({ top: cachedScroll, behavior: 'instant' })

      // Restore active pill scroll position
      const currentGroup = scrollCache['library_activeGroup']
      if (currentGroup && navRef.current) {
        const activeBtn = navRef.current.querySelector(
          `[data-group="${currentGroup}"]`,
        ) as HTMLElement
        if (activeBtn) {
          const left =
            activeBtn.offsetLeft - navRef.current.clientWidth / 2 + activeBtn.clientWidth / 2
          navRef.current.scrollTo({ left, behavior: 'instant' })
        }
      }
    }
  }, [scrollContainer]) // Only run on mount or when container becomes available

  // 2. Continuous Scroll Listener
  useEffect(() => {
    const container = scrollContainer || window.recipeScrollContainer
    if (!container) return

    const handleScroll = () => {
      // Cache Scroll
      const currentScroll = container.scrollTop
      scrollCache['library'] = currentScroll

      // Scrollspy Logic
      if (isSelectionMode || isProgrammaticScroll.current) return

      const scrollPosition = currentScroll + 180 // Offset

      // Find the group currently in view
      let currentGroup = activeGroup

      for (const key of groupedRecipes.sortedKeys) {
        const el = groupRefs.current[key]
        if (el) {
          const { offsetTop, offsetHeight } = el
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            currentGroup = key
            break
          }
        }
      }

      if (currentGroup !== activeGroup) {
        setActiveGroup(currentGroup)
        scrollCache['library_activeGroup'] = currentGroup

        // Scroll pill into view
        const navEl = navRef.current
        if (navEl) {
          const activeBtn = navEl.querySelector(`[data-group="${currentGroup}"]`) as HTMLElement
          if (activeBtn) {
            const left = activeBtn.offsetLeft - navEl.clientWidth / 2 + activeBtn.clientWidth / 2
            navEl.scrollTo({ left, behavior: 'smooth' })
          }
        }
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [activeGroup, groupedRecipes, isSelectionMode, scrollContainer])

  const stickyHeaderRef = useRef<HTMLDivElement>(null)
  const [headerHeight, setHeaderHeight] = useState(0)

  useLayoutEffect(() => {
    if (stickyHeaderRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setHeaderHeight(entry.borderBoxSize[0].blockSize)
        }
      })
      resizeObserver.observe(stickyHeaderRef.current)
      return () => resizeObserver.disconnect()
    }
  }, [])

  const toggleGroup = (groupName: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }))
  }

  const scrollToGroup = (key: string) => {
    setActiveGroup(key)
    const el = groupRefs.current[key]
    const container = scrollContainer || window.recipeScrollContainer
    if (el && container) {
      isProgrammaticScroll.current = true
      // Scroll to element, accounting for dynamic header height
      const top = Math.max(0, el.offsetTop - headerHeight - 10) // 10px buffer
      container.scrollTo({ top, behavior: 'smooth' })

      // Release lock after animation + margin
      setTimeout(() => {
        isProgrammaticScroll.current = false
      }, 1000)
    }
  }

  if (recipes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
        <ChefHat className="mb-4 h-16 w-16 opacity-50" />
        <p className="mb-4 font-bold">No recipes found.</p>
        <p className="mb-6 max-w-xs text-sm">
          {hasSearch
            ? 'Try adjusting your search terms or filters.'
            : 'Get started by adding your first recipe!'}
        </p>
      </div>
    )
  }

  const renderRecipeCard = (recipe: Recipe) => {
    // Calculate planned dates once for performance
    const plannedDates = getPlannedDatesForRecipe(recipe.id)
    const isPlanned = plannedDates.length > 0

    return (
      <motion.div
        variants={itemVariants}
        key={recipe.id}
        role="button"
        tabIndex={0}
        data-testid={`recipe-card-${recipe.id}`}
        className={`group relative flex w-full cursor-pointer gap-3 rounded-xl border border-transparent p-2.5 text-left transition-all hover:bg-accent/50 ${
          isSelectionMode && selectedIds?.has(recipe.id)
            ? 'border-primary/20 bg-accent'
            : 'hover:border-border hover:shadow-sm'
        }`}
        onClick={() => {
          if (isSelectionMode) {
            onSelectRecipe(recipe)
          } else {
            onSelectRecipe(recipe)
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (isSelectionMode) {
              onSelectRecipe(recipe)
            } else {
              onSelectRecipe(recipe)
            }
          }
        }}
      >
        {/* Square Thumbnail */}
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted shadow-sm">
          {recipe.finishedImage || recipe.sourceImage ? (
            <img
              src={recipe.finishedImage || recipe.sourceImage}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              alt=""
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ChefHat className="h-8 w-8 text-muted-foreground/50" />
            </div>
          )}
        </div>

        {/* Content Column */}
        <div className="flex flex-1 flex-col justify-center">
          <div className="flex items-start justify-between gap-2">
            <h4 className="line-clamp-2 flex-1 font-display text-lg font-bold leading-tight text-foreground">
              {recipe.title}
            </h4>
            {(recipe.rating ?? 0) > 0 && (
              <div className="flex shrink-0 items-center gap-1 rounded-full bg-secondary/50 px-1.5 py-0.5 text-[10px] font-bold text-foreground">
                <Star className="h-3 w-3 fill-foreground" />{' '}
                <span data-testid="recipe-rating">{recipe.rating}</span>
              </div>
            )}
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-muted-foreground">
            <span>{recipe.cookTime + recipe.prepTime} min</span>
            <span>•</span>
            <span>{recipe.servings} servings</span>
            {recipe.difficulty && (
              <>
                <span>•</span>
                <Badge
                  variant="tag"
                  size="sm"
                  className={`uppercase ${
                    recipe.difficulty === 'Easy'
                      ? 'bg-green-500/10 text-green-600'
                      : recipe.difficulty === 'Medium'
                        ? 'bg-yellow-500/10 text-yellow-600'
                        : 'bg-red-500/10 text-red-600'
                  }`}
                >
                  {recipe.difficulty}
                </Badge>
              </>
            )}
          </div>

          <div className="mt-0.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs font-medium text-muted-foreground">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {recipe.protein ? (
                <>
                  <span>{recipe.protein}</span>
                  {recipe.cuisine && (
                    <>
                      <span>•</span>
                      <span>{recipe.cuisine}</span>
                    </>
                  )}
                </>
              ) : recipe.cuisine ? (
                <span>{recipe.cuisine}</span>
              ) : (
                <span>{recipe.mealType}</span>
              )}
            </div>

            {/* Status Badges - Inline on right */}
            <div className="flex items-center gap-1.5">
              {/* Day Tags from all weeks */}
              {(() => {
                const plannedDates = getPlannedDatesForRecipe(recipe.id)
                const maxVisible = 3
                const visibleTags = plannedDates.slice(0, maxVisible)
                const overflowCount = plannedDates.length - maxVisible

                return (
                  <>
                    {visibleTags.map((p) => (
                      <Badge
                        key={`${p.weekStart}-${p.day}`}
                        variant="tag"
                        size="sm"
                        className="border-primary/20 bg-primary/10 font-bold uppercase tracking-tighter text-primary"
                      >
                        {p.label}
                      </Badge>
                    ))}
                    {overflowCount > 0 && (
                      <Badge
                        variant="tag"
                        size="sm"
                        className="border-muted-foreground/20 bg-muted font-bold text-muted-foreground"
                      >
                        +{overflowCount}
                      </Badge>
                    )}
                  </>
                )
              })()}

              {/* Add to Week button - hidden in week management context */}
              {!allowManagement && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleThisWeek(recipe.id)
                  }}
                  className="focus:outline-none"
                  aria-label="Add to Week"
                >
                  <Badge
                    variant="inactive"
                    size="md"
                    className="cursor-pointer uppercase tracking-wider hover:bg-muted"
                  >
                    Add to Week
                  </Badge>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Management Menu Button - Right side of card */}
        {allowManagement && !isSelectionMode && isPlanned && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              setManagementRecipeId(recipe.id)
            }}
            className="h-8 w-8 shrink-0 self-center rounded-full hover:bg-accent"
            title="Manage recipe"
            aria-label="Manage recipe"
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        )}
      </motion.div>
    )
  }

  return (
    <div ref={containerRef} className="pb-24 animate-in fade-in">
      {/* Category Nav - Scrollable (Sticky) */}
      {!isSelectionMode && !hasSearch && (
        <div
          ref={stickyHeaderRef}
          className="sticky top-0 z-40 bg-background/95 pb-2 pt-2 shadow-sm backdrop-blur transition-all"
        >
          <div
            ref={navRef}
            className="scrollbar-hide flex w-full items-center gap-2 overflow-x-auto px-4 pb-1"
          >
            {groupedRecipes.sortedKeys.map((key) => (
              <button
                key={key}
                data-group={key}
                onClick={() => scrollToGroup(key)}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                  activeGroup === key
                    ? 'bg-foreground text-background shadow-md'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                } `}
              >
                {getGroupTitle(key)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {/* Main Content Area */}
      {isSelectionMode ? (
        // COMPACT SELECTION VIEW
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-wrap gap-4 p-4 pt-4"
        >
          {recipes.map((recipe) => {
            const isSelected = selectedIds?.has(recipe.id)
            const dateStr = new Date(
              recipe.updatedAt || recipe.createdAt || new Date().toISOString(),
            ).toLocaleDateString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: 'numeric',
            })

            return (
              <motion.div
                variants={itemVariants}
                key={recipe.id}
                role="button"
                onClick={() => onSelectRecipe(recipe)}
                className={`flex w-full items-center gap-4 rounded-lg border p-3 transition-colors md:w-[calc(50%-8px)] lg:w-[calc(33.33%-11px)] ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card hover:bg-accent/50'
                }`}
              >
                {/* Checkbox */}
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/30'
                  }`}
                >
                  {isSelected && (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-base font-medium text-foreground">
                    {recipe.title}
                  </span>
                  <span className="text-xs text-muted-foreground">{dateStr}</span>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      ) : hasSearch ? (
        // FLAT LIST VIEW (For Search)
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-2 p-4 pt-0"
        >
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            Found {recipes.length} recipes
          </p>
          {recipes.map(renderRecipeCard)}
        </motion.div>
      ) : (
        // ACCORDION GROUP VIEW (Default)
        groupedRecipes.sortedKeys.map((key) => (
          <div
            key={key}
            ref={(el) => {
              groupRefs.current[key] = el
            }}
          >
            <AccordionGroup
              title={getGroupTitle(key)}
              count={groupedRecipes.groups[key].length}
              isOpen={openGroups[key] !== false}
              onToggle={() => toggleGroup(key)}
              viewMode="list"
              stickyHeader
              stickyTop={headerHeight}
            >
              <div className="flex flex-col gap-1">
                {groupedRecipes.groups[key].map(renderRecipeCard)}
              </div>
            </AccordionGroup>
          </div>
        ))
      )}

      {/* Recipe Management Sheet */}
      {allowManagement &&
        managementRecipeId &&
        (() => {
          const selectedRecipe = recipes.find((r) => r.id === managementRecipeId)
          if (!selectedRecipe) return null

          const plannedDates = getPlannedDatesForRecipe(managementRecipeId)

          return (
            <RecipeManagementSheet
              isOpen={true}
              onClose={() => setManagementRecipeId(null)}
              recipeId={managementRecipeId}
              recipeTitle={selectedRecipe.title}
              currentPlannedDays={plannedDates}
              onRemove={(date) => {
                removeRecipeFromDay(managementRecipeId, date)
              }}
            />
          )
        })()}
    </div>
  )
}

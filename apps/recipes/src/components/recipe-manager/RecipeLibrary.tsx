import React, { useState, useLayoutEffect, useEffect } from 'react'
import { motion, type Variants } from 'framer-motion'
import { ChefHat } from 'lucide-react'
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
import { RecipeCard } from './RecipeCard'

// Animation Variants - only stagger first few items for perceived performance
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'tween',
      duration: 0.2,
    },
  },
}

// Global scroll cache
const scrollCache: Record<string, string | number> = {}

interface RecipeLibraryProps {
  recipes: (Recipe & { matches?: { indices: [number, number][]; key?: string }[] })[]
  onSelectRecipe: (recipe: Recipe) => void
  onToggleThisWeek: (id: string) => void
  sort: string
  isSelectionMode: boolean
  selectedIds: Set<string>
  onClearSearch?: () => void
  searchQuery?: string
  hasSearch?: boolean
  scrollContainer?: HTMLElement | Window | null
  // Week management props
  allowManagement?: boolean // show management menu for week context
  currentWeekStart?: string // current week context for management
  onShare?: (recipe: Recipe) => void
  isContainedScroll?: boolean // When true, use contained scroll sticky positioning
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
  onShare,
  isContainedScroll = false,
}) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  // Management UI state
  const [managementRecipeId, setManagementRecipeId] = useState<string | null>(null)
  // Subscribe to all planned recipes to trigger re-renders when plans change
  useStore(allPlannedRecipes)

  // Use custom hook for complex grouping logic
  const { groupedRecipes, getGroupTitle } = useRecipeGrouping(recipes, sort)

  // 1. One-time Scroll Restoration
  useLayoutEffect(() => {
    const cachedScroll = Number(scrollCache['library']) || 0
    const container = scrollContainer || window.recipeScrollContainer

    if (container && cachedScroll > 0) {
      container.scrollTo({ top: cachedScroll, behavior: 'instant' })
    }
  }, [scrollContainer]) // Only run on mount or when container becomes available

  // 2. Continuous Scroll Listener
  useEffect(() => {
    const container = scrollContainer || window.recipeScrollContainer
    if (!container) return

    const handleScroll = () => {
      // Cache Scroll
      const currentScroll = container instanceof Window ? window.scrollY : container.scrollTop
      scrollCache['library'] = currentScroll
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [scrollContainer])

  const toggleGroup = (groupName: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }))
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

  return (
    <div className="pb-24 animate-in fade-in">
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
      ) : (
        // ACCORDION GROUP VIEW (Default and Search)
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col"
        >
          {/* Search Results Counter */}
          {hasSearch && (
            <p className="px-6 py-3 text-sm font-medium text-muted-foreground">
              Found {recipes.length} recipes
            </p>
          )}
          {groupedRecipes.sortedKeys.map((key) => (
            <div key={key}>
              <AccordionGroup
                title={getGroupTitle(key)}
                count={groupedRecipes.groups[key].length}
                isOpen={openGroups[key] !== false}
                onToggle={() => toggleGroup(key)}
                viewMode="list"
                stickyHeader
                stickyTop={isContainedScroll ? 'top-[56px]' : 'top-content-top'}
              >
                <div className="flex flex-col gap-1">
                  {groupedRecipes.groups[key].map((recipe) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      isSelectionMode={isSelectionMode}
                      isSelected={selectedIds.has(recipe.id)}
                      onSelect={onSelectRecipe}
                      onToggleThisWeek={onToggleThisWeek}
                      allowManagement={allowManagement}
                      onManage={(id) => setManagementRecipeId(id)}
                    />
                  ))}
                </div>
              </AccordionGroup>
            </div>
          ))}
        </motion.div>
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
              onRemove={async () => {
                await removeRecipeFromDay(managementRecipeId)
                // Close the sheet after removal so the UI reflects the change
                setManagementRecipeId(null)
              }}
              onShare={onShare ? () => onShare(selectedRecipe) : undefined}
            />
          )
        })()}
    </div>
  )
}

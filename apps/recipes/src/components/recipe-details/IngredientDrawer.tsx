import React, { useState } from 'react'
import { X } from 'lucide-react'
import { IngredientRow } from './IngredientRow'
import type { Ingredient } from '../../lib/types'
import { Button } from '../ui/button'

interface IngredientDrawerProps {
  ingredients: Ingredient[]
  ingredientGroups?: Array<{
    header: string | null
    items: Ingredient[]
  }>
  className?: string
}

export const IngredientDrawer: React.FC<IngredientDrawerProps> = ({
  ingredients,
  ingredientGroups,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false)

  // Use grouped ingredients if available, otherwise flat list
  const displayGroups = ingredientGroups || [{ header: null, items: ingredients }]

  // Prevent background scroll when open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <>
      {/* Subtle Ingredient Trigger - Small pill positioned above bottom nav */}
      <div
        className={`fixed bottom-28 right-4 z-[45] transition-all duration-300 ${isOpen ? 'pointer-events-none translate-y-4 opacity-0' : 'translate-y-0 opacity-100'} ${className || ''}`}
      >
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1.5 rounded-full border border-border/30 bg-background/80 px-3 py-1.5 text-sm text-muted-foreground shadow-sm backdrop-blur-sm transition-all hover:border-border hover:text-foreground active:scale-95"
        >
          <span className="font-medium">Ingredients ({ingredients.length})</span>
        </button>
      </div>

      {/* Expanded Sheet Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm duration-200 animate-in fade-in"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Sheet */}
          <div className="relative z-10 flex max-h-[75vh] w-full flex-col rounded-t-[32px] bg-background shadow-2xl duration-300 animate-in slide-in-from-bottom">
            {/* Handle / Header */}
            <div className="flex-none items-center justify-between border-b border-border/5 p-6 pb-4">
              <div
                aria-hidden="true"
                className="absolute left-1/2 top-3 h-1.5 w-12 -translate-x-1/2 rounded-full bg-muted"
              />

              <div className="mt-2 flex items-center justify-between">
                <h2 className="font-display text-2xl font-bold">Ingredients</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="-mr-2 rounded-full"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="pb-safe-bottom flex-1 overflow-y-auto p-6 pt-2">
              <div className="space-y-6">
                {displayGroups.map((group, gIdx) => (
                  <div key={gIdx}>
                    {group.header && (
                      <h3 className="sticky top-0 z-10 mb-3 bg-background/95 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/70 backdrop-blur">
                        {group.header}
                      </h3>
                    )}
                    <div className="space-y-1">
                      {group.items.map((ing, idx) => (
                        <IngredientRow key={idx} ingredient={ing} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom padding spacer */}
              <div className="h-8" />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

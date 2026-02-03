import React, { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface CategoryPill {
  key: string
  label: string
  count: number
}

interface CategoryPillBarProps {
  categories: CategoryPill[]
  selectedCategories: Set<string>
  onSelectionChange: (selected: Set<string>) => void
  stickyTop?: string
  isContainedScroll?: boolean
}

export const CategoryPillBar: React.FC<CategoryPillBarProps> = ({
  categories,
  selectedCategories,
  onSelectionChange,
  stickyTop = 'top-content-top',
  isContainedScroll = false,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftFade, setShowLeftFade] = useState(false)
  const [showRightFade, setShowRightFade] = useState(false)

  // Check scroll position to show/hide fade indicators
  const updateFadeIndicators = () => {
    const el = scrollRef.current
    if (!el) return

    const isAtStart = el.scrollLeft <= 1
    const isAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1

    setShowLeftFade(!isAtStart)
    setShowRightFade(!isAtEnd)
  }

  useEffect(() => {
    updateFadeIndicators()
    const el = scrollRef.current
    if (!el) return

    el.addEventListener('scroll', updateFadeIndicators)
    window.addEventListener('resize', updateFadeIndicators)

    return () => {
      el.removeEventListener('scroll', updateFadeIndicators)
      window.removeEventListener('resize', updateFadeIndicators)
    }
  }, [categories])

  const toggleCategory = (key: string) => {
    const newSelection = new Set(selectedCategories)
    if (newSelection.has(key)) {
      newSelection.delete(key)
    } else {
      newSelection.add(key)
    }
    onSelectionChange(newSelection)
  }

  const clearSelection = () => {
    onSelectionChange(new Set())
  }

  const isAllSelected = selectedCategories.size === 0

  return (
    <div
      className={`sticky ${stickyTop} z-20 ${
        isContainedScroll ? 'top-[calc(56px+var(--safe-area-top))]' : ''
      } border-b border-border bg-background/95 backdrop-blur-sm`}
    >
      <div className="relative">
        {/* Left Fade */}
        {showLeftFade && (
          <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-8 bg-gradient-to-r from-background/95 to-transparent" />
        )}

        {/* Right Fade */}
        {showRightFade && (
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-8 bg-gradient-to-l from-background/95 to-transparent" />
        )}

        {/* Scrollable Pill Container */}
        <div
          ref={scrollRef}
          className="scrollbar-hide flex gap-2 overflow-x-auto px-4 py-3"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* "All" Pill */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={clearSelection}
            className={`shrink-0 rounded-full border-2 px-4 py-1.5 text-sm font-bold transition-colors ${
              isAllSelected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
            }`}
          >
            All
          </motion.button>

          {/* Category Pills */}
          {categories.map(({ key, label, count }) => {
            const isSelected = selectedCategories.has(key)
            return (
              <motion.button
                key={key}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleCategory(key)}
                className={`flex shrink-0 items-center gap-2 rounded-full border-2 px-4 py-1.5 text-sm font-bold transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:border-primary/50'
                }`}
              >
                <span>{label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${
                    isSelected
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  {count}
                </span>
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

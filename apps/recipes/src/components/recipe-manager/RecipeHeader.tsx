import React, { useState, useEffect, useRef } from 'react'
import { Menu, Plus, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { openBurgerMenu } from '../../lib/burgerMenuStore'
import { useStore } from '@nanostores/react'
import { $pendingInvites } from '../../lib/familyStore'

interface RecipeHeaderProps {
  user?: string
  scrollContainer?: HTMLElement | Window | null
  onAddRecipe?: () => void
  onViewWeek?: () => void
  isWeekView?: boolean
}

export const RecipeHeader: React.FC<RecipeHeaderProps> = ({
  user,
  scrollContainer,
  onAddRecipe,
  onViewWeek,
  isWeekView,
}) => {
  const [isVisible, setIsVisible] = useState(true)
  const [isScrolled, setIsScrolled] = useState(false)
  const lastScrollTop = useRef(0)
  const pendingInvites = useStore($pendingInvites)

  useEffect(() => {
    // If no container provided, default to window if available
    const target = scrollContainer || (typeof window !== 'undefined' ? window : null)
    if (!target) return

    const handleScroll = () => {
      const currentScroll = target instanceof Window ? window.scrollY : target.scrollTop

      // Welcome Bar Logic (Collapse if > 20px)
      setIsScrolled(currentScroll > 20)

      // Main Header Visibility Logic (Hide on scroll down, Show on scroll up)
      if (currentScroll > lastScrollTop.current && currentScroll > 50) {
        setIsVisible(false)
      } else if (currentScroll < lastScrollTop.current) {
        setIsVisible(true)
      }

      lastScrollTop.current = currentScroll
    }

    target.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => target.removeEventListener('scroll', handleScroll)
  }, [scrollContainer])

  return (
    <header
      className={`sticky top-0 z-40 flex flex-col justify-end border-b border-border bg-background/95 shadow-md backdrop-blur-md transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      {/* Static Welcome Bar */}
      {user && (
        <div
          className={`w-full overflow-hidden bg-foreground text-background transition-all duration-300 ease-in-out ${
            isScrolled ? 'h-0 opacity-0' : 'h-10 opacity-100'
          }`}
        >
          <div className="mx-auto flex h-full max-w-2xl items-center justify-between px-4 text-[10px] font-black uppercase tracking-widest sm:text-xs">
            <span>Welcome, {user}</span>
            <button
              onClick={openBurgerMenu}
              className="relative flex h-9 w-9 items-center justify-center rounded-md text-background hover:bg-background/20"
              title="Menu"
              aria-label="Menu"
            >
              <Menu className="h-6 w-6" />
              {/* Notification Badge */}
              {pendingInvites.length > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive ring-1 ring-white" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Main App Bar - Tightened & Integrated Menu */}
      <div
        className={`flex h-14 flex-none items-center justify-center overflow-hidden opacity-100 transition-all duration-300 ease-in-out`}
      >
        <div className="flex h-full w-full max-w-2xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <a
              href="/protected/recipes"
              className="mb-0 font-display text-xl font-bold leading-none tracking-tight text-foreground transition-opacity hover:opacity-70"
              aria-label="Home"
              title="Go to home"
            >
              CHEFBOARD
            </a>
          </div>

          {/* Hide buttons in week view - they're in the WeekSelectorHeader */}
          {!isWeekView && (
            <div className="flex items-center gap-2">
              {onViewWeek && (
                <Button
                  variant="ghost"
                  onClick={onViewWeek}
                  className="flex h-11 items-center gap-1.5 rounded-full px-3 text-foreground hover:bg-muted"
                  title="View Week"
                  aria-label="View Week"
                >
                  <CalendarDays className="h-5 w-5" />
                  <span className="hidden text-sm font-bold sm:inline-block">View Week</span>
                </Button>
              )}

              {onAddRecipe && (
                <Button
                  variant="ghost"
                  onClick={onAddRecipe}
                  className="flex h-11 items-center gap-1.5 rounded-full px-3 text-foreground hover:bg-muted"
                  title="Add Recipe"
                  aria-label="Add Recipe"
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-sm font-bold">Add</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

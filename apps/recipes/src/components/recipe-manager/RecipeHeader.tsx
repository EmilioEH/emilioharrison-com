import React, { useState, useEffect } from 'react'
import { Menu, Plus, CalendarDays, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { openBurgerMenu } from '../../lib/burgerMenuStore'
import { useStore } from '@nanostores/react'
import { $pendingInvites } from '../../lib/familyStore'

interface RecipeHeaderProps {
  user?: string
  scrollContainer?: HTMLElement | Window | null
  onAddRecipe?: () => void
  onViewWeek?: () => void
  onViewGrocery?: () => void
  isWeekView?: boolean
}

export const RecipeHeader: React.FC<RecipeHeaderProps> = ({
  user,
  scrollContainer: _scrollContainer,
  onAddRecipe,
  onViewWeek,
  onViewGrocery,
  isWeekView,
}) => {
  const [isScrolled, setIsScrolled] = useState(false)
  const pendingInvites = useStore($pendingInvites)

  // Welcome Bar collapse logic only - header always stays visible
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      // Welcome Bar Logic (Collapse if > 20px)
      setIsScrolled(currentScrollY > 20)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className="fixed left-0 right-0 top-0 z-40 flex flex-col justify-end border-b border-border bg-background/95 shadow-md backdrop-blur-md">
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
              {onViewGrocery && (
                <Button
                  variant="ghost"
                  onClick={onViewGrocery}
                  className="flex h-11 items-center gap-1.5 rounded-full px-3 text-foreground hover:bg-muted"
                  title="Grocery List"
                  aria-label="Grocery List"
                >
                  <ShoppingCart className="h-5 w-5" />
                  <span className="hidden text-sm font-bold sm:inline-block">Grocery</span>
                </Button>
              )}

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

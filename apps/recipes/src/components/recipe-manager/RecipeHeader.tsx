import React, { useState, useEffect, useRef } from 'react'
import { Menu, Plus, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { openBurgerMenu } from '../../lib/burgerMenuStore'

interface RecipeHeaderProps {
  user?: string
  scrollContainer?: HTMLElement | null
  onAddRecipe?: () => void
  isPlanMode?: boolean
  onTogglePlanMode?: () => void
}

export const RecipeHeader: React.FC<RecipeHeaderProps> = ({
  user,
  scrollContainer,
  onAddRecipe,
  isPlanMode,
  onTogglePlanMode,
}) => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isScrollingUp, setIsScrollingUp] = useState(false)
  const lastScrollTop = useRef(0)

  useEffect(() => {
    if (!scrollContainer) return
    const handleScroll = () => {
      const currentScroll = scrollContainer.scrollTop
      setIsScrolled(currentScroll > 20)

      // Reveal on scroll up
      if (currentScroll < lastScrollTop.current && currentScroll > 50) {
        setIsScrollingUp(true)
      } else if (currentScroll > lastScrollTop.current || currentScroll <= 20) {
        setIsScrollingUp(false)
      }

      lastScrollTop.current = currentScroll
    }
    scrollContainer.addEventListener('scroll', handleScroll)
    // Initial check
    handleScroll()

    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [scrollContainer])

  return (
    <header
      className={`sticky top-0 z-50 flex flex-col justify-end border-b border-border shadow-md backdrop-blur-md transition-all duration-300 ease-in-out ${
        isScrolled ? 'bg-background/95 shadow-md' : 'bg-background/80'
      }`}
    >
      {/* Static Welcome Bar - Tightened */}
      {user && (
        <div
          className={`w-full overflow-hidden bg-foreground text-background transition-all duration-300 ease-in-out ${
            isScrolled && !isScrollingUp ? 'h-0 opacity-0' : 'h-7 opacity-100'
          }`}
        >
          <div className="flex h-full items-center justify-between px-4 text-[10px] font-black uppercase tracking-widest sm:text-xs">
            <span>Welcome, {user}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={openBurgerMenu}
              className="h-5 w-5 rounded-full text-background hover:bg-background/20 hover:text-white"
              title="Menu"
              aria-label="Menu"
            >
              <Menu className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Main App Bar - Tightened & Integrated Menu */}
      <div
        className={`flex flex-none items-center justify-between overflow-hidden px-4 transition-all duration-300 ease-in-out ${
          isScrolled && !isScrollingUp ? 'h-0 opacity-0' : 'h-14 opacity-100'
        }`}
      >
        <div className="flex items-center gap-3">
          <h1 className="mb-0 font-display text-xl font-bold leading-none tracking-tight text-foreground">
            CHEFBOARD
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {onTogglePlanMode && (
            <Button
              variant="ghost"
              onClick={onTogglePlanMode}
              className={`flex h-9 items-center gap-1.5 rounded-full px-3 transition-colors ${
                isPlanMode
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'text-foreground hover:bg-muted'
              }`}
              title={isPlanMode ? 'Exit Plan Mode' : 'Enter Plan Mode'}
              aria-label={isPlanMode ? 'Exit Plan Mode' : 'Enter Plan Mode'}
            >
              <Calendar className="h-4 w-4" />
              <span className="text-xs font-bold">{isPlanMode ? 'Exit Plan' : 'Plan'}</span>
            </Button>
          )}

          {onAddRecipe && (
            <Button
              variant="ghost"
              onClick={onAddRecipe}
              className="flex h-9 items-center gap-1.5 rounded-full px-3 text-foreground hover:bg-muted"
              title="Add Recipe"
              aria-label="Add Recipe"
            >
              <Plus className="h-4 w-4" />
              <span className="text-xs font-bold">Add</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

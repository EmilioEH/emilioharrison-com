import React, { useState, useEffect, useRef } from 'react'
import { ShoppingBag, LogOut, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { openBurgerMenu } from '../../lib/burgerMenuStore'

interface RecipeHeaderProps {
  onGenerateList: () => void
  user?: string
  scrollContainer?: HTMLElement | null
}

export const RecipeHeader: React.FC<RecipeHeaderProps> = ({
  onGenerateList,
  user,
  scrollContainer,
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
            <a
              href="/protected/recipes/logout"
              className="flex items-center bg-foreground text-background hover:underline"
            >
              Log Out <LogOut className="ml-1 h-3 w-3" />
            </a>
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

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onGenerateList}
            className="h-9 w-9 rounded-full text-foreground"
            title="Grocery List"
            aria-label="Grocery List"
          >
            <ShoppingBag className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={openBurgerMenu}
            className="h-9 w-9 rounded-full text-foreground"
            title="Menu"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}

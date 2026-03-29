import React from 'react'
import { Menu, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { openBurgerMenu } from '../../lib/burgerMenuStore'
import { useStore } from '@nanostores/react'
import { $pendingInvites } from '../../lib/familyStore'

interface RecipeHeaderProps {
  onAddRecipe?: () => void
}

export const RecipeHeader: React.FC<RecipeHeaderProps> = ({ onAddRecipe }) => {
  const pendingInvites = useStore($pendingInvites)

  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-4">
        <a
          href="/protected/recipes"
          className="font-display text-xl font-bold leading-none tracking-tight text-foreground transition-opacity hover:opacity-70"
          aria-label="Home"
        >
          CHEFBOARD
        </a>

        <div className="flex items-center gap-1">
          {onAddRecipe && (
            <Button
              variant="ghost"
              onClick={onAddRecipe}
              className="flex h-11 items-center gap-1.5 rounded-full px-3 text-foreground hover:bg-muted"
              aria-label="Add Recipe"
            >
              <Plus className="h-5 w-5" />
              <span className="text-sm font-bold">Add</span>
            </Button>
          )}

          <button
            onClick={openBurgerMenu}
            className="relative flex h-11 w-11 items-center justify-center rounded-full text-foreground hover:bg-muted"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
            {pendingInvites.length > 0 && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive ring-1 ring-background" />
            )}
          </button>
        </div>
      </div>
    </header>
  )
}

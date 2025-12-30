import React from 'react'
import { X, Trash2, ShoppingBag, Edit2, LogOut, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { openBurgerMenu } from '../../lib/burgerMenuStore'

interface RecipeHeaderProps {
  onGenerateList: () => void
  isSelectionMode: boolean
  selectedCount: number
  onCancelSelection: () => void
  onDeleteSelection: () => void
  onBulkEdit?: () => void
  user?: string
}

export const RecipeHeader: React.FC<RecipeHeaderProps> = ({
  onGenerateList,
  isSelectionMode,
  selectedCount,
  onCancelSelection,
  onDeleteSelection,
  onBulkEdit,
  user,
}) => (
  <header
    className={`sticky top-0 z-50 flex flex-col border-b border-border shadow-md backdrop-blur-md transition-all duration-300 ease-in-out ${
      isSelectionMode
        ? 'h-14 justify-center bg-secondary/90 px-4 text-secondary-foreground'
        : 'justify-end bg-background/80'
    }`}
  >
    {isSelectionMode ? (
      <>
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancelSelection}
              className="rounded-full hover:bg-black/10"
            >
              <X className="h-6 w-6" />
            </Button>
            <div className="text-lg font-bold">{selectedCount} Selected</div>
          </div>
          <div className="flex items-center gap-2">
            {onBulkEdit && (
              <Button onClick={onBulkEdit} className="rounded-full font-bold shadow-sm">
                <Edit2 className="mr-2 h-4 w-4" /> Edit ({selectedCount})
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={onDeleteSelection}
              className="rounded-full font-bold shadow-sm"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete ({selectedCount})
            </Button>
          </div>
        </div>
      </>
    ) : (
      <>
        {/* Static Welcome Bar - Tightened */}
        {user && (
          <div className="h-7 w-full overflow-hidden bg-foreground text-background">
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
        <div className="flex h-14 flex-none items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
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
      </>
    )}
  </header>
)

import React from 'react'
import { X, Trash2, ShoppingBag, Edit2, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RecipeHeaderProps {
  onGenerateList: () => void
  isSelectionMode: boolean
  selectedCount: number
  onCancelSelection: () => void
  onDeleteSelection: () => void
  onBulkEdit?: () => void
  user?: string
  isScrolled?: boolean
}

export const RecipeHeader: React.FC<RecipeHeaderProps> = ({
  onGenerateList,
  isSelectionMode,
  selectedCount,
  onCancelSelection,
  onDeleteSelection,
  onBulkEdit,
  user,
  isScrolled = false,
}) => (
  <header
    className={`sticky top-0 z-50 flex flex-col border-b border-border shadow-sm transition-all duration-300 ease-in-out ${
      isSelectionMode
        ? 'h-16 justify-center bg-secondary px-4 text-secondary-foreground'
        : 'justify-end bg-card'
    }`}
    style={{ height: isSelectionMode ? '64px' : isScrolled ? '64px' : '96px' }}
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
        {/* Minimizable Welcome Bar */}
        {user && (
          <div
            className={`w-full overflow-hidden transition-all duration-300 ease-in-out ${
              isScrolled ? 'h-0 opacity-0' : 'h-8 opacity-100'
            }`}
          >
            <div className="flex h-full items-center justify-between bg-foreground px-4 text-[10px] font-black uppercase tracking-widest text-background sm:text-xs">
              <span>Welcome, {user}</span>
              <a href="/protected/recipes/logout" className="flex items-center hover:underline">
                Log Out <LogOut className="ml-1 h-3 w-3" />
              </a>
            </div>
          </div>
        )}

        {/* Main App Bar */}
        <div className="flex h-16 flex-none items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              CHEFBOARD
            </h1>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onGenerateList}
              className="h-10 w-10 rounded-full text-foreground"
              title="Grocery List"
              aria-label="Grocery List"
            >
              <ShoppingBag className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </>
    )}
  </header>
)

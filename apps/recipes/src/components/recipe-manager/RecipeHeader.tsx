import React from 'react'
import { X, Trash2, ShoppingBag, Edit2 } from 'lucide-react'

interface RecipeHeaderProps {
  onGenerateList: () => void
  isSelectionMode: boolean
  selectedCount: number
  onCancelSelection: () => void
  onDeleteSelection: () => void
  onBulkEdit?: () => void
}

export const RecipeHeader: React.FC<RecipeHeaderProps> = ({
  onGenerateList,
  isSelectionMode,
  selectedCount,
  onCancelSelection,
  onDeleteSelection,
  onBulkEdit,
}) => (
  <header
    className={`sticky top-0 z-10 flex h-16 items-center justify-between border-b border-md-sys-color-outline px-4 transition-colors ${
      isSelectionMode
        ? 'bg-md-sys-color-secondary-container text-md-sys-color-on-secondary-container'
        : 'bg-md-sys-color-surface'
    }`}
  >
    {isSelectionMode ? (
      <>
        <div className="flex items-center gap-4">
          <button onClick={onCancelSelection} className="rounded-full p-2 hover:bg-black/10">
            <X className="h-6 w-6" />
          </button>
          <div className="text-lg font-bold">{selectedCount} Selected</div>
        </div>
        <div className="flex items-center gap-2">
          {onBulkEdit && (
            <button
              onClick={onBulkEdit}
              className="flex items-center gap-2 rounded-full bg-md-sys-color-primary px-4 py-2 font-bold text-md-sys-color-on-primary shadow-md-1 hover:shadow-md-2"
            >
              <Edit2 className="h-4 w-4" /> Edit ({selectedCount})
            </button>
          )}
          <button
            onClick={onDeleteSelection}
            className="flex items-center gap-2 rounded-full bg-md-sys-color-error px-4 py-2 font-bold text-md-sys-color-on-error shadow-md-1 hover:shadow-md-2"
          >
            <Trash2 className="h-4 w-4" /> Delete ({selectedCount})
          </button>
        </div>
      </>
    ) : (
      <>
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold tracking-tight text-md-sys-color-on-surface">
            CHEFBOARD
          </h1>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onGenerateList}
            className="hover:bg-md-sys-color-surface-variant/50 rounded-full p-3 text-md-sys-color-on-surface-variant"
            title="Grocery List"
            aria-label="Grocery List"
          >
            <ShoppingBag className="h-6 w-6" />
          </button>
        </div>
      </>
    )}
  </header>
)

import React, { useState } from 'react'
import { Check, Archive, CalendarX, Trash2, X, Loader2 } from 'lucide-react'
import { cn } from '../../../lib/utils'

interface GroceryListSelectionBarProps {
  selectedCount: number
  totalCount: number
  onCancel: () => void
  onMarkShopped: () => void
  onArchive: () => Promise<void>
  onUnneededThisWeek: () => Promise<void>
  onDelete: () => Promise<void>
}

type BarAction = 'shopped' | 'archive' | 'unneeded' | 'delete'

export const GroceryListSelectionBar: React.FC<GroceryListSelectionBarProps> = ({
  selectedCount,
  totalCount,
  onCancel,
  onMarkShopped,
  onArchive,
  onUnneededThisWeek,
  onDelete,
}) => {
  const [loadingAction, setLoadingAction] = useState<BarAction | null>(null)

  const disabled = selectedCount === 0 || loadingAction !== null

  const runAction = async (action: BarAction, fn: () => void | Promise<void>) => {
    setLoadingAction(action)
    try {
      await fn()
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className="shrink-0 border-t border-border bg-card/95 shadow-lg backdrop-blur-sm">
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
          aria-label="Cancel selection"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="text-sm font-bold tabular-nums">
          {selectedCount} of {totalCount} selected
        </span>

        <div className="ml-auto flex items-center gap-1">
          <ActionButton
            icon={<Check className="h-4 w-4" />}
            label="Shopped"
            onClick={() => runAction('shopped', onMarkShopped)}
            disabled={disabled}
            loading={loadingAction === 'shopped'}
          />
          <ActionButton
            icon={<Archive className="h-4 w-4" />}
            label="Archive"
            onClick={() => runAction('archive', onArchive)}
            disabled={disabled}
            loading={loadingAction === 'archive'}
          />
          <ActionButton
            icon={<CalendarX className="h-4 w-4" />}
            label="Skip"
            onClick={() => runAction('unneeded', onUnneededThisWeek)}
            disabled={disabled}
            loading={loadingAction === 'unneeded'}
          />
          <ActionButton
            icon={<Trash2 className="h-4 w-4" />}
            label="Delete"
            onClick={() => runAction('delete', onDelete)}
            disabled={disabled}
            loading={loadingAction === 'delete'}
            destructive
          />
        </div>
      </div>
    </div>
  )
}

interface ActionButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  destructive?: boolean
}

const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ icon, label, onClick, disabled, loading, destructive }, ref) => (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors',
        destructive
          ? 'text-destructive hover:bg-destructive/10'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        disabled && 'cursor-not-allowed opacity-40',
      )}
      aria-label={label}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      <span>{label}</span>
    </button>
  ),
)
ActionButton.displayName = 'ActionButton'

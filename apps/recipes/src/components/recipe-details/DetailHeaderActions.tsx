import React from 'react'
import { Calendar, Edit2, FolderInput, MoreHorizontal, Trash2 } from 'lucide-react'

interface DetailHeaderActionsProps {
  onAction: (action: 'delete' | 'edit' | 'addToWeek' | 'move') => void
  onToggleThisWeek?: () => void
  isThisWeek: boolean | undefined
}

export const DetailHeaderActions: React.FC<DetailHeaderActionsProps> = ({
  onAction,
  onToggleThisWeek,
  isThisWeek,
}) => {
  return (
    <div className="group relative">
      <button
        className="hover:bg-md-sys-color-on-surface/[0.08] rounded-full p-2 text-md-sys-color-on-surface-variant"
        aria-label="More Options"
      >
        <MoreHorizontal className="h-6 w-6" />
      </button>
      {/* Dropdown Menu */}
      <div className="invisible absolute right-0 top-full z-30 mt-2 flex w-48 flex-col overflow-hidden rounded-md-m border border-md-sys-color-outline bg-md-sys-color-surface opacity-0 shadow-md-2 transition-all group-hover:visible group-hover:opacity-100">
        <button
          onClick={() => {
            if (onToggleThisWeek) onToggleThisWeek()
            else onAction('addToWeek') // Fallback if prop not direct
          }}
          className="hover:bg-md-sys-color-primary/[0.08] flex items-center gap-2 px-4 py-3 text-left text-sm font-medium"
        >
          <Calendar className="h-4 w-4" /> {isThisWeek ? 'Remove from Week' : 'Add to This Week'}
        </button>
        <button
          onClick={() => onAction('move')}
          className="hover:bg-md-sys-color-primary/[0.08] flex items-center gap-2 px-4 py-3 text-left text-sm font-medium"
        >
          <FolderInput className="h-4 w-4" /> Move Folder
        </button>
        <button
          onClick={() => onAction('edit')}
          className="hover:bg-md-sys-color-primary/[0.08] flex items-center gap-2 px-4 py-3 text-left text-sm font-medium"
        >
          <Edit2 className="h-4 w-4" /> Edit Recipe
        </button>
        <button
          onClick={() => onAction('delete')}
          className="hover:bg-md-sys-color-error/[0.08] flex items-center gap-2 border-t border-md-sys-color-outline px-4 py-3 text-left text-sm font-medium text-md-sys-color-error"
        >
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      </div>
    </div>
  )
}

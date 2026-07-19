import React, { useState } from 'react'
import {
  Calendar,
  Edit2,
  FolderInput,
  MoreHorizontal,
  Share2,
  Trash2,
  Sparkles,
  Undo2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import type { HeaderAction } from './types'

interface DetailHeaderActionsProps {
  onAction: (action: HeaderAction) => void
  onToggleThisWeek?: () => void
  isThisWeek: boolean | undefined
  hasPreviousVersion?: boolean
}

export const DetailHeaderActions: React.FC<DetailHeaderActionsProps> = ({
  onAction,
  onToggleThisWeek,
  isThisWeek,
  hasPreviousVersion = false,
}) => {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onAction('share')}
        title="Share Recipe"
        aria-label="Share Recipe"
        className="h-11 w-11 rounded-full"
      >
        <Share2 className="h-5 w-5" />
      </Button>

      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full"
            title="More Options"
            aria-label="More Options"
          >
            <MoreHorizontal className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onSelect={() => {
              if (onToggleThisWeek) onToggleThisWeek()
              else onAction('addToWeek')
            }}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {isThisWeek ? 'Remove from Week' : 'Add to This Week'}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAction('move')}>
            <FolderInput className="mr-2 h-4 w-4" />
            Move Folder
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAction('edit')}>
            <Edit2 className="mr-2 h-4 w-4" />
            Edit Recipe
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAction('refresh')}>
            <Sparkles className="mr-2 h-4 w-4" />
            Refresh AI Data
          </DropdownMenuItem>
          {hasPreviousVersion && (
            <DropdownMenuItem onSelect={() => onAction('restore')}>
              <Undo2 className="mr-2 h-4 w-4" />
              Restore Previous Version
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => onAction('delete')}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

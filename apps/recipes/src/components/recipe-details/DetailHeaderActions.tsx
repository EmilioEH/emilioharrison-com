import React from 'react'
import {
  Calendar,
  Edit2,
  FolderInput,
  MoreHorizontal,
  Share2,
  Trash2,
  Sparkles,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

interface DetailHeaderActionsProps {
  onAction: (action: 'delete' | 'edit' | 'addToWeek' | 'move' | 'share' | 'refresh') => void
  onToggleThisWeek?: () => void
  isThisWeek: boolean | undefined
}

export const DetailHeaderActions: React.FC<DetailHeaderActionsProps> = ({
  onAction,
  onToggleThisWeek,
  isThisWeek,
}) => {
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

      <DropdownMenu>
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
            onClick={() => {
              if (onToggleThisWeek) onToggleThisWeek()
              else onAction('addToWeek')
            }}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {isThisWeek ? 'Remove from Week' : 'Add to This Week'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAction('move')}>
            <FolderInput className="mr-2 h-4 w-4" />
            Move Folder
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAction('edit')}>
            <Edit2 className="mr-2 h-4 w-4" />
            Edit Recipe
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAction('refresh')}>
            <Sparkles className="mr-2 h-4 w-4" />
            Refresh AI Data
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onAction('delete')}
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

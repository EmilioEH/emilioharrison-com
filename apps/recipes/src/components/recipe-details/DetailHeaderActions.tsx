import React from 'react'
import { Calendar, Edit2, FolderInput, MoreHorizontal, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

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
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onAction('edit')}
        title="Edit Recipe"
        className="rounded-full"
      >
        <Edit2 className="h-5 w-5" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
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

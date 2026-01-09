import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { RotateCcw, Clock, User } from 'lucide-react'
import type { RecipeVersion } from '../../lib/types'
import { format } from 'date-fns'

interface HistoryModalProps {
  isOpen: boolean
  onClose: () => void
  versions: RecipeVersion[]
  onRestore: (version: RecipeVersion) => void
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  versions,
  onRestore,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] w-full max-w-md overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Version History</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto p-4">
          {versions.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No version history available.</p>
          ) : (
            <div className="space-y-4">
              {versions.map((version, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg border bg-card/50 p-4 transition-colors hover:bg-card"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {format(new Date(version.timestamp), 'MMM d, yyyy h:mm a')}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {version.userName || version.userId || 'Anonymous'}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (
                        confirm(
                          'Are you sure you want to restore this version? Current changes will be lost.',
                        )
                      ) {
                        onRestore(version)
                      }
                    }}
                    className="shrink-0 gap-2"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

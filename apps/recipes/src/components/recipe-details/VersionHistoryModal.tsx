import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { useRecipeVersions } from '../recipe-manager/hooks/useRecipeVersions'
import type { RecipeVersion } from '../../lib/types'
import { Clock, RotateCcw, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'

interface VersionHistoryModalProps {
  recipeId: string
  isOpen: boolean
  onClose: () => void
  onRestore: () => void // Callback to trigger a data reload after restore
}

export function VersionHistoryModal({
  recipeId,
  isOpen,
  onClose,
  onRestore,
}: VersionHistoryModalProps) {
  const { versions, isLoading, error, fetchVersions, restoreVersion } = useRecipeVersions()
  const [selectedVersion, setSelectedVersion] = useState<RecipeVersion | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)

  useEffect(() => {
    if (isOpen && recipeId) {
      fetchVersions(recipeId)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedVersion(null)
    }
  }, [isOpen, recipeId, fetchVersions])

  const handleRestore = async () => {
    if (!selectedVersion) return
    setIsRestoring(true)
    const success = await restoreVersion(recipeId, selectedVersion.id)
    setIsRestoring(false)
    if (success) {
      onRestore()
      onClose()
    }
  }

  const getChangeLabel = (type: string) => {
    switch (type) {
      case 'manual-edit':
        return 'Manual Edit'
      case 'ai-refresh':
        return 'AI Refresh'
      case 'import':
        return 'Initial Import'
      case 'restore':
        return 'Restored Version'
      default:
        return type
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-500" />
            Version History
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-[300px] flex-1 overflow-y-auto p-1">
          {isLoading ? (
            <div className="py-8 text-center text-gray-500">Loading history...</div>
          ) : error ? (
            <div className="py-8 text-center text-red-500">{error}</div>
          ) : versions.length === 0 ? (
            <div className="py-8 text-center text-gray-500">No history available</div>
          ) : selectedVersion ? (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 pl-0 text-gray-500"
                onClick={() => setSelectedVersion(null)}
              >
                <ArrowLeft className="h-4 w-4" /> Back to List
              </Button>

              <div className="space-y-2 rounded-lg border bg-gray-50/50 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {getChangeLabel(selectedVersion.changeType)}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {format(new Date(selectedVersion.timestamp), 'PPpp')}
                    </p>
                  </div>
                  <div className="rounded-full bg-blue-100 px-2 py-0.5 text-xs capitalize text-blue-800">
                    {selectedVersion.changeType.replace('-', ' ')}
                  </div>
                </div>
                {/* Note: In a real implementation, we'd fetch the full data here to show a diff */}
                <p className="mt-2 border-t pt-2 text-sm italic text-gray-600">
                  Restore this version to revert all content (ingredients, instructions) to this
                  state.
                </p>
              </div>

              <div className="pt-4">
                <Button className="w-full gap-2" onClick={handleRestore} disabled={isRestoring}>
                  <RotateCcw className="h-4 w-4" />
                  {isRestoring ? 'Restoring...' : 'Restore This Version'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {versions.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVersion(v)}
                  className="group flex w-full items-center justify-between rounded-lg border border-transparent p-3 text-left transition-colors hover:border-gray-200 hover:bg-gray-50"
                >
                  <div>
                    <div className="font-medium text-gray-900 transition-colors group-hover:text-blue-600">
                      {getChangeLabel(v.changeType)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(v.timestamp), 'MMM d, h:mm a')}
                    </div>
                  </div>
                  <div className="text-gray-400 group-hover:text-gray-600">
                    <ArrowLeft className="h-4 w-4 rotate-180" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

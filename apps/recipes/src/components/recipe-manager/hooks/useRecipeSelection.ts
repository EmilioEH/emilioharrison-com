import { useState, useCallback } from 'react'

export const useRecipeSelection = () => {
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [isPlanMode, setIsPlanMode] = useState(false)

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const togglePlanMode = useCallback(() => {
    setIsPlanMode((prev) => !prev)
    // Clear selection when switching modes to avoid confusion?
    // Maybe not needed if they are orthogonal.
  }, [])

  const clearSelection = useCallback(() => {
    setIsSelectionMode(false)
    setIsPlanMode(false)
    setSelectedIds(new Set())
  }, [])

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids))
  }, [])

  return {
    isSelectionMode,
    setIsSelectionMode,
    isPlanMode,
    setIsPlanMode,
    togglePlanMode,
    selectedIds,
    setSelectedIds,
    toggleSelection,
    clearSelection,
    selectAll,
  }
}

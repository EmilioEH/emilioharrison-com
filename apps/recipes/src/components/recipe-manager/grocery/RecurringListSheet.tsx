import React, { useState, useEffect, useCallback, useRef } from 'react'
import { X, CalendarDays, Trash2, Loader2, User, ListChecks, Plus, CheckSquare } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { FrequencyPicker } from './FrequencyPicker'
import type { RecurringGroceryItem } from '../../../lib/types'

interface RecurringListSheetProps {
  onClose: () => void
  onChange?: () => void
  weekStartDate?: string
}

const getBaseUrl = (): string => {
  const base = import.meta.env.BASE_URL
  return base.endsWith('/') ? base : `${base}/`
}

const triggerHaptic = (style: 'light' | 'medium' | 'success' = 'light') => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    const patterns = { light: [10], medium: [20], success: [10, 50, 20] }
    navigator.vibrate(patterns[style])
  }
}

const LONG_PRESS_MS = 500

const formatRelativeDate = (isoDate?: string): string => {
  if (!isoDate) return 'Never added'
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return 'Never added'
  const diffMs = Date.now() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 'This week'
  if (diffDays < 7) return `${diffDays}d ago`
  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks === 1) return '1 week ago'
  if (diffWeeks < 8) return `${diffWeeks} weeks ago`
  const diffMonths = Math.floor(diffDays / 30)
  return `${diffMonths}mo ago`
}

const groupItemsByFrequency = (
  items: RecurringGroceryItem[],
): { label: string; items: RecurringGroceryItem[] }[] => {
  const weekly: RecurringGroceryItem[] = []
  const biweekly: RecurringGroceryItem[] = []
  const custom: RecurringGroceryItem[] = []
  for (const item of items) {
    if (item.frequencyWeeks === 1) weekly.push(item)
    else if (item.frequencyWeeks === 2) biweekly.push(item)
    else custom.push(item)
  }
  const groups: { label: string; items: RecurringGroceryItem[] }[] = []
  if (weekly.length > 0) groups.push({ label: 'Weekly', items: weekly })
  if (biweekly.length > 0) groups.push({ label: 'Every 2 weeks', items: biweekly })
  if (custom.length > 0) groups.push({ label: 'Custom', items: custom })
  return groups
}

type ActionType = 'addToWeek' | 'delete'

export const RecurringListSheet: React.FC<RecurringListSheetProps> = ({
  onClose,
  onChange,
  weekStartDate,
}) => {
  const [items, setItems] = useState<RecurringGroceryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [pendingItemId, setPendingItemId] = useState<string | null>(null)

  // Selection mode
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loadingAction, setLoadingAction] = useState<ActionType | null>(null)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const longPressTriggered = useRef(false)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${getBaseUrl()}api/grocery/recurring`)
      if (!res.ok) throw new Error('Failed to load recurring items')
      const data = (await res.json()) as { items: RecurringGroceryItem[] }
      setItems(data.items ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false)
    setSelectedIds(new Set())
  }, [])

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)))
    }
  }, [items, selectedIds.size])

  // Long press handlers
  const handleLongPressStart = useCallback(
    (id: string) => {
      longPressTriggered.current = false
      longPressTimer.current = setTimeout(() => {
        longPressTriggered.current = true
        triggerHaptic('medium')
        setSelectionMode(true)
        setSelectedIds(new Set([id]))
      }, LONG_PRESS_MS)
    },
    [],
  )

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const handleItemTap = useCallback(
    (id: string) => {
      if (longPressTriggered.current) return
      if (selectionMode) {
        toggleSelected(id)
      } else {
        setEditingItemId((prev) => (prev === id ? null : id))
      }
    },
    [selectionMode, toggleSelected],
  )

  // Actions
  const handleChangeFrequency = async (itemId: string, frequencyWeeks: number | null) => {
    if (!frequencyWeeks) {
      setEditingItemId(null)
      return
    }
    setPendingItemId(itemId)
    try {
      const res = await fetch(`${getBaseUrl()}api/grocery/recurring`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, frequencyWeeks }),
      })
      if (!res.ok) throw new Error('Failed to update frequency')
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, frequencyWeeks } : i)),
      )
      setEditingItemId(null)
      onChange?.()
    } catch (err) {
      console.error('Update frequency failed:', err)
    } finally {
      setPendingItemId(null)
    }
  }

  const handleDeleteSingle = async (itemId: string) => {
    setPendingItemId(itemId)
    try {
      const res = await fetch(`${getBaseUrl()}api/grocery/recurring`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      })
      if (!res.ok) throw new Error('Failed to delete')
      setItems((prev) => prev.filter((i) => i.id !== itemId))
      onChange?.()
    } catch (err) {
      console.error('Delete recurring failed:', err)
    } finally {
      setPendingItemId(null)
    }
  }

  const handleBulkDelete = async () => {
    setLoadingAction('delete')
    try {
      const ids = Array.from(selectedIds)
      await Promise.all(
        ids.map((itemId) =>
          fetch(`${getBaseUrl()}api/grocery/recurring`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId }),
          }),
        ),
      )
      setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)))
      exitSelectionMode()
      onChange?.()
    } catch (err) {
      console.error('Bulk delete failed:', err)
    } finally {
      setLoadingAction(null)
    }
  }

  const handleAddToWeek = async () => {
    if (!weekStartDate) return
    setLoadingAction('addToWeek')
    try {
      const res = await fetch(`${getBaseUrl()}api/grocery/recurring-inject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekStartDate,
          recurringItemIds: Array.from(selectedIds),
        }),
      })
      if (!res.ok) throw new Error('Failed to add items to list')
      // Update lastAddedWeek locally
      setItems((prev) =>
        prev.map((i) =>
          selectedIds.has(i.id) ? { ...i, lastAddedWeek: weekStartDate } : i,
        ),
      )
      exitSelectionMode()
      onChange?.()
    } catch (err) {
      console.error('Add to week failed:', err)
    } finally {
      setLoadingAction(null)
    }
  }

  const groups = groupItemsByFrequency(items)
  const allSelected = items.length > 0 && selectedIds.size === items.length

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-50 bg-black/50 duration-200 animate-in fade-in"
        onClick={selectionMode ? exitSelectionMode : onClose}
        aria-label="Close recurring items sheet"
      />
      <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl border-t border-border bg-card shadow-xl duration-300 animate-in slide-in-from-bottom">
        <div className="sticky top-0 z-10 flex justify-center bg-card pb-2 pt-3">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        <div className={cn('flex-1 overflow-y-auto px-5', selectionMode && selectedIds.size > 0 ? 'pb-20' : 'pb-8')}>
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h3 className="font-display text-xl font-bold text-foreground">Recurring Items</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {selectionMode
                  ? `${selectedIds.size} of ${items.length} selected`
                  : `${items.length} item${items.length === 1 ? '' : 's'} configured`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {!selectionMode && items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectionMode(true)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Enter selection mode"
                >
                  <ListChecks className="h-5 w-5" />
                </button>
              )}
              {selectionMode && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className={cn(
                    'rounded-full p-1.5 transition-colors',
                    allSelected
                      ? 'text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                  aria-label={allSelected ? 'Deselect all' : 'Select all'}
                >
                  <CheckSquare className="h-5 w-5" />
                </button>
              )}
              <button
                type="button"
                onClick={selectionMode ? exitSelectionMode : onClose}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={selectionMode ? 'Cancel selection' : 'Close'}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          {!loading && error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-muted p-6">
                <CalendarDays className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <h4 className="font-display text-lg font-bold">No recurring items yet</h4>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Use Select on the grocery list to mark multiple items as recurring at once.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Back to list
              </button>
            </div>
          )}

          {!loading && !error && groups.length > 0 && (
            <div className="space-y-6">
              {groups.map((group) => (
                <section key={group.label}>
                  <h4 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-primary">
                    {group.label}
                  </h4>
                  <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                    {group.items.map((item) => {
                      const isEditing = editingItemId === item.id && !selectionMode
                      const isPending = pendingItemId === item.id
                      const isSelected = selectedIds.has(item.id)
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            'border-b border-border last:border-0 transition-colors',
                            selectionMode && isSelected && 'bg-primary/5',
                          )}
                        >
                          <div className="flex items-center gap-3 p-3">
                            {selectionMode && (
                              <div
                                className={cn(
                                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
                                  isSelected
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-muted-foreground/30',
                                )}
                              >
                                {isSelected && (
                                  <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => handleItemTap(item.id)}
                              onTouchStart={() => !selectionMode && handleLongPressStart(item.id)}
                              onTouchEnd={handleLongPressEnd}
                              onTouchCancel={handleLongPressEnd}
                              onMouseDown={() => !selectionMode && handleLongPressStart(item.id)}
                              onMouseUp={handleLongPressEnd}
                              onMouseLeave={handleLongPressEnd}
                              className="flex-1 text-left"
                              disabled={isPending}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium capitalize">{item.name}</span>
                                <span className="inline-flex items-center gap-0.5 rounded bg-purple-100 px-1 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                  <CalendarDays className="h-2.5 w-2.5" />
                                  {item.frequencyWeeks}w
                                </span>
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-muted-foreground">
                                <span>Last added: {formatRelativeDate(item.lastAddedWeek)}</span>
                                {item.addedByName && (
                                  <span className="flex items-center gap-0.5">
                                    <User className="h-2.5 w-2.5" />
                                    {item.addedByName}
                                  </span>
                                )}
                              </div>
                            </button>
                            {!selectionMode && (
                              <button
                                type="button"
                                onClick={() => handleDeleteSingle(item.id)}
                                disabled={isPending}
                                className={cn(
                                  'rounded-full p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive',
                                  isPending && 'opacity-40',
                                )}
                                aria-label={`Remove ${item.name} from recurring`}
                              >
                                {isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </div>
                          {isEditing && (
                            <div className="border-t border-border bg-muted/30 px-3 py-3">
                              <FrequencyPicker
                                currentFrequencyWeeks={item.frequencyWeeks}
                                allowClear={false}
                                label="Change frequency"
                                onSelect={(freq) => handleChangeFrequency(item.id, freq)}
                                disabled={isPending}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        {/* Selection Action Bar */}
        {selectionMode && selectedIds.size > 0 && (
          <div className="shrink-0 border-t border-border bg-card/95 pb-20 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2 px-4 py-3">
              <button
                type="button"
                onClick={exitSelectionMode}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                aria-label="Cancel selection"
              >
                <X className="h-4 w-4" />
              </button>
              <span className="text-sm font-bold tabular-nums">
                {selectedIds.size} selected
              </span>

              <div className="ml-auto flex items-center gap-1">
                {weekStartDate && (
                  <button
                    type="button"
                    onClick={handleAddToWeek}
                    disabled={loadingAction !== null}
                    className={cn(
                      'flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors',
                      'text-primary hover:bg-primary/10',
                      loadingAction !== null && 'cursor-not-allowed opacity-40',
                    )}
                    aria-label="Add to this week"
                  >
                    {loadingAction === 'addToWeek' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    <span>Add</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={loadingAction !== null}
                  className={cn(
                    'flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors',
                    'text-destructive hover:bg-destructive/10',
                    loadingAction !== null && 'cursor-not-allowed opacity-40',
                  )}
                  aria-label="Delete selected"
                >
                  {loadingAction === 'delete' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

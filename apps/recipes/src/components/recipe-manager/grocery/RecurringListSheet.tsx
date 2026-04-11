import React, { useState, useEffect, useCallback } from 'react'
import { X, CalendarDays, Trash2, Loader2, User } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { FrequencyPicker } from './FrequencyPicker'
import type { RecurringGroceryItem } from '../../../lib/types'

interface RecurringListSheetProps {
  onClose: () => void
  /** Called after any successful change so parent can refresh derived state. */
  onChange?: () => void
}

const getBaseUrl = (): string => {
  const base = import.meta.env.BASE_URL
  return base.endsWith('/') ? base : `${base}/`
}

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

export const RecurringListSheet: React.FC<RecurringListSheetProps> = ({ onClose, onChange }) => {
  const [items, setItems] = useState<RecurringGroceryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [pendingItemId, setPendingItemId] = useState<string | null>(null)

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

  const handleDelete = async (itemId: string) => {
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

  const groups = groupItemsByFrequency(items)

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-50 bg-black/50 duration-200 animate-in fade-in"
        onClick={onClose}
        aria-label="Close recurring items sheet"
      />
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-border bg-card shadow-xl duration-300 animate-in slide-in-from-bottom">
        <div className="sticky top-0 z-10 flex justify-center bg-card pb-2 pt-3">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="px-5 pb-8">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h3 className="font-display text-xl font-bold text-foreground">Recurring Items</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {items.length} item{items.length === 1 ? '' : 's'} configured
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
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
                      const isEditing = editingItemId === item.id
                      const isPending = pendingItemId === item.id
                      return (
                        <div
                          key={item.id}
                          className="border-b border-border last:border-0"
                        >
                          <div className="flex items-center gap-3 p-3">
                            <button
                              type="button"
                              onClick={() => setEditingItemId(isEditing ? null : item.id)}
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
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
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
      </div>
    </>
  )
}

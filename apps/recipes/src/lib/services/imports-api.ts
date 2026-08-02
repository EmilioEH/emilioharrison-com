import type { ImportJob } from '../types'
import type { ImportSummary } from './import-batches'

/**
 * Client half of bulk photo import. The browser never talks to the worker — it posts a batch,
 * then asks this endpoint what happened. Deliberately a poll rather than a live subscription:
 * `firestore.rules` denies client reads on everything except grocery lists, and the point of the
 * feature is that the user leaves the app entirely and comes back later.
 */

export function apiBase(): string {
  const base = import.meta.env.BASE_URL
  return base.endsWith('/') ? base : `${base}/`
}

/** The display URL for an uploaded photo key. */
export function photoUrl(key: string): string {
  return `${apiBase()}api/uploads/${key}`
}

export interface ImportsSnapshot {
  jobs: ImportJob[]
  summary: ImportSummary
}

const EMPTY_SUMMARY: ImportSummary = {
  needsReview: 0,
  inProgress: 0,
  failed: 0,
  serviceOffline: false,
}

export const EMPTY_IMPORTS: ImportsSnapshot = { jobs: [], summary: EMPTY_SUMMARY }

/**
 * Queues a batch. `groups` is one entry per recipe — several keys only when the user grouped a
 * multi-page spread, in page order.
 */
export async function submitImportBatch(
  groups: string[][],
): Promise<{ ok: true; batchId: string; total: number } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${apiBase()}api/imports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groups }),
    })
    const data = (await res.json().catch(() => ({}))) as {
      batchId?: string
      total?: number
      error?: string
    }

    if (!res.ok) {
      return { ok: false, error: data.error || 'Could not start the import. Please try again.' }
    }
    return { ok: true, batchId: data.batchId ?? '', total: data.total ?? groups.length }
  } catch {
    return { ok: false, error: 'No connection. Your photos are saved — try again in a moment.' }
  }
}

/** Everything still outstanding for this user, plus the counts the badge needs. */
export async function fetchImports(): Promise<ImportsSnapshot> {
  const res = await fetch(`${apiBase()}api/imports`, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error('Could not load your imports.')
  const data = (await res.json()) as Partial<ImportsSnapshot>
  return { jobs: data.jobs ?? [], summary: data.summary ?? EMPTY_SUMMARY }
}

/** Records what the user did with one card. `savedRecipeId` only applies to `accept`. */
export async function reviewImportJob(
  jobId: string,
  action: 'accept' | 'discard' | 'retry',
  savedRecipeId?: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${apiBase()}api/imports/${jobId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...(savedRecipeId ? { savedRecipeId } : {}) }),
    })
    return res.ok
  } catch {
    return false
  }
}

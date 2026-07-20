import type { WorkerStore } from './types'

/**
 * Whether a doc claimed at `claimedAtIso` has been `processing` long enough to be considered
 * abandoned (the worker crashed or was killed mid-job). Pure so it's unit-testable; the actual
 * "which docs are stuck" query lives in the store.
 *
 * A missing/invalid `claimedAt` counts as stuck — a doc in `processing` with no claim timestamp
 * shouldn't exist under this worker, so treat it as strandable rather than leaving it forever.
 */
export function isStale(claimedAtIso: string | undefined, now: number, deadlineMs: number): boolean {
  if (!claimedAtIso) return true
  const claimedAt = new Date(claimedAtIso).getTime()
  if (!Number.isFinite(claimedAt)) return true
  return now - claimedAt > deadlineMs
}

/**
 * One reaper sweep: flip enhancement/grocery docs stuck in `processing` past the deadline to
 * `error`. Never throws — a failed sweep just logs and the next tick retries.
 */
export async function sweepStuckJobs(
  store: WorkerStore,
  deadlineMs: number,
  now: number = Date.now(),
): Promise<void> {
  try {
    const enhanced = await store.reapStuckEnhancements(deadlineMs, now)
    const grocery = await store.reapStuckGrocery(deadlineMs, now)
    if (enhanced > 0 || grocery > 0) {
      console.warn(`[worker] reaper flipped ${enhanced} enhancement + ${grocery} grocery stuck job(s) to error`)
    }
  } catch (e) {
    console.error('[worker] reaper sweep failed:', e)
  }
}

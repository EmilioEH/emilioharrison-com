import type { WorkerStore } from "./types";

/**
 * Whether a doc claimed at `claimedAtIso` has been `processing` long enough to be considered
 * abandoned (the worker crashed or was killed mid-job). Pure so it's unit-testable; the actual
 * "which docs are stuck" query lives in the store.
 *
 * A missing/invalid `claimedAt` counts as stuck — a doc in `processing` with no claim timestamp
 * shouldn't exist under this worker, so treat it as strandable rather than leaving it forever.
 */
export function isStale(
  claimedAtIso: string | undefined,
  now: number,
  deadlineMs: number,
): boolean {
  if (!claimedAtIso) return true;
  const claimedAt = new Date(claimedAtIso).getTime();
  if (!Number.isFinite(claimedAt)) return true;
  return now - claimedAt > deadlineMs;
}

/**
 * One reaper sweep: flip grocery and photo-import docs stuck in `processing` past the deadline to
 * `error`. Never throws — a failed sweep just logs and the next tick retries. The two queues are
 * swept independently so one failing query can't stop the other from being rescued.
 */
export async function sweepStuckJobs(
  store: WorkerStore,
  deadlineMs: number,
  now: number = Date.now(),
): Promise<void> {
  try {
    const grocery = await store.reapStuckGrocery(deadlineMs, now);
    if (grocery > 0) {
      console.warn(
        `[worker] reaper flipped ${grocery} stuck grocery job(s) to error`,
      );
    }
  } catch (e) {
    console.error("[worker] reaper grocery sweep failed:", e);
  }

  try {
    const imports = await store.reapStuckImports(deadlineMs, now);
    if (imports > 0) {
      console.warn(
        `[worker] reaper flipped ${imports} stuck import job(s) to error`,
      );
    }
  } catch (e) {
    console.error("[worker] reaper import sweep failed:", e);
  }
}

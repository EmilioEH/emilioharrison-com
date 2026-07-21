import type { GroceryList as GroceryListType } from '../../../lib/types'

// Must comfortably exceed the longest a *healthy* generation can go between doc writes, or it
// false-positives on a job that's simply slow. Two backends set that ceiling:
//   - Legacy Cloudflare path: GEMINI_TIMEOUT_MS (25s), a terminal write landing by ~27s.
//   - VM worker path (BACKGROUND_WORKER_ENABLED): WORKER_JOB_TIMEOUT_MS (120s) with no waitUntil
//     ceiling — a slow-to-start response can go the full budget before the first category
//     progress write advances `updatedAt`.
// So this is sized for the worker's budget plus margin. It's a fallback indicator only — the
// worker's own reaper (10min) is the real backstop for a crashed job — so detecting the rare
// dead job a bit later matters far less than never flagging a healthy one.
const STUCK_THRESHOLD_MS = 130_000

/**
 * Whether a grocery list generation should be considered stuck — a pure function so it's
 * independently testable, used by WeekWorkspace.tsx's isStuck effect.
 *
 * Covers both `processing` (a claimed job that went quiet) and `pending` (worker-path only: a
 * doc the VM worker never claimed, i.e. the worker is down) — both are "stuck" once they exceed
 * the threshold. The legacy Cloudflare path never leaves a doc `pending`, so this doesn't change
 * its behaviour.
 */
export function isGroceryGenerationStuck(
  status: GroceryListType['status'] | undefined,
  updatedAt: string | undefined,
  now: number,
  thresholdMs: number = STUCK_THRESHOLD_MS,
): boolean {
  if ((status !== 'processing' && status !== 'pending') || !updatedAt) return false
  return now - new Date(updatedAt).getTime() > thresholdMs
}

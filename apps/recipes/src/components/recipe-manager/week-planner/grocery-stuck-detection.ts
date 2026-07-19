import type { GroceryList as GroceryListType } from '../../../lib/types'

// Must comfortably exceed generate-grocery-list.ts's GEMINI_TIMEOUT_MS (25s — capped by
// Cloudflare's ~30s waitUntil budget, see that file) plus margin for the error/complete write
// to land. The server now guarantees a terminal status write within ~27s of starting, so this
// only fires in the rare "job killed before any write" case (e.g. isolate eviction) — but it
// must never fire while the server is still legitimately inside its own budget: progress
// writes only happen when a new category is detected in the streamed text, not on a steady
// clock, so a slow-to-start response can go the full budget with no intermediate write.
const STUCK_THRESHOLD_MS = 35_000

/**
 * Whether a grocery list generation should be considered stuck — a pure function so it's
 * independently testable, used by WeekWorkspace.tsx's isStuck effect.
 */
export function isGroceryGenerationStuck(
  status: GroceryListType['status'] | undefined,
  updatedAt: string | undefined,
  now: number,
  thresholdMs: number = STUCK_THRESHOLD_MS,
): boolean {
  if (status !== 'processing' || !updatedAt) return false
  return now - new Date(updatedAt).getTime() > thresholdMs
}

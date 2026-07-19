import type { GroceryList as GroceryListType } from '../../../lib/types'

// Comfortably above generate-grocery-list.ts's own GEMINI_TIMEOUT_MS (60s) plus margin for the
// final Firestore write to land. Must exceed the server's own budget — this used to be 45s,
// *below* the server's 60s timeout, which meant a generation still legitimately working
// (progress writes only happen when a new category is detected in the streamed text, not on a
// steady clock, so a slow-to-start response can go a while with no write) could get falsely
// flagged as stuck before the server ever gave up.
const STUCK_THRESHOLD_MS = 70_000

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

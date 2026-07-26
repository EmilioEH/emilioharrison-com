/**
 * Small helpers for assembling a result set out of several Firestore queries.
 *
 * These live here rather than next to any one endpoint because the same "merge a few scoped
 * queries into one list" shape appears in the recipe list, the bootstrap payload and the meal
 * suggester — and when the pieces lived in `pages/api/recipes/index.ts`, a lib module could not
 * reach them without importing a page.
 */

// Firestore's `in` operator caps at 30 values. Family groups are small in this app, so a single
// chunk almost always covers it — but we chunk defensively rather than silently truncating the
// creator list if that ever changes.
export const FIRESTORE_IN_LIMIT = 30

/** Splits an array into chunks of at most `size` items. */
export function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

/** De-dupes documents returned across multiple merged queries, keeping the first occurrence. */
export function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const item of items) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    out.push(item)
  }
  return out
}

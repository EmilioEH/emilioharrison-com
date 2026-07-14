import type { FirebaseRestService } from '../firebase-rest'

export interface BackfillResult {
  total: number
  missing: number
  succeeded: number
  failed: number
  dryRun: boolean
}

/**
 * PERFORMANCE-PLAN.md P3: `GET /api/recipes` scopes its Firestore query to
 * `createdBy IN [...]` UNIONed with `createdBy == null`, instead of paging through the entire
 * collection. Firestore cannot query "field does not exist" server-side, so legacy recipes that
 * predate the `createdBy` field entirely (as opposed to having it explicitly `null`) need a
 * one-time backfill before they'll appear in anyone's library list.
 *
 * This is safe to run more than once — recipes that already have `createdBy` set (to anything,
 * including `null`) are left untouched.
 *
 * Shared by `scripts/backfill-legacy-created-by.ts` (run locally with real production
 * credentials) and `POST /api/admin/backfill-legacy-created-by` (run from inside the deployed
 * Worker, which already holds the production service account — see that route for why this
 * exists as a second trigger path).
 */
export async function runLegacyCreatedByBackfill(
  db: FirebaseRestService,
  options: { dryRun?: boolean } = {},
): Promise<BackfillResult> {
  const dryRun = options.dryRun ?? false

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRecipes = (await db.getCollection('recipes')) as any[]
  const legacyRecipes = allRecipes.filter((r) => r.createdBy === undefined)

  if (dryRun || legacyRecipes.length === 0) {
    return {
      total: allRecipes.length,
      missing: legacyRecipes.length,
      succeeded: 0,
      failed: 0,
      dryRun,
    }
  }

  let succeeded = 0
  let failed = 0

  // Limit concurrency for safety (matches the existing migrate-ownership.ts convention).
  const chunkSize = 10
  for (let i = 0; i < legacyRecipes.length; i += chunkSize) {
    const chunk = legacyRecipes.slice(i, i + chunkSize)
    const results = await Promise.allSettled(
      chunk.map((recipe) => db.updateDocument('recipes', recipe.id, { createdBy: null })),
    )
    for (const result of results) {
      if (result.status === 'fulfilled') succeeded++
      else failed++
    }
  }

  return { total: allRecipes.length, missing: legacyRecipes.length, succeeded, failed, dryRun }
}

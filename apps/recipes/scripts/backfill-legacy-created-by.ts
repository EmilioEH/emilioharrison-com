/**
 * One-time migration: PERFORMANCE-PLAN.md P3.
 *
 * `GET /api/recipes` used to page through the ENTIRE `recipes` collection on every request and
 * filter in worker memory. It's been rewritten to use Firestore's `runQuery` (structured query)
 * scoped to `createdBy IN [me, ...family]`, UNIONed with a `createdBy == null` query for legacy
 * recipes that predate the `createdBy` field (those are treated as visible to everyone).
 *
 * The catch: Firestore cannot query "field does not exist" server-side — not even via `!=` or
 * `NOT_IN`, both of which *exclude* documents missing the field entirely. There is no way to ask
 * Firestore for "recipes where createdBy is absent" without either a full collection scan (the
 * exact thing this change is trying to avoid) or backfilling those documents with an explicit
 * `createdBy: null` so an `EQUAL null` filter can find them.
 *
 * This script does that backfill, once. Run it after deploying the P3 change (or before — order
 * doesn't matter, the old code path also tolerates the field being present-but-null). Until it's
 * run, recipes that are missing `createdBy` entirely (as opposed to explicitly `null`) won't
 * appear in anyone's library list — this is a known, documented trade-off, not an oversight.
 *
 * Usage: npx tsx scripts/backfill-legacy-created-by.ts
 */
import { FirebaseRestService } from '../src/lib/firebase-rest.js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function backfill() {
  const serviceAccountPath = path.resolve(__dirname, '../firebase-service-account.json')
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'))
  const db = new FirebaseRestService(serviceAccount)

  console.log('Scanning recipes collection for documents missing `createdBy`...')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRecipes = (await db.getCollection('recipes')) as any[]

  const legacyRecipes = allRecipes.filter((r) => r.createdBy === undefined)

  console.log(
    `Found ${allRecipes.length} total recipes, ${legacyRecipes.length} missing createdBy.`,
  )

  if (legacyRecipes.length === 0) {
    console.log('Nothing to backfill.')
    return
  }

  let succeeded = 0
  let failed = 0

  for (const recipe of legacyRecipes) {
    try {
      await db.updateDocument('recipes', recipe.id, { createdBy: null })
      succeeded++
    } catch (e) {
      failed++
      console.error(`Failed to backfill recipe ${recipe.id}:`, e)
    }
  }

  console.log(`Backfill complete: ${succeeded} updated, ${failed} failed.`)
}

backfill().catch((e) => {
  console.error('Backfill script crashed:', e)
  process.exit(1)
})

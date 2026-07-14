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
 * Requires a local `firebase-service-account.json` (production credentials) — if you don't have
 * that, see `POST /api/admin/backfill-legacy-created-by` instead, which runs the same migration
 * from inside the deployed Worker using the credentials it already holds, triggered by an
 * authenticated admin session rather than a local key file.
 *
 * Usage: npx tsx scripts/backfill-legacy-created-by.ts
 */
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { FirebaseRestService } from '../src/lib/firebase-rest.js'
import { runLegacyCreatedByBackfill } from '../src/lib/services/backfill-legacy-created-by.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
  const serviceAccountPath = path.resolve(__dirname, '../firebase-service-account.json')
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'))
  const db = new FirebaseRestService(serviceAccount)

  console.log('Scanning recipes collection for documents missing `createdBy`...')
  const result = await runLegacyCreatedByBackfill(db)

  console.log(`Found ${result.total} total recipes, ${result.missing} missing createdBy.`)
  if (result.missing === 0) {
    console.log('Nothing to backfill.')
    return
  }
  console.log(`Backfill complete: ${result.succeeded} updated, ${result.failed} failed.`)
}

main().catch((e) => {
  console.error('Backfill script crashed:', e)
  process.exit(1)
})

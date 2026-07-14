import type { APIRoute } from 'astro'
import { db } from '../../../lib/firebase-server'
import { verifyAdmin } from '../../../lib/auth-admin'
import { runLegacyCreatedByBackfill } from '../../../lib/services/backfill-legacy-created-by'

/**
 * One-time migration for PERFORMANCE-PLAN.md P3 — see `runLegacyCreatedByBackfill` for what and
 * why. This route exists so the migration can be triggered by an authenticated admin session from
 * inside the deployed Worker (which already holds the production `FIREBASE_SERVICE_ACCOUNT`),
 * without ever needing to hand production credentials to a local script or an agent session.
 *
 * GET  → dry run: counts only, no writes.
 * POST → performs the backfill. Safe to call more than once (a no-op once nothing is missing).
 */
export const GET: APIRoute = async (context) => {
  const admin = await verifyAdmin(context.request, context)
  if (!admin) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
  }

  try {
    const result = await runLegacyCreatedByBackfill(db, { dryRun: true })
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 })
  }
}

export const POST: APIRoute = async (context) => {
  const admin = await verifyAdmin(context.request, context)
  if (!admin) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
  }

  try {
    const result = await runLegacyCreatedByBackfill(db)
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('Backfill Error', e)
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 })
  }
}

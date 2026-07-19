import type { APIRoute } from 'astro'
import { db } from '../../../lib/firebase-server'
import { verifyAdmin } from '../../../lib/auth-admin'
import type { AiErrorLogEntry } from '../../../lib/services/ai-error-log'

/** Newest-first page size for the admin errors panel — enough to spot a pattern, small enough
 * that unbounded log growth doesn't bloat the response. */
const MAX_ENTRIES = 50

export const GET: APIRoute = async (context) => {
  const { request } = context
  const admin = await verifyAdmin(request, context)

  if (!admin) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
  }

  try {
    const entries = await db.getCollection<AiErrorLogEntry>('error_logs', 'createdAt', 'DESC')
    return new Response(JSON.stringify({ success: true, errors: entries.slice(0, MAX_ENTRIES) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    // Collection doesn't exist until the first error is ever logged — that's a healthy state.
    return new Response(JSON.stringify({ success: true, errors: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const DELETE: APIRoute = async (context) => {
  const { request } = context
  const admin = await verifyAdmin(request, context)

  if (!admin) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
  }

  try {
    // No batch-delete in the REST wrapper; volumes here are small (admin-triggered cleanup of
    // an error log, not a data migration), so sequential deletes are fine.
    const entries = await db.getCollection<AiErrorLogEntry>('error_logs')
    for (const entry of entries) {
      await db.deleteDocument('error_logs', entry.id)
    }
    return new Response(JSON.stringify({ success: true, deleted: entries.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 })
  }
}

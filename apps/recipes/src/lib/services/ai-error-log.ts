import { db } from '../firebase-server'

/**
 * Persistent error log for the AI pipeline (Firestore `error_logs` collection).
 *
 * Cloudflare Pages has no persistent server logs — `console.error` output vanishes unless
 * someone happens to be running a live tail. Every AI-pipeline failure so far has had to be
 * diagnosed blind, from the outside, by reasoning about the code. This gives failures a
 * durable record (feature, message, context, timestamp) that the admin dashboard can read
 * back (`GET /api/admin/error-logs`), so "grocery generation failed for you yesterday" is a
 * lookup instead of a forensic reconstruction.
 */

export type AiFeature = 'photo-import' | 'url-import' | 'refresh' | 'enhancement' | 'grocery'

export interface AiErrorLogEntry {
  id: string
  feature: AiFeature
  message: string
  /** Free-form context — recipeId, listId, phase, source type, etc. Never include recipe
   * content or anything large; this is for correlation, not payload capture. */
  context?: Record<string, string>
  userId?: string
  createdAt: string
}

/**
 * Records an AI-pipeline failure. Fire-and-forget and guaranteed never to throw — an
 * observability write must never break, mask, or delay the failure path it's observing
 * (several of these call sites are inside `waitUntil` budgets counted in seconds).
 */
export function logAiError(
  feature: AiFeature,
  error: unknown,
  extra: { userId?: string; context?: Record<string, string> } = {},
): void {
  try {
    const id = crypto.randomUUID()
    const entry: AiErrorLogEntry = {
      id,
      feature,
      message: error instanceof Error ? error.message : String(error),
      ...(extra.context ? { context: extra.context } : {}),
      ...(extra.userId ? { userId: extra.userId } : {}),
      createdAt: new Date().toISOString(),
    }

    db.setDocument('error_logs', id, entry).catch((writeError) => {
      console.error('[AiErrorLog] Failed to persist error log:', writeError)
    })
  } catch (unexpected) {
    console.error('[AiErrorLog] Failed to build error log entry:', unexpected)
  }
}

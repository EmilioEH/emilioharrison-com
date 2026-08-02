import type { APIRoute, APIContext } from 'astro'
import { db } from '../../../lib/firebase-server'
import { getAuthUser, serverErrorResponse, badRequestResponse } from '../../../lib/api-helpers'
import type { ImportBatch, ImportJob } from '../../../lib/types'

/**
 * What the user does with one reviewed card: accept it (the recipe has already been created by
 * the normal `POST /api/recipes` path, so this only records the outcome), discard it, or send a
 * failed one back to the worker to try again.
 *
 * Accepting deliberately does NOT create the recipe here. The client saves through the same
 * endpoint every other new recipe uses, so ownership, enum clamping and the family stamp can't
 * drift between "saved from the editor" and "saved from an import".
 */

const notFound = () =>
  // 404 rather than 403 on someone else's job: don't confirm it exists.
  new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  })

export const POST: APIRoute = async (context: APIContext) => {
  const { request, params, cookies } = context

  const userId = getAuthUser(cookies)
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const jobId = params.jobId
  if (!jobId) return badRequestResponse('Missing job id')

  let body: { action?: string; savedRecipeId?: string }
  try {
    body = await request.json()
  } catch {
    return badRequestResponse('Invalid request body')
  }

  const action = body.action
  if (action !== 'accept' && action !== 'discard' && action !== 'retry') {
    return badRequestResponse('Unknown action')
  }

  try {
    const job = await db.getDocument<ImportJob>('import_jobs', jobId)
    if (!job || job.createdBy !== userId) return notFound()

    const now = new Date().toISOString()

    if (action === 'retry') {
      if (job.status !== 'error') {
        return badRequestResponse('Only a failed import can be retried.')
      }
      // Back onto the queue the worker listens to. The batch's failed count comes back down with
      // it, otherwise a retried job would be counted as failed forever.
      await db.updateDocument('import_jobs', jobId, {
        status: 'pending',
        error: null,
        parsedRecipe: null,
        updatedAt: now,
      })
      await adjustBatch(job.batchId, { failed: -1, status: 'processing' })

      return json({ success: true, status: 'pending' })
    }

    if (job.reviewState !== 'unreviewed') {
      // Idempotent: a double-tap on a flaky connection shouldn't double-count the batch.
      return json({ success: true, alreadyReviewed: true, reviewState: job.reviewState })
    }

    await db.updateDocument('import_jobs', jobId, {
      reviewState: action === 'accept' ? 'accepted' : 'discarded',
      ...(action === 'accept' && body.savedRecipeId ? { savedRecipeId: body.savedRecipeId } : {}),
      updatedAt: now,
    })
    await adjustBatch(job.batchId, { reviewedCount: 1 })

    return json({ success: true, reviewState: action === 'accept' ? 'accepted' : 'discarded' })
  } catch (error) {
    console.error(`[Import] ${action} failed for ${jobId}:`, error)
    return serverErrorResponse('Could not update this import.')
  }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Nudges a batch's counters. Deliberately read-modify-write rather than transactional: unlike the
 * worker (where three jobs finish concurrently), these are one user's deliberate taps, seconds
 * apart. Counters are clamped so a lost race can never drive one negative and strand the badge.
 */
async function adjustBatch(
  batchId: string,
  delta: { failed?: number; reviewedCount?: number; status?: ImportBatch['status'] },
): Promise<void> {
  if (!batchId) return
  try {
    const batch = await db.getDocument<ImportBatch>('import_batches', batchId)
    if (!batch) return

    await db.updateDocument('import_batches', batchId, {
      ...(delta.failed ? { failed: Math.max(0, (batch.failed ?? 0) + delta.failed) } : {}),
      ...(delta.reviewedCount
        ? {
            reviewedCount: Math.min(
              batch.total ?? 0,
              (batch.reviewedCount ?? 0) + delta.reviewedCount,
            ),
          }
        : {}),
      ...(delta.status ? { status: delta.status } : {}),
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    // The user's action already landed on the job; a counter that's briefly out of step is not
    // worth failing their tap over.
    console.warn(`[Import] Could not adjust batch ${batchId}:`, error)
  }
}

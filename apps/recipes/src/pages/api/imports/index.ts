import type { APIRoute, APIContext } from 'astro'
import { db } from '../../../lib/firebase-server'
import { getAuthUser, serverErrorResponse, badRequestResponse } from '../../../lib/api-helpers'
import { rateLimit } from '../../../lib/rate-limit'
import {
  validatePhotoGroups,
  summarizeImportJobs,
  sortJobsForReview,
  MAX_BATCHES_PER_HOUR,
  BATCH_RATE_WINDOW_SECONDS,
} from '../../../lib/services/import-batches'
import type { ImportBatch, ImportJob } from '../../../lib/types'

/**
 * Bulk photo import: enqueue a batch, and read back what the VM worker has done with it.
 *
 * No AI call happens here. This endpoint only writes `pending` docs and returns — the worker
 * claims them, parses the photos, and writes the results back (see BULK-PHOTO-IMPORT-PLAN.md).
 * That indirection is the whole feature: phone browsers cancel in-flight fetches when the user
 * switches apps, and a fifteen-photo batch takes minutes.
 *
 * Reads go through here rather than a client Firestore subscription because `firestore.rules`
 * denies everything except `grocery_lists` — the app is otherwise API-first, and this keeps it so.
 */

const unauthorized = () =>
  new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })

export const POST: APIRoute = async (context: APIContext) => {
  const { request, locals, cookies } = context

  const userId = getAuthUser(cookies)
  if (!userId) return unauthorized()

  let body: { groups?: unknown }
  try {
    body = await request.json()
  } catch {
    return badRequestResponse('Invalid request body')
  }

  const validated = validatePhotoGroups(body.groups, userId)
  if (!validated.ok) return badRequestResponse(validated.error)
  const { groups } = validated

  // The per-photo limit on /api/parse-recipe never sees this path, so without a ceiling here bulk
  // import would have no spend limit at all. Counted per batch, not per photo, so one sitting of
  // fifteen still works.
  const kv = locals?.runtime?.env?.SESSION
  const { limited } = await rateLimit(
    kv,
    `import-batch:${userId}`,
    MAX_BATCHES_PER_HOUR,
    BATCH_RATE_WINDOW_SECONDS,
  )
  if (limited) {
    return new Response(
      JSON.stringify({ error: 'That is a lot of importing. Please try again a bit later.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const batchId = crypto.randomUUID()
  const now = new Date().toISOString()

  try {
    // The batch goes in FIRST: the worker starts on a job the moment it appears, and its
    // completion bumps the batch's counters — which have to already exist to be bumped.
    const batch: ImportBatch = {
      id: batchId,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
      status: 'pending',
      total: groups.length,
      completed: 0,
      failed: 0,
      reviewedCount: 0,
    }
    await db.createDocument('import_batches', batchId, batch)

    const jobIds: string[] = []
    for (const photoKeys of groups) {
      const jobId = crypto.randomUUID()
      const job: ImportJob = {
        id: jobId,
        batchId,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
        photoKeys,
        status: 'pending',
        parsedRecipe: null,
        reviewState: 'unreviewed',
      }
      await db.createDocument('import_jobs', jobId, job)
      jobIds.push(jobId)
    }

    return new Response(JSON.stringify({ success: true, batchId, jobIds, total: groups.length }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[Import] Failed to enqueue batch:', error)
    return serverErrorResponse('Could not start the import. Please try again.')
  }
}

/**
 * Everything the add-button badge and the review screen need: the caller's own jobs that are
 * still outstanding, plus a count summary. Accepted/discarded jobs are left out — once a card is
 * dealt with it stops being the user's problem.
 */
export const GET: APIRoute = async ({ cookies }) => {
  const userId = getAuthUser(cookies)
  if (!userId) return unauthorized()

  try {
    const all = await db.runQuery<ImportJob>('import_jobs', {
      field: 'createdBy',
      op: 'EQUAL',
      value: userId,
    })

    const outstanding = sortJobsForReview(all.filter((job) => job.reviewState === 'unreviewed'))

    return new Response(
      JSON.stringify({ jobs: outstanding, summary: summarizeImportJobs(outstanding) }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      },
    )
  } catch (error) {
    console.error('[Import] Failed to read jobs:', error)
    return serverErrorResponse('Could not load your imports.')
  }
}

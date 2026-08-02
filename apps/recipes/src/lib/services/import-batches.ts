import type { ImportJob } from '../types'

/**
 * Server-side rules for bulk photo import: what a submitted batch may contain, and how a set of
 * jobs is summarised for the badge and the review screen. Pure — no Firestore, no Astro — so the
 * limits and the "is the worker even alive" judgement are unit-testable and live in one place
 * rather than being re-derived in each endpoint.
 *
 * See BULK-PHOTO-IMPORT-PLAN.md.
 */

/** Designed-for batch size. Emilio's answer to "how many photos at a time" was "a dozen or so —
 * up to 15"; this is the ceiling, not a target. */
export const MAX_BATCH_PHOTOS = 15

/** Pages in one manually grouped recipe. A spread is two; four is generous headroom for a recipe
 * that runs over a page turn, and stops a "group" being used to smuggle a whole batch. */
export const MAX_GROUP_PHOTOS = 4

/**
 * Batches per hour per user. The per-photo limit on `/api/parse-recipe` is enforced in that route
 * and the worker path bypasses it entirely, so without this, bulk import would have no ceiling at
 * all. At roughly $0.001 a photo, six 15-photo batches is about nine cents an hour — this exists
 * to stop a bug looping forever, not to ration ordinary use, so it errs generous.
 */
export const MAX_BATCHES_PER_HOUR = 6
export const BATCH_RATE_WINDOW_SECONDS = 60 * 60

/**
 * How long a job may sit `pending` before we tell the user the import service looks offline.
 * The worker claims within seconds when it's up; the reaper only rescues jobs that were claimed
 * and then stalled, so a worker that never claims at all is invisible without this. Generous
 * enough to cover a restart (systemd restarts in 5s) plus a full concurrency queue.
 */
export const PENDING_STALE_MS = 3 * 60_000

/** An upload key as `POST /api/uploads` mints it: `{userId}-{timestamp}-{uuid}.{ext}`. */
export function isOwnedPhotoKey(key: unknown, userId: string): key is string {
  if (typeof key !== 'string' || key.length === 0 || key.length > 200) return false
  // No path traversal or nesting: the worker hands this straight to Storage as an object name.
  if (key.includes('/') || key.includes('\\') || key.includes('..')) return false
  // The uploader stamps the owner into the key, so this is a real authorization check and not
  // just a format check — it stops a caller queueing a job that reads someone else's photo.
  return key.startsWith(`${userId}-`)
}

export type ValidatedGroups = { ok: true; groups: string[][] } | { ok: false; error: string }

/**
 * Validates the submitted photo groups: one group per recipe, in page order. Rejects rather than
 * silently trimming — a user who picked 20 photos should be told, not quietly given 15.
 */
export function validatePhotoGroups(input: unknown, userId: string): ValidatedGroups {
  if (!Array.isArray(input) || input.length === 0) {
    return { ok: false, error: 'Pick at least one photo to import.' }
  }

  const groups: string[][] = []
  let photoCount = 0

  for (const group of input) {
    const keys = Array.isArray(group) ? group : [group]
    if (keys.length === 0) {
      return { ok: false, error: 'One of these recipes has no photo attached.' }
    }
    if (keys.length > MAX_GROUP_PHOTOS) {
      return { ok: false, error: `A single recipe can span at most ${MAX_GROUP_PHOTOS} photos.` }
    }
    if (!keys.every((key) => isOwnedPhotoKey(key, userId))) {
      return {
        ok: false,
        error: 'One of these photos could not be recognised. Please re-upload it.',
      }
    }
    photoCount += keys.length
    groups.push(keys as string[])
  }

  if (photoCount > MAX_BATCH_PHOTOS) {
    return { ok: false, error: `You can import up to ${MAX_BATCH_PHOTOS} photos at once.` }
  }

  return { ok: true, groups }
}

export interface ImportSummary {
  /** Finished, parsed, and still waiting for the user — this is the badge. */
  needsReview: number
  /** Still being worked on (queued or mid-parse). */
  inProgress: number
  /** Finished with an error and not yet dealt with. */
  failed: number
  /**
   * A job has been sitting `pending` well past the point where a healthy worker would have
   * claimed it. The UI must say so: background enhancement quietly pausing was tolerable,
   * imports silently never happening is not.
   */
  serviceOffline: boolean
}

/** True once a job is finished and the user hasn't dealt with it yet. */
export function needsReview(job: Pick<ImportJob, 'status' | 'reviewState'>): boolean {
  return job.status === 'complete' && job.reviewState === 'unreviewed'
}

export function summarizeImportJobs(jobs: ImportJob[], now: number = Date.now()): ImportSummary {
  let review = 0
  let inProgress = 0
  let failed = 0
  let serviceOffline = false

  for (const job of jobs) {
    if (job.reviewState !== 'unreviewed') continue

    if (needsReview(job)) review++
    else if (job.status === 'error') failed++
    else {
      inProgress++
      if (job.status === 'pending' && now - Date.parse(job.createdAt) > PENDING_STALE_MS) {
        serviceOffline = true
      }
    }
  }

  return { needsReview: review, inProgress, failed, serviceOffline }
}

/** Newest first — the batch you just submitted is the one you came back for. */
export function sortJobsForReview(jobs: ImportJob[]): ImportJob[] {
  return [...jobs].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
}

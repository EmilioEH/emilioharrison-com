import { describe, it, expect } from 'vitest'
import {
  isOwnedPhotoKey,
  validatePhotoGroups,
  summarizeImportJobs,
  sortJobsForReview,
  needsReview,
  MAX_BATCH_PHOTOS,
  MAX_GROUP_PHOTOS,
  PENDING_STALE_MS,
  estimateSecondsRemaining,
  describeTimeRemaining,
} from './import-batches'
import type { ImportJob } from '../types'

const USER = 'Emilio'

/** Narrow the validation result, failing the test loudly if it went the other way. */
function expectGroups(result: ReturnType<typeof validatePhotoGroups>): string[][] {
  if (!result.ok) throw new Error(`expected valid groups, got: ${result.error}`)
  return result.groups
}
function expectError(result: ReturnType<typeof validatePhotoGroups>): string {
  if (result.ok) throw new Error('expected a validation error, got valid groups')
  return result.error
}
const key = (n: number) => `${USER}-17672653${n}-FED457BE-6656-4B04-8DB6-BFC802186FE7.jpeg`

function job(overrides: Partial<ImportJob> = {}): ImportJob {
  return {
    id: 'j1',
    batchId: 'b1',
    createdBy: USER,
    createdAt: new Date().toISOString(),
    photoKeys: [key(1)],
    status: 'complete',
    parsedRecipe: { title: 'Empanadas' },
    reviewState: 'unreviewed',
    ...overrides,
  }
}

describe('isOwnedPhotoKey', () => {
  it('accepts a key the uploader minted for this user', () => {
    expect(isOwnedPhotoKey(key(1), USER)).toBe(true)
  })

  it("rejects another user's photo — the uploader stamps the owner into the key", () => {
    // Not a formatting nicety: the worker hands this key straight to Storage, so without this
    // check a caller could queue a job that reads someone else's photo.
    expect(isOwnedPhotoKey('SomeoneElse-123-abc.jpeg', USER)).toBe(false)
  })

  it('rejects path traversal and nested keys', () => {
    expect(isOwnedPhotoKey(`${USER}-../../etc/passwd`, USER)).toBe(false)
    expect(isOwnedPhotoKey(`${USER}-a/b.jpeg`, USER)).toBe(false)
    expect(isOwnedPhotoKey(`${USER}-a\\b.jpeg`, USER)).toBe(false)
  })

  it('rejects non-strings and absurd lengths', () => {
    expect(isOwnedPhotoKey(undefined, USER)).toBe(false)
    expect(isOwnedPhotoKey(42, USER)).toBe(false)
    expect(isOwnedPhotoKey(`${USER}-${'x'.repeat(300)}`, USER)).toBe(false)
  })
})

describe('validatePhotoGroups', () => {
  it('accepts one group per recipe', () => {
    const groups = expectGroups(validatePhotoGroups([[key(1)], [key(2), key(3)]], USER))
    expect(groups).toEqual([[key(1)], [key(2), key(3)]])
  })

  it('accepts a bare key as a one-photo group', () => {
    expect(expectGroups(validatePhotoGroups([key(1)], USER))).toEqual([[key(1)]])
  })

  it('refuses an empty submission', () => {
    expect(expectError(validatePhotoGroups([], USER))).toBeTruthy()
    expect(expectError(validatePhotoGroups(undefined, USER))).toBeTruthy()
  })

  it('refuses more than the batch ceiling rather than silently trimming', () => {
    // A user who picked 20 photos should be told, not quietly given 15.
    const groups = Array.from({ length: MAX_BATCH_PHOTOS + 1 }, (_, i) => [key(i)])
    expect(expectError(validatePhotoGroups(groups, USER))).toContain(String(MAX_BATCH_PHOTOS))
  })

  it('counts photos, not groups, against the ceiling', () => {
    // Five groups of three is fifteen photos — at the limit, not under it.
    const groups = Array.from({ length: 5 }, (_, i) => [key(i), key(i + 20), key(i + 40)])
    expect(expectGroups(validatePhotoGroups(groups, USER))).toHaveLength(5)
    expect(expectError(validatePhotoGroups([...groups, [key(99)]], USER))).toBeTruthy()
  })

  it('caps how many pages one recipe can span', () => {
    const tooMany = Array.from({ length: MAX_GROUP_PHOTOS + 1 }, (_, i) => key(i))
    expect(expectError(validatePhotoGroups([tooMany], USER))).toContain(String(MAX_GROUP_PHOTOS))
  })

  it("refuses a batch containing anyone else's photo", () => {
    expect(expectError(validatePhotoGroups([[key(1)], ['Someone-1-x.jpeg']], USER))).toBeTruthy()
  })
})

describe('summarizeImportJobs', () => {
  it('counts finished-but-unreviewed jobs — this is the badge', () => {
    const jobs = [
      job(),
      job({ id: 'j2' }),
      job({ id: 'j3', status: 'processing', parsedRecipe: null }),
      job({ id: 'j4', status: 'error', error: 'nope', parsedRecipe: null }),
    ]

    expect(summarizeImportJobs(jobs)).toMatchObject({
      needsReview: 2,
      inProgress: 1,
      failed: 1,
      serviceOffline: false,
    })
  })

  it('ignores jobs the user has already dealt with', () => {
    const jobs = [job({ reviewState: 'accepted' }), job({ id: 'j2', reviewState: 'discarded' })]
    expect(summarizeImportJobs(jobs)).toMatchObject({ needsReview: 0, inProgress: 0, failed: 0 })
  })

  it('flags the import service as offline when a job sits pending too long', () => {
    // The reaper only rescues jobs that were claimed and stalled. A worker that never claims at
    // all is invisible without this — and imports silently never happening is not acceptable.
    const stale = new Date(Date.now() - PENDING_STALE_MS - 1000).toISOString()
    const jobs = [job({ status: 'pending', parsedRecipe: null, createdAt: stale })]

    expect(summarizeImportJobs(jobs).serviceOffline).toBe(true)
  })

  it('does not cry offline for a job queued moments ago', () => {
    const jobs = [job({ status: 'pending', parsedRecipe: null })]
    expect(summarizeImportJobs(jobs).serviceOffline).toBe(false)
  })

  it('does not cry offline for a job that is genuinely being worked on', () => {
    // `processing` means the worker claimed it — slow is not offline. The reaper handles stalls.
    const old = new Date(Date.now() - 10 * PENDING_STALE_MS).toISOString()
    const jobs = [job({ status: 'processing', parsedRecipe: null, createdAt: old })]
    expect(summarizeImportJobs(jobs).serviceOffline).toBe(false)
  })
})

describe('needsReview / sortJobsForReview', () => {
  it('is true only for a finished, undealt-with job', () => {
    expect(needsReview({ status: 'complete', reviewState: 'unreviewed' })).toBe(true)
    expect(needsReview({ status: 'complete', reviewState: 'accepted' })).toBe(false)
    expect(needsReview({ status: 'error', reviewState: 'unreviewed' })).toBe(false)
  })

  it('puts the newest batch first — that is what the user came back for', () => {
    const older = job({ id: 'old', createdAt: '2026-08-01T10:00:00.000Z' })
    const newer = job({ id: 'new', createdAt: '2026-08-02T10:00:00.000Z' })

    expect(sortJobsForReview([older, newer]).map((j) => j.id)).toEqual(['new', 'old'])
  })
})

describe('time estimates', () => {
  it('is one round of work for anything up to the worker concurrency', () => {
    // Three at a time, so one, two or three recipes all take one pass.
    expect(estimateSecondsRemaining(1)).toBe(30)
    expect(estimateSecondsRemaining(3)).toBe(30)
  })

  it('scales by rounds, not by recipe', () => {
    expect(estimateSecondsRemaining(4)).toBe(60)
    expect(estimateSecondsRemaining(15)).toBe(150)
  })

  it('is nothing when there is nothing left', () => {
    expect(estimateSecondsRemaining(0)).toBe(0)
    expect(describeTimeRemaining(0)).toBe('')
  })

  it('describes the wait coarsely — a countdown would invite watching it', () => {
    expect(describeTimeRemaining(1)).toBe('about a minute')
    expect(describeTimeRemaining(3)).toBe('about a minute')
    expect(describeTimeRemaining(15)).toBe('about 3 minutes')
  })
})

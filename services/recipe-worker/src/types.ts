import type { GoogleGenAI } from '@google/genai'
import type OpenAI from 'openai'
import type { Recipe } from '../../../apps/recipes/src/lib/types'

export type { Recipe }
export type { GoogleGenAI }
export type { OpenAI }

/**
 * The Firestore operations the jobs need, as an interface so the orchestration in jobs.ts can be
 * unit-tested against an in-memory fake — the real implementation (firestore-store.ts) wraps
 * firebase-admin with transactional claims.
 *
 * "Claim" is transactional: it flips a `pending` doc to `processing` and returns its payload only
 * if it was still `pending` at read time, so two workers (or a retrying listener) can't both run
 * the same job. A `null` return means someone/something else already claimed it — skip.
 */
export interface WorkerStore {
  // --- Grocery (`grocery_lists` docs; queue field: `status`) ---
  /** Returns the input recipes stored on the pending doc (`inputRecipes`), or null if not
   * claimable. The Cloudflare cutover writes `inputRecipes` onto the pending doc since the async
   * worker — unlike the original request — doesn't otherwise have them. */
  claimGrocery(listId: string): Promise<Recipe[] | null>
  writeGroceryProgress(listId: string, progress: number, message: string): Promise<void>
  completeGrocery(listId: string, ingredients: unknown[]): Promise<void>
  failGrocery(listId: string, message: string): Promise<void>

  // --- Photo import (`import_jobs` docs; queue field: `status`) ---
  /** Returns the job's photo keys and owner, or null if not claimable. */
  claimImport(jobId: string): Promise<ImportJobPayload | null>
  /** Stores the parsed recipe ON THE JOB — never in `recipes`. A recipe is created only when the
   * user reviews and accepts it, which is what keeps unreviewed transcription out of the
   * library. Also bumps the batch's counters, which drive the badge. */
  completeImport(jobId: string, result: ImportJobResult): Promise<void>
  failImport(jobId: string, message: string): Promise<void>

  // --- Reaper: flip docs stuck in `processing` past the deadline to `error`. Returns count. ---
  reapStuckGrocery(deadlineMs: number, now: number): Promise<number>
  reapStuckImports(deadlineMs: number, now: number): Promise<number>
}

/**
 * What a pending `import_jobs` doc carries into the worker. Written by the Cloudflare enqueue
 * endpoint; the worker only ever reads these three fields.
 */
export interface ImportJobPayload {
  batchId: string
  createdBy: string
  /** Storage object keys, as returned by `POST /api/uploads`. More than one only for a manually
   * grouped multi-page spread, in page order. */
  photoKeys: string[]
}

/** What the worker writes back on success. */
export interface ImportJobResult {
  /** The model's structured recipe fields — no id, createdBy or timestamps yet. */
  parsedRecipe: Record<string, unknown>
  /** Set when the page's instructions never transcribed but the ingredients did. */
  partialFailure?: 'instructions'
}

/** One photo's bytes, as `parse-photo-core` wants them. */
export interface PhotoSource {
  mimeType: string
  data: string
}

/** Reads photo bytes out of Firebase Storage by object key, in the order given. */
export type FetchPhotos = (keys: string[]) => Promise<PhotoSource[]>

/** Matches `parsePhotosToRecipe` in apps/recipes/.../parse-photo-core.ts. */
export type ParsePhotos = (
  client: OpenAI,
  photos: PhotoSource[],
  opts: { externalSignal?: AbortSignal },
) => Promise<Record<string, unknown>>

/** Matches `computeGroceryList` in apps/recipes/.../grocery-core.ts. */
export type ComputeGrocery = (
  gemini: GoogleGenAI,
  recipes: Recipe[],
  opts: {
    timeoutMs: number
    onProgress?: (update: { progress: number; message: string }) => void | Promise<void>
    externalSignal?: AbortSignal
  },
) => Promise<unknown[]>

/** Outcome of attempting one job — used only for logging/metrics; never throws to the caller. */
export type JobOutcome = 'done' | 'skipped' | 'failed'

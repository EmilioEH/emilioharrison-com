import type {
  GoogleGenAI,
  OpenAI,
  WorkerStore,
  ComputeGrocery,
  FetchPhotos,
  ParsePhotos,
  JobOutcome,
  ShoppableIngredient,
} from './types'
import type { LogAiError } from './ai-error-log'

/**
 * Runs one grocery-generation job end-to-end for a `grocery_lists` doc id. Progress updates
 * stream to Firestore via the store so the client's existing subscription shows granular status.
 */
export async function runGroceryForDoc(
  deps: {
    store: WorkerStore
    gemini: GoogleGenAI
    jobTimeoutMs: number
    computeGrocery: ComputeGrocery
    logAiError: LogAiError
  },
  listId: string,
): Promise<JobOutcome> {
  const job = await deps.store.claimGrocery(listId).catch((e) => {
    console.error(`[worker] claimGrocery(${listId}) failed:`, e)
    return null
  })
  if (!job) return 'skipped'

  try {
    const ingredients = await deps.computeGrocery(deps.gemini, job.recipes, {
      timeoutMs: deps.jobTimeoutMs,
      onProgress: (update) =>
        deps.store
          .writeGroceryProgress(listId, update.progress, update.message)
          .catch((e) => console.warn(`[worker] grocery progress write failed (${listId}):`, e)),
    })
    // The core returns `unknown[]` — the model's output, shaped by the response schema but not
    // validated element-wise. The store treats it as ingredients, exactly as it did before.
    await deps.store.completeGrocery(
      listId,
      ingredients as ShoppableIngredient[],
      job.sourceRecipeIds,
    )
    console.log(`[worker] grocery complete: ${listId} (${ingredients.length} items)`)
    return 'done'
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate grocery list'
    console.error(`[worker] grocery failed: ${listId} — ${message}`)
    deps.logAiError('grocery', error, { context: { listId } })
    await deps.store
      .failGrocery(listId, message)
      .catch((e) => console.error(`[worker] failGrocery(${listId}) write failed:`, e))
    return 'failed'
  }
}

/**
 * One attempt plus one retry. Per-job failure is normal here rather than exceptional — the spike
 * that motivated this feature watched structuring fail on 2 of 3 attempts for one dense recipe —
 * and at roughly $0.001 a photo a second attempt is far cheaper than making the user re-photograph
 * a page. This is a safety net on top of the per-phase transient retry the parse core already
 * does, not a cure: a photo that genuinely can't be read fails twice and lands on its card.
 */
const IMPORT_ATTEMPTS = 2

/**
 * Runs one photo-import job end-to-end for an `import_jobs` doc id: claim it, read its photos out
 * of Firebase Storage, run the shared parse pipeline, and store the result **on the job doc**.
 *
 * Nothing is written to `recipes` — a recipe is created only when the user reviews and accepts
 * one. That is what keeps unreviewed transcription out of the library, which matters more now
 * that background enhancement is gone and nothing else cleans up after a bad read.
 *
 * Never throws: every failure path ends in a persisted `error` on the job, because the user picked
 * these photos deliberately and has to be able to account for all of them.
 */
export async function runImportForDoc(
  deps: {
    store: WorkerStore
    openai: OpenAI
    fetchPhotos: FetchPhotos
    parsePhotos: ParsePhotos
    importJobTimeoutMs: number
    logAiError: LogAiError
  },
  jobId: string,
): Promise<JobOutcome> {
  const job = await deps.store.claimImport(jobId).catch((e) => {
    console.error(`[worker] claimImport(${jobId}) failed:`, e)
    return null
  })
  if (!job) return 'skipped'

  // One deadline for the whole job, retry included — not one per attempt. Two 5-minute attempts
  // could outlive the reaper's 10-minute abandonment deadline, and a job the reaper has already
  // failed must not still be running.
  const budget = AbortSignal.timeout(deps.importJobTimeoutMs)

  try {
    const photos = await deps.fetchPhotos(job.photoKeys)

    let lastError: unknown
    for (let attempt = 1; attempt <= IMPORT_ATTEMPTS; attempt++) {
      try {
        const parsed = await deps.parsePhotos(deps.openai, photos, {
          externalSignal: budget,
        })

        // `partialFailure` is a signal about the parse, not a recipe field — lift it onto the job
        // doc so it can't ride along into the saved recipe when the user accepts the card.
        const { partialFailure, ...parsedRecipe } = parsed
        await deps.store.completeImport(jobId, {
          parsedRecipe,
          ...(partialFailure === 'instructions' ? { partialFailure: 'instructions' as const } : {}),
        })

        console.log(
          `[worker] import complete: ${jobId} (${job.photoKeys.length} photo(s), attempt ${attempt})`,
        )
        return 'done'
      } catch (error) {
        lastError = error
        // Out of budget: a second attempt would abort immediately, so stop and report the real
        // failure rather than burying it under a spurious timeout.
        if (budget.aborted) break
        if (attempt < IMPORT_ATTEMPTS) {
          console.warn(
            `[worker] import attempt ${attempt} failed (${jobId}): ` +
              `${error instanceof Error ? error.message : error} — retrying once`,
          )
        }
      }
    }
    throw lastError
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to import this photo'
    console.error(`[worker] import failed: ${jobId} — ${message}`)
    deps.logAiError('photo-import', error, {
      userId: job.createdBy,
      context: {
        jobId,
        batchId: job.batchId,
        photos: String(job.photoKeys.length),
      },
    })
    await deps.store
      .failImport(jobId, message)
      .catch((e) => console.error(`[worker] failImport(${jobId}) write failed:`, e))
    return 'failed'
  }
}

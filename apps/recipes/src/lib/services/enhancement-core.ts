import type { GoogleGenAI } from '@google/genai'
import { executeAiParse } from './ai-parser'
import { mergeAiRecipeUpdate, snapshotRecipe } from './recipe-merge'
import type { Recipe } from '../types'

// Provider-agnostic core of the "Kenji-style" total reparse (background Enhancement / AI
// Refresh). Deliberately free of Cloudflare/Astro/Firestore imports so both the Cloudflare
// orchestrator (recipe-enhancement-job.ts) and the self-hosted VM worker can call it — see
// BACKGROUND-JOBS-VM-PLAN.md. It takes an already-built Gemini client and *returns* the enhanced
// recipe (or throws); persisting status/result to Firestore is the caller's job, because that
// half differs per environment (REST client on Cloudflare, firebase-admin on the VM).

/**
 * Thrown when a reparse comes back with nothing that would actually enhance the recipe. Distinct
 * from `UnusableAiResultError` (recipe-merge): that one means the result was too sparse to merge
 * *at all*; this one means the merge would have succeeded but changed nothing meaningful. Callers
 * map it to a persisted `error` status so the user sees a real failure rather than a recipe
 * silently marked "enhanced" while looking exactly as it did before.
 */
export class EnhancementProducedNothingError extends Error {}

/** Whether a reparse result carries the enhanced-mode step structure that is the whole point of
 * this pass. `structuredSteps` is the load-bearing field — the Kenji macro-steps, their titles,
 * bolded verbs and tips all live on it. */
function hasEnhancedStructure(result: unknown): boolean {
  const steps = (result as { structuredSteps?: unknown } | null | undefined)?.structuredSteps
  return Array.isArray(steps) && steps.length > 0
}

/** Errors worth a second attempt: the call never really got going, so nothing about this recipe
 * makes it doomed. Deliberately narrow — a malformed/unusable *response* is not retried here. */
function isTransientAiError(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  return /abort|timed? ?out|timeout|429|RESOURCE_EXHAUSTED|503|UNAVAILABLE|ECONNRESET|socket hang up/i.test(
    text,
  )
}

/**
 * Minimum per-attempt budget before a transient failure is worth retrying.
 *
 * Background Enhancement on Cloudflare runs under `ctx.waitUntil`, which is killed ~30s after the
 * response is sent, so that path deliberately caps each AI call at ~25s (see
 * recipe-enhancement-job.ts). Retrying there would push a hung attempt past the ceiling and the
 * error-status write would never land — the exact failure that shipped once before. The VM worker
 * has no such ceiling (120s per call), so it gets the retry and Cloudflare doesn't.
 */
const MIN_TIMEOUT_FOR_RETRY_MS = 60_000

/**
 * Runs the reparse, retrying once if the first attempt fails in a way that suggests the request
 * simply never landed.
 *
 * Motivated by production timings: enhancement calls are bimodal — a healthy one returns in about
 * 6 seconds, while failures hang and are killed at exactly the 120s timeout, three times in one
 * 15-minute window. A hung request tells us nothing about the recipe, and the fast success rate
 * means a second attempt is very likely to land.
 */
async function runParseWithTransientRetry(
  runParse: () => Promise<unknown>,
  timeoutMs: number | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  try {
    return await runParse()
  } catch (error) {
    const budget = timeoutMs ?? 0
    if (!isTransientAiError(error) || budget < MIN_TIMEOUT_FOR_RETRY_MS) throw error
    console.warn(
      `[Enhance] transient failure (${error instanceof Error ? error.message : error}) — retrying once`,
    )
    return runParse()
  }
}

/**
 * Re-derives the enhanced recipe from its best available source (original URL, then original
 * photo, then a text reconstruction of the saved recipe), merges the AI result onto the
 * original with the usual plausibility guards, and snapshots the pre-merge state for one-tap
 * restore.
 *
 * Returns a recipe object ready to persist (with `enhancementStatus: 'complete'`,
 * `enhancementError: undefined`, and `previousVersion` set). Throws `UnusableAiResultError`
 * (from recipe-merge) when the AI result is too sparse to merge, or a generic error on an
 * upstream/timeout failure — the caller maps those to a persisted `error` status.
 */
export async function computeEnhancedRecipe(
  gemini: GoogleGenAI,
  recipe: Recipe,
  origin: string,
  opts: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<Recipe> {
  const { signal, timeoutMs } = opts
  const commonParams = { style: 'enhanced' as const }

  const runParse = async () => {
    if (recipe.sourceUrl) {
      console.log(`[Enhance] Total Reparse via URL: ${recipe.sourceUrl}`)
      return executeAiParse(
        gemini,
        { ...commonParams, url: recipe.sourceUrl },
        origin,
        signal,
        timeoutMs,
      )
    }
    if (recipe.sourceImage) {
      console.log(`[Enhance] Total Reparse via Image`)
      return executeAiParse(
        gemini,
        { ...commonParams, image: recipe.sourceImage },
        origin,
        signal,
        timeoutMs,
      )
    }
    console.log(`[Enhance] Text-based enhancement fallback`)
    const textRep = `
Title: ${recipe.title}
Ingredients:
${recipe.ingredients.map((i) => `${i.amount} ${i.name}`).join('\n')}
Steps:
${recipe.steps.join('\n')}
    `.trim()
    return executeAiParse(gemini, { ...commonParams, text: textRep }, origin, signal, timeoutMs)
  }

  let newData = await runParseWithTransientRetry(runParse, timeoutMs)

  // A reparse that comes back with no `structuredSteps` isn't an enhancement — it's a no-op.
  // mergeAiRecipeUpdate deliberately refuses to overwrite a populated array with an empty one
  // (that guard prevents real data loss), so such a result leaves the recipe byte-for-byte
  // unchanged while this function still stamps `enhancementStatus: 'complete'`. Observed in
  // production: a photo-imported recipe whose post-"enhancement" structuredSteps were identical
  // to the importer's own output — no macro-steps, no step titles, no bolded verbs, no
  // ingredient/step groups — which reads to the user as "the Kenji styling just doesn't work".
  // The model is inconsistent here rather than incapable (the same call succeeds on retry), so
  // try once more, then fail loudly instead of reporting a success that didn't happen.
  if (!hasEnhancedStructure(newData)) {
    console.warn('[Enhance] Reparse returned no structuredSteps — retrying once')
    newData = await runParse()
  }

  // Merge first: a result too sparse to merge at all is a different (and more specific) failure,
  // and `mergeAiRecipeUpdate` owns that diagnosis via UnusableAiResultError.
  const merged = mergeAiRecipeUpdate(recipe, newData)

  if (!hasEnhancedStructure(newData)) {
    throw new EnhancementProducedNothingError(
      'The AI returned no enhanced steps for this recipe, so it was left unchanged. Please try again.',
    )
  }

  const previousVersion = snapshotRecipe(recipe, 'enhance')
  return {
    ...merged,
    previousVersion,
    enhancementStatus: 'complete' as const,
    enhancementError: undefined,
  }
}

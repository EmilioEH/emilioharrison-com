/**
 * Shared "is this worth retrying" policy for AI provider calls (OpenRouter, Gemini).
 *
 * Before this module existed, the same error-text heuristic and timeout gate were reinvented
 * per call site: enhancement-core.ts had its own `isTransientAiError`/retry wrapper, while photo
 * OCR (parse-recipe.ts), the URL/JSON-LD/Reddit/text import path, and grocery generation had none
 * at all — despite the exact same "the call never really got going" failure mode showing up in
 * production on all of them.
 *
 * NOTE: must stay free of Cloudflare/Astro-only imports — this is reachable from
 * enhancement-core.ts and grocery-core.ts, which the self-hosted VM worker imports and runs in
 * plain Node.
 */

/**
 * Errors worth a second attempt: the call never really got going, so nothing about this specific
 * input makes it doomed. Deliberately narrow — a malformed/unusable *response* (bad JSON, an
 * empty result) is not a transient error and is not retried here; callers that care about that
 * failure mode (e.g. grocery-core's empty-ingredients retry) handle it themselves.
 */
export function isTransientAiError(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  return /abort|timed? ?out|timeout|429|RESOURCE_EXHAUSTED|503|UNAVAILABLE|ECONNRESET|socket hang up/i.test(
    text,
  )
}

/**
 * Minimum per-attempt budget before a transient failure is worth retrying.
 *
 * Background jobs (Enhancement, grocery generation) can run under Cloudflare's `ctx.waitUntil`,
 * which is killed ~30s after the response is sent — those paths deliberately cap each AI call at
 * ~25s, and retrying there would push a hung attempt past the ceiling with the error-status write
 * never landing (the exact failure that shipped once before). The VM worker (120s/call) and
 * in-request calls (photo import, AI Refresh — the client holds the connection, no ceiling) both
 * pass a longer per-attempt budget and get the retry.
 */
export const MIN_TIMEOUT_FOR_RETRY_MS = 60_000

/**
 * Runs `runAttempt`, retrying once if it fails in a way that suggests the request simply never
 * landed (see `isTransientAiError`) and the per-attempt budget (`timeoutMs`) leaves room for a
 * second try without risking a hard external deadline.
 *
 * Motivated by production timings: these calls are bimodal — a healthy one returns quickly, while
 * failures hang and are killed at exactly the configured timeout. A hung request tells us nothing
 * about the input, so a second attempt is very likely to land.
 */
export async function withTransientRetry<T>(
  runAttempt: () => Promise<T>,
  timeoutMs: number | undefined,
  label: string,
): Promise<T> {
  try {
    return await runAttempt()
  } catch (error) {
    const budget = timeoutMs ?? 0
    if (!isTransientAiError(error) || budget < MIN_TIMEOUT_FOR_RETRY_MS) throw error
    console.warn(
      `[${label}] transient failure (${error instanceof Error ? error.message : error}) — retrying once`,
    )
    return runAttempt()
  }
}

/**
 * Bounds an AI provider call to a maximum duration, and lets an external signal (e.g. the
 * incoming request being aborted by the client) cancel it early too. Both OpenAI and
 * `@google/genai` accept an `AbortSignal` on individual calls, so this actually cancels the
 * upstream HTTP request rather than merely abandoning a promise.
 *
 * Without this, a hung upstream call blocks the request (or a `waitUntil`-backed background
 * job) indefinitely, and cancelling an import in the UI previously only aborted the client's
 * own fetch — the server kept streaming from the AI provider at full cost regardless.
 */
export function createTimeoutSignal(
  timeoutMs: number,
  externalSignal?: AbortSignal,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController()

  if (externalSignal?.aborted) {
    controller.abort(externalSignal.reason)
    return { signal: controller.signal, cleanup: () => {} }
  }

  const timer = setTimeout(() => {
    controller.abort(new Error(`AI request timed out after ${timeoutMs}ms`))
  }, timeoutMs)

  const onExternalAbort = () => controller.abort(externalSignal?.reason)
  externalSignal?.addEventListener('abort', onExternalAbort)

  const cleanup = () => {
    clearTimeout(timer)
    externalSignal?.removeEventListener('abort', onExternalAbort)
  }

  return { signal: controller.signal, cleanup }
}

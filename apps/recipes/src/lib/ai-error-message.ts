/**
 * Turns the raw reason an AI feature failed into something an error message can show.
 *
 * The Smart List banner and the recipe importer both used to say "something went wrong" no matter
 * what happened, so a signed-out session, a rate limit, a dead API key and a provider out of credit
 * all looked identical from the phone — and diagnosing any of them meant reading server logs. The
 * reason was almost always available; it just wasn't displayed.
 *
 * A few reasons are translated into plain language because the raw text says nothing useful to the
 * person holding the phone. Everything else is shown as-is, trimmed, since an unfamiliar provider
 * message is exactly what needs to be read back when something new breaks.
 */

const MAX_LENGTH = 240

/**
 * For the browser: the message to show for a failed request, or null when there is no reason.
 * Knows the failures that only the client sees — its own session refused, the connection dropped.
 */
export function describeAiError(raw: string | undefined | null): string | null {
  const text = raw?.trim()
  if (!text) return null

  if (/^unauthori[sz]ed$/i.test(text)) {
    return 'Your sign-in has expired. Log out and back in, then try again.'
  }
  // Chrome says "Failed to fetch", Safari "Load failed", Firefox "NetworkError when attempting…".
  if (/^(failed to fetch|load failed)$|networkerror/i.test(text)) {
    return "Couldn't reach the server. Check your connection and try again."
  }

  return readableErrorReason(text)
}

/**
 * The readable part of an error message, trimmed to a length that fits an error box. Safe on the
 * server too: it only reshapes the text, it never assumes who is reading it.
 *
 * Provider SDK errors embed the provider's JSON body after a status line, e.g.
 * `got status: 429 Too Many Requests. {"error":{"message":"You exceeded your quota…"}}` — the
 * inner message is the part worth reading.
 */
export function readableErrorReason(raw: string): string {
  const text = raw.trim()
  const jsonStart = text.indexOf('{')
  if (jsonStart !== -1) {
    try {
      const body = JSON.parse(text.slice(jsonStart)) as { error?: { message?: unknown } }
      const inner = body?.error?.message
      if (typeof inner === 'string' && inner.trim()) return truncate(inner.trim())
    } catch {
      // Not JSON after all — fall through and show the text as written.
    }
  }
  return truncate(text)
}

function truncate(text: string): string {
  return text.length > MAX_LENGTH ? `${text.slice(0, MAX_LENGTH - 1).trimEnd()}…` : text
}

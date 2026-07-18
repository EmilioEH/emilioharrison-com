/**
 * Minimal fixed-window rate limiter backed by the Cloudflare `SESSION` KV binding.
 *
 * Intended for low-frequency abuse-prevention (e.g. brute-forcing activation codes), not
 * precise quota accounting — KV is eventually consistent. Fails open when no KV is available
 * (local dev / tests) so it never blocks legitimate traffic in those environments.
 */
import type { KVNamespace } from '@cloudflare/workers-types'

export interface RateLimitResult {
  limited: boolean
  remaining: number
}

/**
 * Record an attempt against `key` and report whether the caller is over `limit` within a
 * rolling `windowSeconds` window.
 */
export async function rateLimit(
  kv: KVNamespace | null | undefined,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  if (!kv) return { limited: false, remaining: limit }

  let count = 0
  try {
    const current = await kv.get(key)
    count = current ? parseInt(current, 10) || 0 : 0
  } catch {
    // KV read failure → fail open rather than lock users out.
    return { limited: false, remaining: limit }
  }

  if (count >= limit) {
    return { limited: true, remaining: 0 }
  }

  try {
    await kv.put(key, String(count + 1), { expirationTtl: Math.max(60, windowSeconds) })
  } catch {
    // Best-effort; a failed write just means this attempt isn't counted.
  }

  return { limited: false, remaining: limit - count - 1 }
}

/** Best-effort client IP for rate-limit keys (Cloudflare sets `cf-connecting-ip`). */
export function clientIpFrom(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  )
}

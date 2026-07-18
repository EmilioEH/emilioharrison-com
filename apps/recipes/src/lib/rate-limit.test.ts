import { describe, it, expect, vi } from 'vitest'
import { rateLimit, clientIpFrom } from './rate-limit'
import type { KVNamespace } from '@cloudflare/workers-types'

/** In-memory KV stub sufficient for the limiter (get/put only). */
function fakeKv(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial))
  return {
    get: vi.fn(async (k: string) => store.get(k) ?? null),
    put: vi.fn(async (k: string, v: string) => {
      store.set(k, v)
    }),
  } as unknown as KVNamespace
}

describe('rateLimit', () => {
  it('fails open when no KV is bound (dev/tests)', async () => {
    const res = await rateLimit(null, 'k', 5, 60)
    expect(res.limited).toBe(false)
  })

  it('counts attempts and blocks once the limit is reached', async () => {
    const kv = fakeKv()
    const results = []
    for (let i = 0; i < 4; i++) results.push(await rateLimit(kv, 'ip:1', 3, 600))

    expect(results.map((r) => r.limited)).toEqual([false, false, false, true])
    expect(results[0].remaining).toBe(2)
  })

  it('keeps separate counters per key', async () => {
    const kv = fakeKv()
    await rateLimit(kv, 'ip:1', 1, 600)
    const a = await rateLimit(kv, 'ip:1', 1, 600)
    const b = await rateLimit(kv, 'ip:2', 1, 600)
    expect(a.limited).toBe(true)
    expect(b.limited).toBe(false)
  })

  it('fails open if the KV read throws', async () => {
    const kv = {
      get: vi.fn(async () => {
        throw new Error('kv down')
      }),
      put: vi.fn(),
    } as unknown as KVNamespace
    const res = await rateLimit(kv, 'k', 1, 60)
    expect(res.limited).toBe(false)
  })
})

describe('clientIpFrom', () => {
  it('prefers cf-connecting-ip', () => {
    const req = new Request('https://x/', { headers: { 'cf-connecting-ip': '1.2.3.4' } })
    expect(clientIpFrom(req)).toBe('1.2.3.4')
  })

  it('falls back to the first x-forwarded-for entry', () => {
    const req = new Request('https://x/', { headers: { 'x-forwarded-for': '5.6.7.8, 9.9.9.9' } })
    expect(clientIpFrom(req)).toBe('5.6.7.8')
  })

  it('returns "unknown" when no IP header is present', () => {
    expect(clientIpFrom(new Request('https://x/'))).toBe('unknown')
  })
})

import { describe, it, expect, afterEach, vi } from 'vitest'
import { isBackgroundWorkerEnabled } from './env'

describe('isBackgroundWorkerEnabled', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('is true only for the exact string "true" from the Cloudflare runtime env', () => {
    const ctx = (value?: string) => ({ locals: { runtime: { env: { BACKGROUND_WORKER_ENABLED: value } } } })
    expect(isBackgroundWorkerEnabled(ctx('true'))).toBe(true)
    expect(isBackgroundWorkerEnabled(ctx('false'))).toBe(false)
    expect(isBackgroundWorkerEnabled(ctx('1'))).toBe(false)
    expect(isBackgroundWorkerEnabled(ctx(undefined))).toBe(false)
  })

  it('defaults to false (legacy waitUntil path) when the flag is absent everywhere', () => {
    expect(isBackgroundWorkerEnabled({})).toBe(false)
    expect(isBackgroundWorkerEnabled({ locals: {} })).toBe(false)
  })

  it('falls back to process.env when no Cloudflare runtime env is present', () => {
    vi.stubEnv('BACKGROUND_WORKER_ENABLED', 'true')
    expect(isBackgroundWorkerEnabled({})).toBe(true)
  })
})

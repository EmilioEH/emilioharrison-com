import { describe, it, expect, vi } from 'vitest'
import { isTransientAiError, withTransientRetry, MIN_TIMEOUT_FOR_RETRY_MS } from './ai-retry'

describe('isTransientAiError', () => {
  it.each([
    ['AbortError', Object.assign(new Error('This operation was aborted'), { name: 'AbortError' })],
    ['timeout text', new Error('Request timed out')],
    ['429', new Error('429 Too Many Requests')],
    ['RESOURCE_EXHAUSTED', new Error('RESOURCE_EXHAUSTED: quota exceeded')],
    ['503', new Error('503 Service Unavailable')],
    ['UNAVAILABLE', new Error('UNAVAILABLE')],
    ['ECONNRESET', new Error('read ECONNRESET')],
    ['socket hang up', new Error('socket hang up')],
  ])('flags %s as transient', (_label, error) => {
    expect(isTransientAiError(error)).toBe(true)
  })

  it('does not flag a malformed/unusable-response error', () => {
    expect(isTransientAiError(new Error('Invalid image format'))).toBe(false)
    expect(isTransientAiError(new Error('No ingredients generated'))).toBe(false)
  })

  it('handles non-Error throwables', () => {
    expect(isTransientAiError('timeout')).toBe(true)
    expect(isTransientAiError('some random string')).toBe(false)
  })
})

describe('withTransientRetry', () => {
  it('returns the result on a successful first attempt without retrying', async () => {
    const runAttempt = vi.fn().mockResolvedValue('ok')
    await expect(withTransientRetry(runAttempt, 120_000, 'Test')).resolves.toBe('ok')
    expect(runAttempt).toHaveBeenCalledTimes(1)
  })

  it('retries once on a transient error when the budget allows it', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' })
    const runAttempt = vi.fn().mockRejectedValueOnce(abort).mockResolvedValueOnce('ok')
    await expect(withTransientRetry(runAttempt, 120_000, 'Test')).resolves.toBe('ok')
    expect(runAttempt).toHaveBeenCalledTimes(2)
  })

  it('does not retry when the budget is under the minimum (tight waitUntil path)', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' })
    const runAttempt = vi.fn().mockRejectedValue(abort)
    await expect(withTransientRetry(runAttempt, 25_000, 'Test')).rejects.toThrow(/aborted/i)
    expect(runAttempt).toHaveBeenCalledTimes(1)
  })

  it('does not retry a non-transient error even with budget to spare', async () => {
    const runAttempt = vi.fn().mockRejectedValue(new Error('Invalid image format'))
    await expect(withTransientRetry(runAttempt, 120_000, 'Test')).rejects.toThrow(
      /invalid image/i,
    )
    expect(runAttempt).toHaveBeenCalledTimes(1)
  })

  it('treats an undefined timeoutMs as zero budget (no retry)', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' })
    const runAttempt = vi.fn().mockRejectedValue(abort)
    await expect(withTransientRetry(runAttempt, undefined, 'Test')).rejects.toThrow(/aborted/i)
    expect(runAttempt).toHaveBeenCalledTimes(1)
  })

  it('retries right at the minimum threshold (boundary is inclusive)', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' })
    const runAttempt = vi.fn().mockRejectedValueOnce(abort).mockResolvedValueOnce('ok')
    await expect(withTransientRetry(runAttempt, MIN_TIMEOUT_FOR_RETRY_MS, 'Test')).resolves.toBe(
      'ok',
    )
    expect(runAttempt).toHaveBeenCalledTimes(2)
  })
})

import { describe, it, expect, vi, afterEach } from 'vitest'
import { createTimeoutSignal } from './ai-timeout'

afterEach(() => {
  vi.useRealTimers()
})

describe('createTimeoutSignal', () => {
  it('aborts after the timeout elapses', () => {
    vi.useFakeTimers()
    const { signal } = createTimeoutSignal(1000)
    expect(signal.aborted).toBe(false)
    vi.advanceTimersByTime(1000)
    expect(signal.aborted).toBe(true)
  })

  it('does not abort before the timeout', () => {
    vi.useFakeTimers()
    const { signal } = createTimeoutSignal(1000)
    vi.advanceTimersByTime(999)
    expect(signal.aborted).toBe(false)
  })

  it('aborts immediately when the external signal is already aborted', () => {
    const external = new AbortController()
    external.abort(new Error('client disconnected'))
    const { signal } = createTimeoutSignal(60_000, external.signal)
    expect(signal.aborted).toBe(true)
  })

  it('aborts when the external signal fires before the timeout', () => {
    vi.useFakeTimers()
    const external = new AbortController()
    const { signal } = createTimeoutSignal(60_000, external.signal)
    expect(signal.aborted).toBe(false)
    external.abort(new Error('client disconnected'))
    expect(signal.aborted).toBe(true)
  })

  it('cleanup clears the timer so it does not fire later', () => {
    vi.useFakeTimers()
    const { signal, cleanup } = createTimeoutSignal(1000)
    cleanup()
    vi.advanceTimersByTime(2000)
    expect(signal.aborted).toBe(false)
  })
})

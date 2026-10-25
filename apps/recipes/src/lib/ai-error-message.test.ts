import { describe, it, expect } from 'vitest'
import { describeAiError, readableErrorReason } from './ai-error-message'

describe('describeAiError', () => {
  it('returns null when there is no reason', () => {
    expect(describeAiError(undefined)).toBeNull()
    expect(describeAiError(null)).toBeNull()
    expect(describeAiError('   ')).toBeNull()
  })

  it('explains an expired sign-in', () => {
    expect(describeAiError('Unauthorized')).toMatch(/sign-in has expired/)
  })

  it('explains a dropped connection in every browser wording', () => {
    for (const raw of [
      'Failed to fetch',
      'Load failed',
      'NetworkError when attempting to fetch resource.',
    ]) {
      expect(describeAiError(raw)).toMatch(/Couldn't reach the server/)
    }
  })

  it('passes server reasons through unchanged', () => {
    expect(describeAiError('Too many requests. Please try again later.')).toBe(
      'Too many requests. Please try again later.',
    )
    expect(describeAiError('AI request timed out after 25000ms')).toBe(
      'AI request timed out after 25000ms',
    )
  })

  it('pulls the readable message out of a provider error body', () => {
    const raw =
      'got status: 429 Too Many Requests. {"error":{"code":429,"message":"You exceeded your current quota.","status":"RESOURCE_EXHAUSTED"}}'
    expect(describeAiError(raw)).toBe('You exceeded your current quota.')
  })

  it('shows text containing a brace as written when it is not JSON', () => {
    expect(describeAiError('Bad value {oops')).toBe('Bad value {oops')
  })

  it('trims very long reasons', () => {
    const result = describeAiError('x'.repeat(500))
    expect(result).toHaveLength(240)
    expect(result?.endsWith('…')).toBe(true)
  })
})

describe('readableErrorReason', () => {
  it('leaves sign-in and network wording alone — those are the browser’s to interpret', () => {
    expect(readableErrorReason('Unauthorized')).toBe('Unauthorized')
    expect(readableErrorReason('fetch failed')).toBe('fetch failed')
  })
})

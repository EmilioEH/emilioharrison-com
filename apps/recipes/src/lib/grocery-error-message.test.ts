import { describe, it, expect } from 'vitest'
import { describeGroceryError } from './grocery-error-message'

describe('describeGroceryError', () => {
  it('returns null when there is no reason', () => {
    expect(describeGroceryError(undefined)).toBeNull()
    expect(describeGroceryError(null)).toBeNull()
    expect(describeGroceryError('   ')).toBeNull()
  })

  it('explains an expired sign-in', () => {
    expect(describeGroceryError('Unauthorized')).toMatch(/sign-in has expired/)
  })

  it('explains a dropped connection in every browser wording', () => {
    for (const raw of [
      'Failed to fetch',
      'Load failed',
      'NetworkError when attempting to fetch resource.',
    ]) {
      expect(describeGroceryError(raw)).toMatch(/Couldn't reach the server/)
    }
  })

  it('passes server reasons through unchanged', () => {
    expect(describeGroceryError('Too many requests. Please try again later.')).toBe(
      'Too many requests. Please try again later.',
    )
    expect(describeGroceryError('AI request timed out after 25000ms')).toBe(
      'AI request timed out after 25000ms',
    )
  })

  it('pulls the readable message out of a provider error body', () => {
    const raw =
      'got status: 429 Too Many Requests. {"error":{"code":429,"message":"You exceeded your current quota.","status":"RESOURCE_EXHAUSTED"}}'
    expect(describeGroceryError(raw)).toBe('You exceeded your current quota.')
  })

  it('shows text containing a brace as written when it is not JSON', () => {
    expect(describeGroceryError('Bad value {oops')).toBe('Bad value {oops')
  })

  it('trims very long reasons', () => {
    const result = describeGroceryError('x'.repeat(500))
    expect(result).toHaveLength(240)
    expect(result?.endsWith('…')).toBe(true)
  })
})

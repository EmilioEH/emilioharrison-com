import { describe, it, expect } from 'vitest'
import { householdVerdict, cardVerdict, verdictOf } from './household-verdict'
import type { Review } from './types'

const review = (over: Partial<Review> & Pick<Review, 'userId' | 'createdAt'>): Review => ({
  id: `${over.userId}-${over.createdAt}`,
  recipeId: 'r1',
  userName: over.userId,
  rating: 4,
  source: 'week-review',
  ...over,
})

describe('verdictOf', () => {
  it('prefers the stored verdict', () => {
    expect(verdictOf({ outcome: 'loved', rating: 2 })).toBe('loved')
  })

  it('falls back to the audited rating mapping for pre-verdict reviews', () => {
    expect(verdictOf({ outcome: undefined, rating: 5 })).toBe('loved')
    expect(verdictOf({ outcome: undefined, rating: 4 })).toBe('ok')
    expect(verdictOf({ outcome: undefined, rating: 3 })).toBe('ok')
    expect(verdictOf({ outcome: undefined, rating: 2 })).toBe('disliked')
    expect(verdictOf({ outcome: undefined, rating: 1 })).toBe('disliked')
  })
})

describe('householdVerdict', () => {
  it('is null with nothing to go on', () => {
    expect(householdVerdict(undefined)).toBeNull()
    expect(householdVerdict([])).toBeNull()
  })

  it('reports a single verdict', () => {
    expect(
      householdVerdict([review({ userId: 'a', createdAt: '2026-01-01', outcome: 'loved' })]),
    ).toBe('loved')
  })

  it('counts only each person’s most recent word', () => {
    // Disliked it in February, loved the second attempt in July. They changed their mind; a tally
    // that keeps both would call the household divided when only one person ever spoke.
    const reviews = [
      review({ userId: 'a', createdAt: '2026-02-01', outcome: 'disliked' }),
      review({ userId: 'a', createdAt: '2026-07-01', outcome: 'loved' }),
    ]
    expect(householdVerdict(reviews)).toBe('loved')
  })

  it('is order-independent', () => {
    const older = review({ userId: 'a', createdAt: '2026-02-01', outcome: 'disliked' })
    const newer = review({ userId: 'a', createdAt: '2026-07-01', outcome: 'loved' })
    expect(householdVerdict([newer, older])).toBe('loved')
  })

  it('reports real disagreement as mixed rather than averaging it away', () => {
    const reviews = [
      review({ userId: 'a', createdAt: '2026-07-01', outcome: 'loved' }),
      review({ userId: 'b', createdAt: '2026-07-01', outcome: 'disliked' }),
    ]
    expect(householdVerdict(reviews)).toBe('mixed')
  })

  it('lets one strong opinion carry over an indifferent one', () => {
    expect(
      householdVerdict([
        review({ userId: 'a', createdAt: '2026-07-01', outcome: 'loved' }),
        review({ userId: 'b', createdAt: '2026-07-01', outcome: 'ok' }),
      ]),
    ).toBe('loved')
    expect(
      householdVerdict([
        review({ userId: 'a', createdAt: '2026-07-01', outcome: 'disliked' }),
        review({ userId: 'b', createdAt: '2026-07-01', outcome: 'ok' }),
      ]),
    ).toBe('disliked')
  })

  it('reads pre-verdict reviews through their ratings', () => {
    const reviews = [
      review({ userId: 'a', createdAt: '2026-04-02', rating: 5, outcome: undefined }),
      review({ userId: 'b', createdAt: '2026-04-02', rating: 2, outcome: undefined }),
    ]
    expect(householdVerdict(reviews)).toBe('mixed')
  })
})

describe('cardVerdict', () => {
  it('marks the two verdicts that change a decision', () => {
    expect(cardVerdict([review({ userId: 'a', createdAt: '2026-07-01', outcome: 'loved' })])).toBe(
      'loved',
    )
    expect(
      cardVerdict([review({ userId: 'a', createdAt: '2026-07-01', outcome: 'disliked' })]),
    ).toBe('disliked')
    expect(
      cardVerdict([
        review({ userId: 'a', createdAt: '2026-07-01', outcome: 'loved' }),
        review({ userId: 'b', createdAt: '2026-07-01', outcome: 'disliked' }),
      ]),
    ).toBe('mixed')
  })

  it('says nothing about a recipe that was merely okay, or unrated', () => {
    expect(
      cardVerdict([review({ userId: 'a', createdAt: '2026-07-01', outcome: 'ok' })]),
    ).toBeNull()
    expect(cardVerdict([])).toBeNull()
  })
})

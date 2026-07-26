import { describe, it, expect } from 'vitest'
import { weekAwaitingReview, weekStartOf, preferenceWeight } from './week-review'

const TODAY = new Date('2026-07-22T12:00:00Z') // a Wednesday; its week starts 2026-07-20

describe('weekStartOf', () => {
  it('returns the Monday of the containing week', () => {
    expect(weekStartOf('2026-07-22')).toBe('2026-07-20')
    expect(weekStartOf('2026-07-20')).toBe('2026-07-20')
    // Sunday belongs to the week that started the previous Monday.
    expect(weekStartOf('2026-07-26')).toBe('2026-07-20')
  })
})

describe('weekAwaitingReview', () => {
  const planned = [
    { recipeId: 'a', weekStart: '2026-07-13' },
    { recipeId: 'b', weekStart: '2026-07-13' },
    { recipeId: 'c', weekStart: '2026-07-06' },
    { recipeId: 'd', weekStart: '2026-07-20' }, // the week in progress
  ]

  it('offers the most recent finished week', () => {
    expect(weekAwaitingReview(planned, [], TODAY)).toEqual({
      weekStart: '2026-07-13',
      recipeIds: ['a', 'b'],
    })
  })

  it('never asks about the week being cooked right now', () => {
    const result = weekAwaitingReview(planned, [], TODAY)
    expect(result?.recipeIds).not.toContain('d')
  })

  it('moves to the next unreviewed week once one is answered', () => {
    expect(weekAwaitingReview(planned, ['2026-07-13'], TODAY)).toEqual({
      weekStart: '2026-07-06',
      recipeIds: ['c'],
    })
  })

  it('asks nothing when everything finished has been answered', () => {
    expect(weekAwaitingReview(planned, ['2026-07-13', '2026-07-06'], TODAY)).toBeNull()
  })

  it('asks nothing on an empty history', () => {
    expect(weekAwaitingReview([], [], TODAY)).toBeNull()
  })

  it('counts a recipe once even if it was planned twice that week', () => {
    const twice = [
      { recipeId: 'a', weekStart: '2026-07-13' },
      { recipeId: 'a', weekStart: '2026-07-13' },
    ]
    expect(weekAwaitingReview(twice, [], TODAY)?.recipeIds).toEqual(['a'])
  })
})

describe('preferenceWeight', () => {
  it('rewards what the cook wants again and penalises what they did not', () => {
    expect(preferenceWeight(['again'], null, TODAY)).toBeGreaterThan(0)
    expect(preferenceWeight(['good'], null, TODAY)).toBeGreaterThan(0)
    expect(preferenceWeight(['meh'], null, TODAY)).toBeLessThan(0)
  })

  it('ignores a week that was planned but never cooked', () => {
    expect(preferenceWeight(['skipped'], null, TODAY)).toBe(0)
  })

  it('holds back something cooked in the last few weeks, even a favourite', () => {
    // A recipe you love should not be offered every single week.
    const recent = preferenceWeight(['again'], '2026-07-13', TODAY)
    const longAgo = preferenceWeight(['again'], '2026-01-05', TODAY)
    expect(recent).toBeLessThan(longAgo)
    expect(recent).toBeLessThan(0)
  })

  it('lets a favourite come back once enough time has passed', () => {
    expect(preferenceWeight(['again', 'good'], '2026-02-02', TODAY)).toBeGreaterThan(0)
  })
})

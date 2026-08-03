import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { APIContext } from 'astro'

const { getDocument, getCollection, setDocument, updateDocument } = vi.hoisted(() => ({
  getDocument: vi.fn(),
  getCollection: vi.fn(),
  setDocument: vi.fn(),
  updateDocument: vi.fn(),
}))
vi.mock('../../../lib/firebase-server', () => ({
  db: { getDocument, getCollection, setDocument, updateDocument },
}))

const { getAuthUser } = vi.hoisted(() => ({ getAuthUser: vi.fn() }))
vi.mock('../../../lib/api-helpers', () => ({
  getAuthUser,
  unauthorizedResponse: () => new Response('{}', { status: 401 }),
  serverErrorResponse: (msg: string) =>
    new Response(JSON.stringify({ success: false, error: msg }), { status: 500 }),
}))

vi.mock('../../../lib/request-context', () => ({ setRequestContext: vi.fn() }))

import { GET, POST } from './review'

const FAMILY = 'fam-1'

/** A context carrying `body` as the JSON request payload. */
const contextWith = (body: unknown): APIContext =>
  ({
    cookies: {},
    request: { json: async () => body },
  }) as unknown as APIContext

/** Whatever was last written to `families/fam-1`. */
const lastFamilyWrite = () =>
  setDocument.mock.calls.filter(([collection]) => collection === 'families').at(-1)?.[2] ?? null

beforeEach(() => {
  vi.clearAllMocks()
  getAuthUser.mockReturnValue('me')
  getDocument.mockImplementation((collection: string) => {
    if (collection === 'users') return Promise.resolve({ familyId: FAMILY, displayName: 'Emilio' })
    if (collection === 'families') return Promise.resolve({ id: FAMILY })
    return Promise.resolve(null)
  })
  setDocument.mockResolvedValue(undefined)
  updateDocument.mockResolvedValue(undefined)
})

describe('POST /api/week/review', () => {
  it('records a cook and a rating for anything actually made', async () => {
    const res = await POST(
      contextWith({
        weekStart: '2026-07-13',
        outcomes: [{ recipeId: 'r1', outcome: 'loved' }],
      }),
    )

    expect(await res.json()).toMatchObject({ success: true, recorded: 1, closed: true })
    const [, recipeId, written] = setDocument.mock.calls.find(([c]) => c.includes('recipeData'))!
    expect(recipeId).toBe('r1')
    expect(written.cookingHistory).toHaveLength(1)
    expect(written.cookingHistory[0].wouldMakeAgain).toBe(true)
    expect(written.reviews[0].rating).toBe(5)
  })

  it('stamps lastCooked on the recipe itself', async () => {
    await POST(
      contextWith({ weekStart: '2026-07-13', outcomes: [{ recipeId: 'r1', outcome: 'ok' }] }),
    )

    expect(updateDocument).toHaveBeenCalledWith(
      'recipes',
      'r1',
      expect.objectContaining({ lastCookedBy: 'Emilio' }),
    )
  })

  it('still records the review when the lastCooked stamp fails', async () => {
    updateDocument.mockRejectedValue(new Error('permission denied'))

    const res = await POST(
      contextWith({ weekStart: '2026-07-13', outcomes: [{ recipeId: 'r1', outcome: 'ok' }] }),
    )

    expect(await res.json()).toMatchObject({ success: true, recorded: 1 })
  })

  it('records no cook for "didn\'t make it", but counts it as answered', async () => {
    const res = await POST(
      contextWith({
        weekStart: '2026-07-13',
        outcomes: [{ recipeId: 'r1', outcome: 'skipped' }],
      }),
    )

    expect(await res.json()).toMatchObject({ recorded: 0, answered: 1 })
    expect(setDocument.mock.calls.some(([c]) => c.includes('recipeData'))).toBe(false)
    expect(lastFamilyWrite()?.reviewProgress).toEqual({ '2026-07-13': ['r1'] })
  })

  it('leaves the week open on a partial save', async () => {
    const res = await POST(
      contextWith({
        weekStart: '2026-07-13',
        outcomes: [{ recipeId: 'r1', outcome: 'ok' }],
        partial: true,
      }),
    )

    expect(await res.json()).toMatchObject({ closed: false })
    const written = lastFamilyWrite()
    expect(written?.reviewedWeeks ?? []).not.toContain('2026-07-13')
    expect(written?.reviewProgress).toEqual({ '2026-07-13': ['r1'] })
  })

  it('closes the week when every recipe was answered', async () => {
    await POST(
      contextWith({
        weekStart: '2026-07-13',
        outcomes: [
          { recipeId: 'r1', outcome: 'ok' },
          { recipeId: 'r2', outcome: 'disliked' },
        ],
      }),
    )

    expect(lastFamilyWrite()?.reviewedWeeks).toContain('2026-07-13')
  })

  it('merges a second pass into the answers already recorded', async () => {
    getDocument.mockImplementation((collection: string) =>
      collection === 'users'
        ? Promise.resolve({ familyId: FAMILY, displayName: 'Emilio' })
        : Promise.resolve({ id: FAMILY, reviewProgress: { '2026-07-13': ['r1'] } }),
    )

    await POST(
      contextWith({
        weekStart: '2026-07-13',
        outcomes: [{ recipeId: 'r2', outcome: 'ok' }],
        partial: true,
      }),
    )

    expect(lastFamilyWrite()?.reviewProgress['2026-07-13'].sort()).toEqual(['r1', 'r2'])
  })

  it('dismissal closes the week and records nothing', async () => {
    const res = await POST(
      contextWith({
        weekStart: '2026-07-13',
        outcomes: [{ recipeId: 'r1', outcome: 'loved' }],
        dismiss: true,
      }),
    )

    expect(await res.json()).toMatchObject({ recorded: 0, closed: true })
    expect(setDocument.mock.calls.some(([c]) => c.includes('recipeData'))).toBe(false)
    expect(lastFamilyWrite()?.reviewedWeeks).toContain('2026-07-13')
  })

  it('rejects a malformed weekStart', async () => {
    const res = await POST(contextWith({ weekStart: 'last week', outcomes: [] }))
    expect(res.status).toBe(400)
  })

  it('says so when the cook has no family to record against', async () => {
    getDocument.mockResolvedValue({})
    const res = await POST(contextWith({ weekStart: '2026-07-13', outcomes: [] }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ success: false })
  })
})

describe('GET /api/week/review', () => {
  // 2026-07-13 is permanently in the past, so it counts as a finished week whenever this runs —
  // no clock stubbing needed.
  const plannedLastWeek = [
    { id: 'r1', weekPlan: { isPlanned: true, assignedDate: '2026-07-13' } },
    { id: 'r2', weekPlan: { isPlanned: true, assignedDate: '2026-07-13' } },
  ]

  /** recipeData and weekPlans are both collections; answer each by path. */
  const collections = (recipeData: unknown[], weekPlans: unknown[] = []) =>
    getCollection.mockImplementation((path: string) =>
      Promise.resolve(path.endsWith('weekPlans') ? weekPlans : recipeData),
    )

  it("prefers the permanent week record over the recipe's current assignedDate", async () => {
    // r1 has since been re-planned into this week, so deriving from `assignedDate` would lose it.
    collections(
      [{ id: 'r1', weekPlan: { isPlanned: true, assignedDate: '2026-07-20' } }],
      [{ id: '2026-07-13', recipeIds: ['r1', 'r2'] }],
    )

    const { pending } = await (await GET({ cookies: {} } as APIContext)).json()

    expect(pending.weekStart).toBe('2026-07-13')
    expect(pending.recipeIds.sort()).toEqual(['r1', 'r2'])
  })

  it('offers a finished week that has not been answered', async () => {
    getCollection.mockResolvedValue(plannedLastWeek)

    const { pending } = await (await GET({ cookies: {} } as APIContext)).json()

    expect(pending.weekStart).toBe('2026-07-13')
    expect(pending.recipeIds.sort()).toEqual(['r1', 'r2'])
  })

  it('asks only about what is left after a partial pass', async () => {
    getCollection.mockResolvedValue(plannedLastWeek)
    getDocument.mockImplementation((collection: string) =>
      collection === 'users'
        ? Promise.resolve({ familyId: FAMILY })
        : Promise.resolve({ id: FAMILY, reviewProgress: { '2026-07-13': ['r1'] } }),
    )

    const { pending } = await (await GET({ cookies: {} } as APIContext)).json()

    expect(pending.recipeIds).toEqual(['r2'])
  })

  it('stops offering a week once every recipe has been answered', async () => {
    getCollection.mockResolvedValue(plannedLastWeek)
    getDocument.mockImplementation((collection: string) =>
      collection === 'users'
        ? Promise.resolve({ familyId: FAMILY })
        : Promise.resolve({ id: FAMILY, reviewProgress: { '2026-07-13': ['r1', 'r2'] } }),
    )

    const { pending } = await (await GET({ cookies: {} } as APIContext)).json()

    expect(pending).toBeNull()
  })

  it('explains itself when the cook has no family', async () => {
    getDocument.mockResolvedValue({})

    const body = await (await GET({ cookies: {} } as APIContext)).json()

    expect(body).toMatchObject({ pending: null, reason: 'no-family' })
  })
})

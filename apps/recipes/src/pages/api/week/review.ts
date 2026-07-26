import type { APIRoute, APIContext } from 'astro'
import { getAuthUser, unauthorizedResponse, serverErrorResponse } from '../../../lib/api-helpers'
import { db } from '../../../lib/firebase-server'
import { setRequestContext } from '../../../lib/request-context'
import {
  OUTCOME_RATING,
  weekAwaitingReview,
  weekStartOf,
  type CookOutcome,
} from '../../../lib/week-review'
import type { FamilyRecipeData, Review } from '../../../lib/types'

const VALID: CookOutcome[] = ['skipped', 'meh', 'good', 'again']

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/**
 * GET /api/week/review
 *
 * The finished week that still needs answering, or `null`. Computed here rather than on the client
 * because `reviewedWeeks` lives on the family document, which the client never loads — and because
 * "which week are we asking about" should have exactly one answer across every family member's
 * device.
 */
export const GET: APIRoute = async (context: APIContext) => {
  setRequestContext(context)
  const userId = getAuthUser(context.cookies)
  if (!userId) return unauthorizedResponse()

  try {
    const userDoc = await db.getDocument('users', userId)
    if (!userDoc?.familyId) return json({ success: true, pending: null })
    const familyId = userDoc.familyId as string

    const familyData = (await db.getCollection(
      `families/${familyId}/recipeData`,
    )) as FamilyRecipeData[]

    const planned = familyData
      .filter((d) => d.weekPlan?.isPlanned && d.weekPlan.assignedDate)
      .map((d) => ({ recipeId: d.id, weekStart: weekStartOf(d.weekPlan!.assignedDate!) }))

    const family = await db.getDocument('families', familyId)
    const reviewedWeeks: string[] = Array.isArray(family?.reviewedWeeks) ? family.reviewedWeeks : []

    return json({ success: true, pending: weekAwaitingReview(planned, reviewedWeeks) })
  } catch (error) {
    console.error('[week/review] GET failed:', error)
    return json({ success: true, pending: null })
  }
}

/**
 * POST /api/week/review
 *
 * Records how a finished week actually went: `{ weekStart, outcomes: [{ recipeId, outcome }] }`.
 *
 * This is the app's only writer of `cookingHistory` — the field existed and was initialised in
 * several places but nothing ever appended to it, which is why the library had four ratings after
 * six months. Anything the cook marks `skipped` is deliberately *not* recorded as cooked; that a
 * meal was planned and not made is real information, and inventing a cook would poison the
 * suggestions this feeds.
 *
 * The week is marked reviewed on the family document whether or not anything was cooked, so the
 * prompt asks once and then moves on.
 */
export const POST: APIRoute = async (context: APIContext) => {
  setRequestContext(context)
  const userId = getAuthUser(context.cookies)
  if (!userId) return unauthorizedResponse()

  try {
    const body = await context.request.json()
    const weekStart = String(body?.weekStart ?? '')
    const outcomes: Array<{ recipeId?: unknown; outcome?: unknown }> = Array.isArray(body?.outcomes)
      ? body.outcomes
      : []

    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return json({ success: false, error: 'weekStart (YYYY-MM-DD) is required' }, 400)
    }

    const userDoc = await db.getDocument('users', userId)
    if (!userDoc?.familyId) {
      return json({ success: false, error: 'You must create or join a family first' }, 400)
    }
    const familyId = userDoc.familyId as string
    const userName = (userDoc.displayName as string) || 'User'
    const cookedAt = new Date().toISOString()

    let recorded = 0
    for (const entry of outcomes) {
      const recipeId = String(entry?.recipeId ?? '')
      const outcome = String(entry?.outcome ?? '') as CookOutcome
      if (!recipeId || !VALID.includes(outcome)) continue

      const path = `families/${familyId}/recipeData`
      const existing = (await db.getDocument(path, recipeId)) as FamilyRecipeData | null
      const familyData: FamilyRecipeData = existing ?? {
        id: recipeId,
        notes: [],
        ratings: [],
        cookingHistory: [],
      }

      // "Didn't make it" earns no cook and no rating — only the acknowledgement that we asked.
      if (outcome === 'skipped') continue

      const review: Review = {
        id: `${userId}-${Date.now()}-${recipeId.slice(0, 8)}`,
        recipeId,
        userId,
        userName,
        rating: OUTCOME_RATING[outcome],
        source: 'quick',
        createdAt: cookedAt,
      }

      await db.setDocument(path, recipeId, {
        ...familyData,
        cookingHistory: [
          ...(familyData.cookingHistory ?? []),
          { userId, userName, cookedAt, wouldMakeAgain: outcome === 'again' },
        ],
        reviews: [...(familyData.reviews ?? []), review],
      })
      recorded++
    }

    // Mark the week answered so it isn't asked about again.
    const family = await db.getDocument('families', familyId)
    const reviewedWeeks: string[] = Array.isArray(family?.reviewedWeeks) ? family.reviewedWeeks : []
    if (!reviewedWeeks.includes(weekStart)) {
      await db.setDocument('families', familyId, {
        ...family,
        reviewedWeeks: [...reviewedWeeks, weekStart],
      })
    }

    return json({ success: true, recorded, weekStart })
  } catch (error) {
    console.error('[week/review] failed:', error)
    return serverErrorResponse('Could not save this week’s review.')
  }
}

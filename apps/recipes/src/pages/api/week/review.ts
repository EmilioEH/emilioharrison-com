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
 * Which recipes have already been answered, per week.
 *
 * Kept alongside `reviewedWeeks` on the family document rather than derived from `cookingHistory`,
 * because "didn't make it" is an answer that deliberately records no cook — without this, a
 * half-finished review would ask about those same meals again and a second pass would append a
 * duplicate cook for the ones already answered.
 */
function readReviewProgress(family: Record<string, unknown> | null): Record<string, string[]> {
  const raw = family?.reviewProgress
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, string[]> = {}
  for (const [week, ids] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(ids)) out[week] = ids.map(String)
  }
  return out
}

/**
 * GET /api/week/review
 *
 * The finished week that still needs answering, or `null`. Computed here rather than on the client
 * because `reviewedWeeks` lives on the family document, which the client never loads — and because
 * "which week are we asking about" should have exactly one answer across every family member's
 * device.
 *
 * Recipes already answered in an earlier pass are filtered out before the week is considered, so
 * answering three of five meals and coming back later asks about the remaining two rather than all
 * five. A week whose recipes are all answered simply stops appearing.
 */
export const GET: APIRoute = async (context: APIContext) => {
  setRequestContext(context)
  const userId = getAuthUser(context.cookies)
  if (!userId) return unauthorizedResponse()

  try {
    const userDoc = await db.getDocument('users', userId)
    if (!userDoc?.familyId) {
      // Nothing to ask about, and worth saying why: the review writes to family-scoped data, so
      // a cook who hasn't joined a family has nowhere to record an answer.
      return json({ success: true, pending: null, reason: 'no-family' })
    }
    const familyId = userDoc.familyId as string

    const [familyData, family] = await Promise.all([
      db.getCollection(`families/${familyId}/recipeData`) as Promise<FamilyRecipeData[]>,
      db.getDocument('families', familyId),
    ])

    const reviewedWeeks: string[] = Array.isArray(family?.reviewedWeeks) ? family.reviewedWeeks : []
    const answered = readReviewProgress(family)

    const planned = familyData
      .filter((d) => d.weekPlan?.isPlanned && d.weekPlan.assignedDate)
      .map((d) => ({ recipeId: d.id, weekStart: weekStartOf(d.weekPlan!.assignedDate!) }))
      .filter((entry) => !(answered[entry.weekStart] ?? []).includes(entry.recipeId))

    return json({ success: true, pending: weekAwaitingReview(planned, reviewedWeeks) })
  } catch (error) {
    console.error('[week/review] GET failed:', error)
    return json({ success: true, pending: null })
  }
}

/**
 * POST /api/week/review
 *
 * Records how a finished week actually went:
 * `{ weekStart, outcomes: [{ recipeId, outcome }], partial?, dismiss? }`.
 *
 * This is the app's only writer of `cookingHistory` — the field existed and was initialised in
 * several places but nothing ever appended to it, which is why the library had four ratings after
 * six months. Anything the cook marks `skipped` is deliberately *not* recorded as cooked; that a
 * meal was planned and not made is real information, and inventing a cook would poison the
 * suggestions this feeds.
 *
 * Two ways a week stops being asked about, and they are different on purpose:
 *  - **Answered.** Every recipe got an answer. Recorded in `reviewProgress` per recipe, so a
 *    half-finished pass resumes where it left off instead of starting over.
 *  - **Dismissed** (`dismiss: true`). The cook said don't ask. The week goes into `reviewedWeeks`
 *    with nothing recorded.
 *
 * A `partial: true` save records what was answered and leaves the week open. Previously the client
 * sent `skipped` for every unanswered recipe and the week closed regardless — so "Save 2 of 5"
 * silently recorded three meals as "didn't make it" and there was no way back to finish them.
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
    const partial = body?.partial === true
    const dismiss = body?.dismiss === true

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
    const path = `families/${familyId}/recipeData`

    let recorded = 0
    const answeredIds: string[] = []

    if (!dismiss) {
      for (const entry of outcomes) {
        const recipeId = String(entry?.recipeId ?? '')
        const outcome = String(entry?.outcome ?? '') as CookOutcome
        if (!recipeId || !VALID.includes(outcome)) continue

        // An answer of any kind counts as answered, so the cook is never asked twice about the
        // same meal — including "didn't make it", which earns no cook and no rating but is still
        // a reply to the question.
        answeredIds.push(recipeId)
        if (outcome === 'skipped') continue

        const existing = (await db.getDocument(path, recipeId)) as FamilyRecipeData | null
        const familyData: FamilyRecipeData = existing ?? {
          id: recipeId,
          notes: [],
          ratings: [],
          cookingHistory: [],
        }

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
    }

    // One write for both bits of week-level bookkeeping: which recipes have been answered, and
    // whether the week is closed outright.
    const family = await db.getDocument('families', familyId)
    const reviewedWeeks: string[] = Array.isArray(family?.reviewedWeeks) ? family.reviewedWeeks : []
    const progress = readReviewProgress(family)
    const closed = dismiss || !partial

    const alreadyAnswered = progress[weekStart] ?? []
    progress[weekStart] = Array.from(new Set([...alreadyAnswered, ...answeredIds]))

    await db.setDocument('families', familyId, {
      ...family,
      reviewProgress: progress,
      reviewedWeeks:
        closed && !reviewedWeeks.includes(weekStart)
          ? [...reviewedWeeks, weekStart]
          : reviewedWeeks,
    })

    return json({ success: true, recorded, answered: answeredIds.length, weekStart, closed })
  } catch (error) {
    console.error('[week/review] failed:', error)
    return serverErrorResponse('Could not save this week’s review.')
  }
}

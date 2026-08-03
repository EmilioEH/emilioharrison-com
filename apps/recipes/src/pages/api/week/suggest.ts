import type { APIRoute, APIContext } from 'astro'
import { Type as SchemaType } from '@google/genai'
import {
  getAuthUser,
  unauthorizedResponse,
  serverErrorResponse,
  initGeminiClient,
} from '../../../lib/api-helpers'
import { db } from '../../../lib/firebase-server'
import { setRequestContext } from '../../../lib/request-context'
import { createTimeoutSignal } from '../../../lib/services/ai-timeout'
import { GEMINI_TEXT_MODEL } from '../../../lib/services/ai-model-config'
import { rateLimit } from '../../../lib/rate-limit'
import { listAccessibleRecipes } from '../../../lib/recipe-access'
import {
  weekStartOf,
  verdictForRating,
  isVerdict,
  type CookOutcome,
} from '../../../lib/week-review'
import { describeFacets } from '../../../lib/recipe-facets'
import { applyPantry } from '../../../lib/services/pantry-match'
import {
  buildMenu,
  buildConversationPreamble,
  buildTurnPrompt,
  fallbackSuggestions,
  type RecipeSignal,
} from '../../../lib/services/suggest-core'
import {
  sanitizeConstraints,
  applyPatch,
  offerableUnder,
  groundWidgets,
  parseTurn,
  degradedTurn,
  MAX_REPLAYED_TURNS,
  type ConversationEntry,
} from '../../../lib/services/suggest-turns'
import type { FamilyRecipeData } from '../../../lib/types'

/** Comfortably inside the request budget — this is one small call over a cached ~8k-token menu. */
const SUGGEST_TIMEOUT_MS = 25_000
/**
 * Per *turn*, not per session. A planning session is now several exchanges rather than one call,
 * so the old 60 would have been a couple of sessions' worth.
 */
const SUGGEST_RATE_LIMIT = 200
const SUGGEST_RATE_WINDOW_SECONDS = 60 * 60

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/**
 * The shape the model must answer in. Enforced by Gemini's structured-output mode rather than
 * hoped for — `parseTurn` still validates, because a schema constrains shape and not sense.
 */
const TURN_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    say: { type: SchemaType.STRING },
    widgets: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          kind: { type: SchemaType.STRING },
          id: { type: SchemaType.STRING },
          mode: { type: SchemaType.STRING },
          value: { type: SchemaType.NUMBER },
          placeholder: { type: SchemaType.STRING },
          options: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                label: { type: SchemaType.STRING },
                value: { type: SchemaType.STRING },
                intent: { type: SchemaType.STRING },
              },
            },
          },
          picks: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                n: { type: SchemaType.NUMBER },
                why: { type: SchemaType.STRING },
              },
            },
          },
        },
        required: ['kind'],
      },
    },
  },
  required: ['say', 'widgets'],
}

/**
 * POST /api/week/suggest
 *
 * One turn of the meal-picking exchange: `{ conversation, constraints }` in, `{ turn, constraints }`
 * out. The model chooses the next question and what to offer in it; this endpoint owns the typed
 * state, grounds every option against the real library, and resolves picks to recipes the cook
 * actually has. See `lib/services/suggest-turns.ts` for why it is shaped that way.
 *
 * If the model is unavailable or answers unusably, the endpoint still returns a turn — built from
 * a deterministic ranking. A blank screen is a worse failure than an unexplained pick.
 */
export const POST: APIRoute = async (context: APIContext) => {
  setRequestContext(context)
  const userId = getAuthUser(context.cookies)
  if (!userId) return unauthorizedResponse()

  const kv = context.locals?.runtime?.env?.SESSION
  const { limited } = await rateLimit(
    kv,
    `suggest:${userId}`,
    SUGGEST_RATE_LIMIT,
    SUGGEST_RATE_WINDOW_SECONDS,
  )
  if (limited) return json({ success: false, error: 'Too many requests. Try again shortly.' }, 429)

  try {
    const body = await context.request.json()
    let constraints = sanitizeConstraints(body?.constraints)
    const conversation: ConversationEntry[] = Array.isArray(body?.conversation)
      ? body.conversation.slice(-MAX_REPLAYED_TURNS)
      : []

    const userDoc = await db.getDocument('users', userId)
    const familyId = userDoc?.familyId as string | undefined

    const recipes = await listAccessibleRecipes(userId)
    const knownIds = new Set(recipes.map((r) => r.id))

    // What this family has made, and what they thought of it.
    const signals: Record<string, RecipeSignal> = {}
    if (familyId) {
      const familyData = (await db.getCollection(
        `families/${familyId}/recipeData`,
      )) as FamilyRecipeData[]
      for (const data of familyData) {
        const cooks = data.cookingHistory ?? []
        // A cook records what happened; the review records how it went. Reading both would count
        // a dislike twice — once as an ordinary cook, once as a dislike — so the review wins where
        // there is one, and a cook with no review is treated as unremarkable.
        //
        // Reviews carry the verdict directly now. `verdictForRating` is only for reviews written
        // before that field existed, which the migration stamps but which a rollback (or an
        // in-flight client) can still produce.
        const verdicts = (data.reviews ?? []).map((r) =>
          isVerdict(r.outcome) ? r.outcome : verdictForRating(r.rating),
        )
        const outcomes: CookOutcome[] = verdicts.length
          ? verdicts
          : cooks.map((c) => (c.wouldMakeAgain ? 'loved' : 'ok'))

        const lastCook = cooks[cooks.length - 1]?.cookedAt
        signals[data.id] = {
          outcomes,
          lastCookedWeek: lastCook ? weekStartOf(lastCook) : null,
          timesPlanned: data.weekPlan?.assignedDate ? 1 : 0,
        }
      }
    }

    // A patch the cook's last message earned is applied before anything is offered, so the reply
    // and the constraints can never disagree.
    const offerable = offerableUnder(recipes, constraints)
    if (!offerable.length) {
      return json({
        success: true,
        turn: degradedTurn([]),
        constraints,
        exhausted: true,
      })
    }

    const stillNeeded = Math.max(1, constraints.wanted - constraints.keptIds.length)
    const keptTitles = constraints.keptIds
      .map((id) => recipes.find((r) => r.id === id)?.title)
      .filter((t): t is string => Boolean(t))

    // The same matching `offerableUnder` used to narrow (or decline to narrow) the menu, so the
    // markers on the lines always agree with the list they are on.
    const pantryMatches = applyPantry(offerable, constraints.pantry).matchesById
    const { menu, index } = buildMenu(offerable, signals, new Date(), pantryMatches)
    const preamble = buildConversationPreamble(menu)
    const tail = buildTurnPrompt({
      conversation,
      constraints,
      narrowed: describeFacets(constraints.facets),
      stillNeeded,
      keptTitles,
      offerableCount: offerable.length,
    })

    let turn = null as ReturnType<typeof parseTurn>
    const { signal, cleanup } = createTimeoutSignal(SUGGEST_TIMEOUT_MS, context.request.signal)
    try {
      const gemini = await initGeminiClient(context.locals)
      const response = await gemini.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        // The stable menu first, the conversation last, so the long half is a cache prefix.
        contents: [{ role: 'user', parts: [{ text: `${preamble}\n${tail}` }] }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: TURN_SCHEMA,
          abortSignal: signal,
          // Choosing among a list is judgement, not reasoning — the latency is not worth it.
          thinkingConfig: { thinkingBudget: 0 },
          // A little variation, so asking twice doesn't return the same three every time.
          temperature: 0.8,
        },
      })
      turn = parseTurn(response.text ?? '', index, [
        ...constraints.keptIds,
        ...constraints.rejectedIds,
      ])
    } catch (error) {
      console.error('[week/suggest] model call failed:', error)
    } finally {
      cleanup()
    }

    if (!turn) {
      const picks = fallbackSuggestions({
        recipes,
        signals,
        wanted: stillNeeded,
        mood: constraints.mood.join(', '),
        keptIds: constraints.keptIds,
        rejectedIds: constraints.rejectedIds,
        facets: constraints.facets,
      }).map((s) => ({ recipeId: s.recipeId, why: s.reason }))

      return json({ success: true, turn: degradedTurn(picks), constraints, degraded: true })
    }

    constraints = applyPatch(constraints, turn.patch, knownIds)

    // Ground the options against the library *after* the patch — the counts a cook sees have to
    // reflect what they just said, not what was true a sentence ago.
    const grounded = offerableUnder(recipes, constraints)
    const widgets = groundWidgets(turn.widgets, recipes, constraints)

    // Narrowing itself into a corner is worth saying out loud rather than quietly returning less
    // than was asked for.
    const exhausted = grounded.length === 0

    return json({
      success: true,
      turn: { say: turn.say, widgets },
      constraints,
      ...(exhausted ? { exhausted: true } : {}),
    })
  } catch (error) {
    console.error('[week/suggest] failed:', error)
    return serverErrorResponse('Could not put together suggestions right now.')
  }
}

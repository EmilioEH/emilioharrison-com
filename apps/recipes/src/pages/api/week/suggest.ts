import type { APIRoute, APIContext } from 'astro'
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
import { weekStartOf, type CookOutcome } from '../../../lib/week-review'
import {
  buildMenu,
  buildPrompt,
  parseSuggestions,
  fallbackSuggestions,
  matchesFacets,
  type RecipeSignal,
} from '../../../lib/services/suggest-core'
import type { RecipeFacets } from '../../../lib/recipe-facets'
import type { FamilyRecipeData } from '../../../lib/types'

/** Comfortably inside the request budget — this is one small call over ~8k tokens. */
const SUGGEST_TIMEOUT_MS = 25_000
const SUGGEST_RATE_LIMIT = 60
const SUGGEST_RATE_WINDOW_SECONDS = 60 * 60
const MAX_WANTED = 7

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/**
 * POST /api/week/suggest
 *
 * Suggests a few meals from the cook's own library, given how many they still need and whatever
 * they said they feel like.
 *
 * The whole library goes to the model — see suggest-core.ts for why a candidate pre-filter is the
 * wrong shape here. If the model is unavailable the endpoint still answers, from a deterministic
 * ranking, because a blank screen is a worse failure than an unexplained pick.
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
    const wanted = Math.max(1, Math.min(MAX_WANTED, Number(body?.wanted) || 3))
    const mood = String(body?.mood ?? '').slice(0, 400)
    const keptIds: string[] = Array.isArray(body?.keptIds) ? body.keptIds.map(String) : []
    const rejectedIds: string[] = Array.isArray(body?.rejectedIds)
      ? body.rejectedIds.map(String)
      : []
    const facets: RecipeFacets = {
      proteins: Array.isArray(body?.facets?.proteins) ? body.facets.proteins.map(String) : [],
      dishTypes: Array.isArray(body?.facets?.dishTypes) ? body.facets.dishTypes.map(String) : [],
      cuisines: Array.isArray(body?.facets?.cuisines) ? body.facets.cuisines.map(String) : [],
      difficulties: Array.isArray(body?.facets?.difficulties)
        ? body.facets.difficulties.map(String)
        : [],
      maxMinutes: Number(body?.facets?.maxMinutes) || null,
    }

    const userDoc = await db.getDocument('users', userId)
    const familyId = userDoc?.familyId as string | undefined

    // The library the cook can actually choose from — the same scope the library screen shows.
    //
    // This used to read the entire `recipes` collection and filter it with
    // `!r.createdBy || r.createdBy === userId || familyId`, where the trailing `|| familyId` is
    // truthy for anyone in a family and made the filter a no-op. Two things followed: the model
    // was shown other families' recipes, and any pick outside the cook's own library resolved to
    // nothing on the client and was silently dropped — so asking for five meals could return three.
    const recipes = await listAccessibleRecipes(userId)

    // What this family has made, and what they thought of it.
    const signals: Record<string, RecipeSignal> = {}
    if (familyId) {
      const familyData = (await db.getCollection(
        `families/${familyId}/recipeData`,
      )) as FamilyRecipeData[]
      for (const data of familyData) {
        const cooks = data.cookingHistory ?? []
        const outcomes: CookOutcome[] = cooks.map((c) => (c.wouldMakeAgain ? 'again' : 'good'))
        // A "meh" is recorded as a 2-star quick review; read it back so dislikes carry weight.
        for (const review of data.reviews ?? []) {
          if (review.source === 'quick' && review.rating <= 2) outcomes.push('meh')
        }
        const lastCook = cooks[cooks.length - 1]?.cookedAt
        signals[data.id] = {
          outcomes,
          lastCookedWeek: lastCook ? weekStartOf(lastCook) : null,
          timesPlanned: data.weekPlan?.assignedDate ? 1 : 0,
        }
      }
    }

    // Facets are a hard filter — the cook tapped "Chicken", so a beef dish is wrong however good
    // a suggestion it would be. Free text stays a steer for the model; this was explicit.
    const exclude = [...keptIds, ...rejectedIds]
    const offerable = recipes.filter((r) => !exclude.includes(r.id) && matchesFacets(r, facets))
    if (!offerable.length) {
      return json({ success: true, suggestions: [], exhausted: true })
    }

    const input = { recipes: offerable, signals, wanted, mood, keptIds, rejectedIds, facets }
    const { menu, index } = buildMenu(offerable, signals)
    const keptTitles = keptIds
      .map((id) => recipes.find((r) => r.id === id)?.title)
      .filter((t): t is string => Boolean(t))

    let suggestions = [] as ReturnType<typeof parseSuggestions>
    const { signal, cleanup } = createTimeoutSignal(SUGGEST_TIMEOUT_MS, context.request.signal)
    try {
      const gemini = await initGeminiClient(context.locals)
      const response = await gemini.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: [{ role: 'user', parts: [{ text: buildPrompt(input, menu, keptTitles) }] }],
        config: {
          responseMimeType: 'application/json',
          abortSignal: signal,
          // Choosing among a list is judgement, not reasoning — the latency is not worth it.
          thinkingConfig: { thinkingBudget: 0 },
          // A little variation, so asking twice doesn't return the same three every time.
          temperature: 0.8,
        },
      })
      suggestions = parseSuggestions(response.text ?? '', index, exclude)
    } catch (error) {
      console.error('[week/suggest] model call failed:', error)
    } finally {
      cleanup()
    }

    if (!suggestions.length) {
      return json({ success: true, suggestions: fallbackSuggestions(input), degraded: true })
    }

    return json({ success: true, suggestions: suggestions.slice(0, wanted) })
  } catch (error) {
    console.error('[week/suggest] failed:', error)
    return serverErrorResponse('Could not put together suggestions right now.')
  }
}

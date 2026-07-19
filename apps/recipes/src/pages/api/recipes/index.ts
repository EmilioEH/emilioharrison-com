import type { APIRoute, APIContext } from 'astro'
import { db } from '../../../lib/firebase-server'
import { isRecipe } from '../../../lib/type-guards'
import { getAuthUser } from '../../../lib/api-helpers'
import { runEnhancementJob } from '../../../lib/services/recipe-enhancement-job'
import { rateLimit } from '../../../lib/rate-limit'
import type { Recipe, RecipeListItem } from '../../../lib/types'

const ENHANCE_RATE_LIMIT = 20
const ENHANCE_RATE_WINDOW_SECONDS = 60 * 60

/**
 * Kicks off background Enhancement for a freshly-created, AI-parsed recipe without blocking
 * the create response. Runs via `ctx.waitUntil` (Cloudflare Workers) so it survives the
 * client's tab/connection closing — previously this was triggered by a client-side
 * fire-and-forget `fetch` from `recipe-enhancer.ts`, which died if the user backgrounded the
 * app right after saving.
 */
export async function triggerBackgroundEnhancement(
  context: APIContext,
  recipe: Recipe,
  userId: string,
) {
  if (recipe.creationMethod !== 'ai-parse' || !recipe.title) return

  const kv = context.locals?.runtime?.env?.SESSION
  const { limited } = await rateLimit(
    kv,
    `enhance:${userId}`,
    ENHANCE_RATE_LIMIT,
    ENHANCE_RATE_WINDOW_SECONDS,
  )

  if (limited) {
    await db
      .updateDocument('recipes', recipe.id, {
        enhancementStatus: 'error',
        enhancementError: 'Skipped automatic enhancement — rate limit reached.',
      })
      .catch((e) => console.error('[Enhance] Failed to record rate-limit skip:', e))
    return
  }

  const origin = new URL(context.request.url).origin
  const job = runEnhancementJob(context.locals, recipe, origin)

  const ctx = context.locals?.runtime?.ctx
  if (ctx?.waitUntil) {
    ctx.waitUntil(job)
  } else {
    // No Workers `ctx` available (e.g. local dev without the Cloudflare runtime proxy) —
    // fall back to awaiting it directly rather than silently dropping the job.
    await job
  }
}

// Firestore's `in` operator caps at 30 values. Family groups are small in this app, so a single
// chunk almost always covers it — but we chunk defensively rather than silently truncating the
// creator list if that ever changes.
const FIRESTORE_IN_LIMIT = 30

/** Splits an array into chunks of at most `size` items. */
export function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

/** De-dupes recipes returned across multiple merged queries, keeping the first occurrence. */
export function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const item of items) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    out.push(item)
  }
  return out
}

/**
 * Projects a full recipe document down to the fields the library list view actually renders,
 * filters, sorts, and searches by (see PERFORMANCE-PLAN.md P3). Excludes `steps`,
 * `structuredSteps`/`structuredIngredients`, step-ingredient mapping arrays, notes, version
 * history, and everything else the list doesn't need — those are only needed by the detail view,
 * which fetches the full document via `GET /api/recipes/[id]`.
 *
 * `ingredients` is kept in full (not trimmed to just `name`) because it's cheap and keeps this
 * shape a valid, if partial, `Recipe` — Fuse.js search in `useFilteredRecipes.ts` needs
 * `ingredients.name`.
 */
export function toListRecipe(doc: Recipe): RecipeListItem {
  return {
    id: doc.id,
    title: doc.title,
    images: doc.images,
    finishedImage: doc.finishedImage,
    sourceImage: doc.sourceImage,
    thumbUrl: doc.thumbUrl,
    prepTime: doc.prepTime,
    cookTime: doc.cookTime,
    servings: doc.servings,
    protein: doc.protein,
    cuisine: doc.cuisine,
    difficulty: doc.difficulty,
    rating: doc.rating,
    createdAt: doc.createdAt || new Date().toISOString(),
    updatedAt: doc.updatedAt || new Date().toISOString(),
    dishType: doc.dishType,
    mealType: doc.mealType,
    dietary: doc.dietary,
    equipment: doc.equipment,
    occasion: doc.occasion,
    ingredients: doc.ingredients,
  }
}

export const GET: APIRoute = async ({ cookies }) => {
  const userId = getAuthUser(cookies)

  try {
    // 1. Determine Allowed Creators (Me + Family). Sequential by necessity — the family lookup
    // depends on the user doc's `familyId`.
    const allowedCreators = new Set<string>()

    if (userId) {
      allowedCreators.add(userId)

      const userDoc = await db.getDocument('users', userId)
      if (userDoc?.familyId) {
        const familyDoc = await db.getDocument('families', userDoc.familyId)
        if (familyDoc?.members && Array.isArray(familyDoc.members)) {
          familyDoc.members.forEach((memberId: string) => allowedCreators.add(memberId))
        }
      }
    }

    // 2. Scoped recipe queries.
    //
    // Visibility = (createdBy IN [me, ...family]) UNION (legacy recipes with no createdBy field
    // at all, which are treated as visible to everyone). Firestore cannot query "field does not
    // exist" server-side (not even via `!=`), so the legacy branch relies on those documents
    // having been backfilled with an explicit `createdBy: null`. True field-less legacy docs
    // won't match this query; this is a known, documented trade-off of avoiding a full collection
    // scan on every request (see README/PERFORMANCE-PLAN.md).
    const creatorChunks = chunkArray(Array.from(allowedCreators), FIRESTORE_IN_LIMIT)

    const recipeQueries: Promise<Recipe[]>[] = [
      db.runQuery<Recipe>('recipes', { field: 'createdBy', op: 'EQUAL', value: null }),
      ...creatorChunks.map((chunk) =>
        db.runQuery<Recipe>('recipes', { field: 'createdBy', op: 'IN', value: chunk }),
      ),
    ]

    const recipeResults = await Promise.all(recipeQueries)

    const rawRecipes = dedupeById(recipeResults.flat())

    // 3. Validate and slim to list fields.
    const validRecipes = rawRecipes.filter(isRecipe).map((doc) => toListRecipe(doc))

    // Merging multiple queries loses the single-query `orderBy` ordering — re-sort here.
    validRecipes.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))

    return new Response(JSON.stringify({ recipes: validRecipes }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (e) {
    console.error('GET Recipes Error', e)
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
}

export const POST: APIRoute = async (context: APIContext) => {
  const { request, cookies } = context
  const userId = getAuthUser(cookies)

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  try {
    const recipeData = await request.json()
    const id = recipeData.id || crypto.randomUUID()
    const now = new Date().toISOString()

    // 1. Get User Context for Ownership
    const userDoc = await db.getDocument('users', userId)
    const familyId = userDoc?.familyId || null

    const qualifiesForEnhancement = recipeData.creationMethod === 'ai-parse' && !!recipeData.title

    const newRecipe = {
      ...recipeData,
      id,
      // Enforce Ownership
      createdBy: userId,
      familyId: familyId, // Optional, but saves lookup later
      createdAt: now,
      updatedAt: now,
      // Set eagerly (in the same write) so the client sees "pending" immediately rather than
      // racing the background job's own first write.
      ...(qualifiesForEnhancement ? { enhancementStatus: 'pending' as const } : {}),
    }

    await db.createDocument('recipes', id, newRecipe)

    if (qualifiesForEnhancement) {
      // Fire-and-forget from the caller's perspective — see triggerBackgroundEnhancement.
      void triggerBackgroundEnhancement(context, newRecipe as Recipe, userId)
    }

    return new Response(JSON.stringify({ success: true, id }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('POST Error', e)
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

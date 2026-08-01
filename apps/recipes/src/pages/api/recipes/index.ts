import type { APIRoute, APIContext } from 'astro'
import { db } from '../../../lib/firebase-server'
import { isRecipe } from '../../../lib/type-guards'
import { getAuthUser } from '../../../lib/api-helpers'
import { clampRecipeEnums } from '../../../lib/services/recipe-merge'
import { listAccessibleRecipes } from '../../../lib/recipe-access'
import type { Recipe, RecipeListItem } from '../../../lib/types'

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
    // 1. Scoped recipe queries. The visibility rule itself lives in `recipe-access.ts`, so the
    // library, the meal suggester and per-recipe authorization can never drift apart.
    const rawRecipes = await listAccessibleRecipes(userId)

    // 2. Validate and slim to list fields.
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

    // Background "Kenji-style" enhancement was removed at the owner's request: it reworded
    // instructions, invented specifics the source never stated, and merged steps together.
    // Recipes now keep the text transcribed at import.

    const newRecipe = clampRecipeEnums({
      ...recipeData,
      id,
      // Enforce Ownership
      createdBy: userId,
      familyId: familyId, // Optional, but saves lookup later
      createdAt: now,
      updatedAt: now,
    })

    await db.createDocument('recipes', id, newRecipe)

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

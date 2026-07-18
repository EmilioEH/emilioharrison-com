import type { APIRoute, APIContext } from 'astro'
import { db } from '../../../lib/firebase-server'
import { loadAccessibleRecipe } from '../../../lib/recipe-access'
import { setRequestContext } from '../../../lib/request-context'

export const GET: APIRoute = async (context: APIContext) => {
  setRequestContext(context)
  const { params, cookies } = context

  // Enforce that the caller may access this specific recipe, not merely that they're logged in.
  const access = await loadAccessibleRecipe(cookies, params.id)
  if (!access.ok) return access.response

  return new Response(JSON.stringify({ recipe: access.recipe, success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const PUT: APIRoute = async (context: APIContext) => {
  setRequestContext(context)
  const { request, cookies, params } = context

  const access = await loadAccessibleRecipe(cookies, params.id)
  if (!access.ok) return access.response

  try {
    const recipeData = await request.json()
    const now = new Date().toISOString()

    // Preserve ownership fields — a PUT must not let the caller reassign `createdBy`/`id`
    // (which would move the recipe out of, or into, someone else's scope).
    const updateData = {
      ...recipeData,
      id: access.recipe.id,
      createdBy: access.recipe.createdBy,
      updatedAt: now,
    }

    await db.updateDocument('recipes', access.recipe.id, updateData)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('PUT Error', e)
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const DELETE: APIRoute = async (context: APIContext) => {
  setRequestContext(context)
  const { params, cookies } = context

  const access = await loadAccessibleRecipe(cookies, params.id)
  if (!access.ok) return access.response

  try {
    await db.deleteDocument('recipes', access.recipe.id)
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

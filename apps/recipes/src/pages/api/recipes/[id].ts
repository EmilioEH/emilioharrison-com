import type { APIRoute, APIContext } from 'astro'
import { db } from '../../../lib/firebase-server'
import { getAuthUser } from '../../../lib/api-helpers'
import { setRequestContext } from '../../../lib/request-context'

export const GET: APIRoute = async (context: APIContext) => {
  setRequestContext(context)
  const { params, cookies } = context
  const { id } = params

  const userId = getAuthUser(cookies)
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400 })
  }

  try {
    const doc = await db.getDocument('recipes', id)
    if (!doc) {
      return new Response(JSON.stringify({ error: 'Recipe not found' }), { status: 404 })
    }

    return new Response(JSON.stringify({ recipe: doc, success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('GET Recipe Error', e)
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const PUT: APIRoute = async (context: APIContext) => {
  setRequestContext(context)
  const { request, cookies, params } = context
  const { id } = params
  const user = getAuthUser(cookies)

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400 })
  }

  try {
    const recipeData = await request.json()
    const now = new Date().toISOString()

    const updateData = {
      ...recipeData,
      updatedAt: now,
    }

    // Check existence
    const doc = await db.getDocument('recipes', id)
    if (!doc) {
      return new Response(JSON.stringify({ error: 'Recipe not found' }), { status: 404 })
    }

    await db.updateDocument('recipes', id, updateData)

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
  const { id } = params

  const userId = getAuthUser(cookies)
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400 })
  }

  try {
    await db.deleteDocument('recipes', id)
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    // If it's already gone, REST might throw or return. If throw, we catch.
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

import type { APIRoute } from 'astro'
import { db } from '../../../lib/firebase-server'

export const PUT: APIRoute = async ({ request, cookies, params }) => {
  const { id } = params
  const userCookie = cookies.get('site_user')
  const user = userCookie?.value

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

    // Update recipe
    await db.updateDocument('recipes', id, updateData)

    // Handle favorites parity
    if (user && typeof recipeData.isFavorite === 'boolean') {
      const favCollection = `users/${user}/favorites`
      if (recipeData.isFavorite) {
        await db.setDocument(favCollection, id, { createdAt: now })
      } else {
        // Ignore delete error if not exists
        try {
          await db.deleteDocument(favCollection, id)
        } catch {
          /* ignore */
        }
      }
    }

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

export const DELETE: APIRoute = async ({ params }) => {
  const { id } = params

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

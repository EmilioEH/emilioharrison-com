import type { APIRoute } from 'astro'
import { db } from '../../../lib/firebase-server'

export const GET: APIRoute = async ({ params }) => {
  const { id } = params

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

    // Handle Versioning
    // 1. Create a snapshot of the CURRENT (old) state
    const versionSnapshot = {
      timestamp: now,
      userId: user || 'anonymous',
      changeType: 'edit',
      data: doc, // The full existing document
    }

    // 2. Append to existing versions (or create new array)
    // We only keep the last 10 versions to avoid doc bloat
    const currentVersions = (doc.versions as unknown[]) || []
    const updatedVersions = [versionSnapshot, ...currentVersions].slice(0, 10)

    // Update recipe with new data AND the new versions array
    await db.updateDocument('recipes', id, {
      ...updateData,
      versions: updatedVersions,
    })

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

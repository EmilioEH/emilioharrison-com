import type { APIRoute } from 'astro'
import { db } from '../../lib/firebase-server'

export const POST: APIRoute = async ({ request, cookies }) => {
  const userCookie = cookies.get('site_user')
  const user = userCookie?.value

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { recipeId } = await request.json()

    if (!recipeId) {
      return new Response(JSON.stringify({ error: 'Missing recipeId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check if favorite exists in subcollection
    const collection = `users/${user}/favorites`
    const doc = await db.getDocument(collection, recipeId)

    let isFavorite = false

    if (doc) {
      // Remove favorite
      await db.deleteDocument(collection, recipeId)
      isFavorite = false
    } else {
      // Add favorite
      await db.createDocument(collection, recipeId, {
        recipeId,
        createdAt: new Date().toISOString(),
      })
      isFavorite = true
    }

    return new Response(JSON.stringify({ success: true, isFavorite }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Favorites Error:', err)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

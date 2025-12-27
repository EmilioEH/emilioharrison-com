import type { APIRoute } from 'astro'

export const POST: APIRoute = async ({ request, cookies, locals }) => {
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

    const runtime = locals.runtime
    if (!runtime || !runtime.env || !runtime.env.DB) {
      return new Response(JSON.stringify({ error: 'DB configuration error' }), { status: 500 })
    }
    const db = runtime.env.DB

    // Check if favorite exists
    const existing = await db
      .prepare('SELECT * FROM user_favorites WHERE user_id = ? AND recipe_id = ?')
      .bind(user, recipeId)
      .first()

    let isFavorite = false

    if (existing) {
      // Remove favorite
      await db
        .prepare('DELETE FROM user_favorites WHERE user_id = ? AND recipe_id = ?')
        .bind(user, recipeId)
        .run()
      isFavorite = false
    } else {
      // Add favorite
      await db
        .prepare('INSERT INTO user_favorites (user_id, recipe_id, created_at) VALUES (?, ?, ?)')
        .bind(user, recipeId, Date.now())
        .run()
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

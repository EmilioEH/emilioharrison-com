import type { APIRoute } from 'astro'
import type { RecipeRow } from '../../../lib/d1'

export const GET: APIRoute = async ({ locals, cookies }) => {
  const db = locals.runtime.env.DB
  const userCookie = cookies.get('site_user')
  const user = userCookie?.value

  try {
    let query = 'SELECT r.* FROM recipes r ORDER BY r.updated_at DESC'
    let params: unknown[] = []

    if (user) {
      // If user is logged in, we want to know if they favorited it.
      // We can LEFT JOIN user_favorites
      query = `
        SELECT r.*, uf.created_at as favorite_created_at
        FROM recipes r
        LEFT JOIN user_favorites uf ON r.id = uf.recipe_id AND uf.user_id = ?
        ORDER BY r.updated_at DESC
      `
      params = [user]
    }

    const { results } = await db
      .prepare(query)
      .bind(...params)
      .all<RecipeRow & { favorite_created_at?: number }>()

    // Transform back to full Recipe objects
    const recipes = results
      .map((row) => {
        try {
          const data = JSON.parse(row.data)
          return {
            ...data,
            // Ensure consistent metadata from columns
            id: row.id,
            title: row.title,
            protein: row.protein,
            mealType: row.meal_type,
            dishType: row.dish_type,
            equipment: row.equipment ? JSON.parse(row.equipment) : [],
            occasion: row.occasion ? JSON.parse(row.occasion) : [],
            dietary: row.dietary ? JSON.parse(row.dietary) : [],
            difficulty: row.difficulty,
            cuisine: row.cuisine,
            // User-specific favorite check (now global `is_favorite` column)
            isFavorite: Boolean(row.is_favorite),
            // Legacy/Global flags
            thisWeek: Boolean(row.this_week),
            createdAt: new Date(row.created_at).toISOString(),
            updatedAt: new Date(row.updated_at).toISOString(),
          }
        } catch (e) {
          console.error('Failed to parse recipe data', row.id, e)
          return null
        }
      })
      .filter((r) => r !== null)

    return new Response(JSON.stringify({ recipes }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
}

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  const db = locals.runtime.env.DB
  const userCookie = cookies.get('site_user') // Keep userCookie for potential future use or if user_favorites logic is re-introduced
  const user = userCookie?.value

  try {
    const recipe = await request.json()

    // Extract column data
    const id = recipe.id || crypto.randomUUID()
    const now = Date.now()

    // Prepare row
    const is_favorite = recipe.isFavorite ? 1 : 0
    const this_week = recipe.thisWeek ? 1 : 0

    // Ensure data object has everything
    const dataStr = JSON.stringify({ ...recipe, id })

    // Safety check for D1 row size limit (roughly 2MB)
    if (dataStr.length > 1.5 * 1024 * 1024) {
      return new Response(
        JSON.stringify({
          error:
            'Recipe content is too large. This usually happens if a high-resolution photo failed to upload and is being sent as raw data. Try a smaller photo or check your connection.',
        }),
        {
          status: 413,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    const batch = [
      db
        .prepare(
          `INSERT INTO recipes (id, title, protein, meal_type, dish_type, equipment, occasion, dietary, difficulty, cuisine, is_favorite, this_week, created_at, updated_at, data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          recipe.title,
          recipe.protein || null,
          recipe.mealType || null,
          recipe.dishType || null,
          JSON.stringify(recipe.equipment || []),
          JSON.stringify(recipe.occasion || []),
          JSON.stringify(recipe.dietary || []),
          recipe.difficulty || null,
          recipe.cuisine || null,
          is_favorite,
          this_week,
          now,
          now,
          dataStr,
        ),
    ]

    // If user wants it favorited on creation (e.g. import), handle it
    if (recipe.isFavorite && user) {
      batch.push(
        db
          .prepare('INSERT INTO user_favorites (user_id, recipe_id, created_at) VALUES (?, ?, ?)')
          .bind(user, id, now),
      )
    }

    await db.batch(batch)

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

import type { APIRoute } from 'astro'

export const PUT: APIRoute = async ({ request, locals, params }) => {
  const { id } = params
  const db = locals.runtime.env.DB

  try {
    const recipe = await request.json()
    const now = Date.now()

    // const is_favorite = recipe.isFavorite ? 1 : 0 // Unused
    const is_favorite = recipe.isFavorite ? 1 : 0
    const this_week = recipe.thisWeek ? 1 : 0
    const dataStr = JSON.stringify({ ...recipe, id })

    const res = await db
      .prepare(
        `UPDATE recipes 
       SET title = ?, protein = ?, meal_type = ?, dish_type = ?, equipment = ?, occasion = ?, dietary = ?, difficulty = ?, cuisine = ?, is_favorite = ?, this_week = ?, updated_at = ?, data = ?
       WHERE id = ?`,
      )
      .bind(
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
        dataStr,
        id,
      )
      .run()

    if (res.meta.changes === 0) {
      // If no changes, maybe it didn't exist? But let's assume success for idempotent-ish behavior or return 404
      // Use POST logic or return 404. Let's return 404.
      return new Response(JSON.stringify({ error: 'Recipe not found' }), { status: 404 })
    }

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

export const DELETE: APIRoute = async ({ locals, params }) => {
  const { id } = params
  const db = locals.runtime.env.DB

  try {
    await db.prepare('DELETE FROM recipes WHERE id = ?').bind(id).run()
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

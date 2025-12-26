import type { APIRoute } from 'astro'
import type { Recipe } from '../../../lib/d1'

export const GET: APIRoute = async ({ locals }) => {
  const db = locals.runtime.env.DB

  try {
    const { results } = await db
      .prepare('SELECT * FROM recipes ORDER BY updated_at DESC')
      .all<Recipe>()
    return new Response(JSON.stringify(results), {
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

import type { APIRoute } from 'astro'
import { db } from '../../../lib/firebase-server'
import { isRecipe } from '../../../lib/type-guards'

export const GET: APIRoute = async ({ cookies }) => {
  const userCookie = cookies.get('site_user')
  const user = userCookie?.value

  try {
    // 1. Fetch all recipes
    // REST API doesn't support complex ordering as easily in simple list, but basic orderBy works
    const rawRecipes = await db.getCollection('recipes', 'updatedAt', 'DESC')

    // 2. If user is logged in, attach `isFavorite` status
    let favIds = new Set<string>()
    if (user) {
      // NOTE: Subcollections in REST are just /documents/users/ID/favorites
      const favDocs = await db.getCollection(`users/${user}/favorites`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      favIds = new Set(favDocs.map((d: any) => d.id))
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recipes = rawRecipes.map((doc: any) => {
      // doc already mapped by service
      return {
        ...doc,
        // Ensure dates are strings for JSON serialization
        createdAt: doc.createdAt || new Date().toISOString(),
        updatedAt: doc.updatedAt || new Date().toISOString(),
        isFavorite: favIds.has(doc.id),
      }
    })

    const validRecipes = recipes.filter(isRecipe)

    if (validRecipes.length < recipes.length) {
      console.warn(`Filtered out ${recipes.length - validRecipes.length} invalid recipes`)
    }

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

export const POST: APIRoute = async ({ request, cookies }) => {
  const userCookie = cookies.get('site_user')
  const user = userCookie?.value

  try {
    const recipeData = await request.json()
    const id = recipeData.id || crypto.randomUUID()
    const now = new Date().toISOString()

    const newRecipe = {
      ...recipeData,
      id,
      createdAt: now,
      updatedAt: now,
      isFavorite: false,
    }

    // Parallel writes instead of batch
    await db.createDocument('recipes', id, newRecipe)

    if (recipeData.isFavorite && user) {
      await db.createDocument(`users/${user}/favorites`, id, { createdAt: now })
    }

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

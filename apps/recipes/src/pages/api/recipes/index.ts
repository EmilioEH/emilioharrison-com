import type { APIRoute } from 'astro'
import { db } from '../../../lib/firebase-server'
import { isRecipe } from '../../../lib/type-guards'
import { getAuthUser } from '../../../lib/api-helpers'

export const GET: APIRoute = async ({ cookies }) => {
  const userId = getAuthUser(cookies)

  try {
    // 1. Determine Allowed Creators (Me + Family)
    const allowedCreators = new Set<string>()

    if (userId) {
      allowedCreators.add(userId)

      // Fetch user to get family context
      const userDoc = await db.getDocument('users', userId)
      if (userDoc?.familyId) {
        const familyDoc = await db.getDocument('families', userDoc.familyId)
        // Add all family members to allowed creators
        if (familyDoc?.members && Array.isArray(familyDoc.members)) {
          familyDoc.members.forEach((memberId: string) => allowedCreators.add(memberId))
        }
      }
    }

    // 2. Fetch all recipes
    // REST API doesn't support complex ordering as easily in simple list, but basic orderBy works
    const rawRecipes = await db.getCollection('recipes', 'updatedAt', 'DESC')

    // 3. If user is logged in, attach `isFavorite` status
    let favIds = new Set<string>()
    if (userId) {
      // NOTE: Subcollections in REST are just /documents/users/ID/favorites
      const favDocs = await db.getCollection(`users/${userId}/favorites`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      favIds = new Set(favDocs.map((d: any) => d.id))
    }

    // 4. Map & Filter
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

    const validRecipes = recipes.filter(isRecipe).filter((recipe) => {
      // Filter Logic: Creator-Centric
      // 1. Legacy recipes (no createdBy) are PUBLIC/VISIBLE TO ALL
      if (!recipe.createdBy) return true

      // 2. Modern recipes: Must be created by me OR a family member
      if (recipe.createdBy && allowedCreators.has(recipe.createdBy)) return true

      // 3. Otherwise hidden
      return false
    })

    if (validRecipes.length < recipes.length) {
      // useful log for debugging visibility
      // console.log(`Filtered: ${recipes.length} total -> ${validRecipes.length} visible`)
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
  const userId = getAuthUser(cookies)

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  try {
    const recipeData = await request.json()
    const id = recipeData.id || crypto.randomUUID()
    const now = new Date().toISOString()

    // 1. Get User Context for Ownership
    const userDoc = await db.getDocument('users', userId)
    const familyId = userDoc?.familyId || null

    const newRecipe = {
      ...recipeData,
      id,
      // Enforce Ownership
      createdBy: userId,
      familyId: familyId, // Optional, but saves lookup later
      createdAt: now,
      updatedAt: now,
      isFavorite: false,
    }

    // Parallel writes instead of batch
    await db.createDocument('recipes', id, newRecipe)

    if (recipeData.isFavorite) {
      await db.createDocument(`users/${userId}/favorites`, id, { createdAt: now })
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

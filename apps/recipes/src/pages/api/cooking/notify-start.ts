import type { APIRoute } from 'astro'
import {
  getAuthUser,
  unauthorizedResponse,
  badRequestResponse,
  getCloudflareEnv,
} from '../../../lib/api-helpers'
import { db } from '../../../lib/firebase-server'
import { sendFamilyPush } from '../../../lib/push-notifications'

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const userId = getAuthUser(cookies)
  if (!userId) return unauthorizedResponse()

  try {
    const { recipeId } = await request.json()
    if (!recipeId) return badRequestResponse('Recipe ID is required')

    // 1. Get User & Family
    const userDoc = await db.getDocument('users', userId)
    if (!userDoc || !userDoc.familyId) {
      return badRequestResponse('User must belong to a family')
    }

    // 2. Get Recipe Title
    const recipe = await db.getDocument('recipes', recipeId)
    const recipeTitle = recipe?.title || 'a recipe'

    // 3. Send Push
    const env = getCloudflareEnv(locals)
    await sendFamilyPush(
      userDoc.familyId,
      userId,
      {
        title: 'Cooking Started 🍳',
        body: `${userDoc.displayName || 'Someone'} started cooking ${recipeTitle}.`,
        url: `/protected/recipes/cook/${recipeId}`, // Deep link if supported
        type: 'cooking',
      },
      env,
    )

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('Notify Start Error:', e)
    return new Response(JSON.stringify({ error: 'Internal Error' }), { status: 500 })
  }
}

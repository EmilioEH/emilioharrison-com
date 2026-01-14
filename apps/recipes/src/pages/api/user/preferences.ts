import type { APIRoute } from 'astro'
import { getAuthUser, unauthorizedResponse, badRequestResponse } from '../../../lib/api-helpers'
import { db } from '../../../lib/firebase-server'

// GET /api/user/preferences
export const GET: APIRoute = async ({ cookies }) => {
  const userId = getAuthUser(cookies)
  if (!userId) return unauthorizedResponse()

  try {
    const userDoc = await db.getDocument('users', userId)
    if (!userDoc) return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 })

    return new Response(
      JSON.stringify({
        preferences: {
          notifications: userDoc.notificationPreferences || {
            email: true,
            push: true,
            types: {
              timers: true,
              mealPlan: true,
              cooking: true,
              invites: true,
            },
          },
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    console.error('Get Preferences Error:', e)
    return new Response(JSON.stringify({ error: 'Internal Error' }), { status: 500 })
  }
}

// POST /api/user/preferences
export const POST: APIRoute = async ({ request, cookies }) => {
  const userId = getAuthUser(cookies)
  if (!userId) return unauthorizedResponse()

  try {
    const body = await request.json()
    const { notifications } = body

    if (!notifications) return badRequestResponse('No preferences provided')

    await db.updateDocument('users', userId, {
      notificationPreferences: notifications,
    })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('Update Preferences Error:', e)
    return new Response(JSON.stringify({ error: 'Internal Error' }), { status: 500 })
  }
}

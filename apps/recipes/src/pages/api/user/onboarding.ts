import type { APIRoute } from 'astro'
import { db } from '../../../lib/firebase-server'
import { getAuthUser, unauthorizedResponse, serverErrorResponse } from '../../../lib/api-helpers'

export const POST: APIRoute = async ({ cookies }) => {
  const user = getAuthUser(cookies)
  if (!user) return unauthorizedResponse()

  try {
    // Update Firestore users collection
    await db.setDocument('users', user, { hasOnboarded: true }, true)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Onboarding update error:', error)
    return serverErrorResponse('Internal Server Error')
  }
}

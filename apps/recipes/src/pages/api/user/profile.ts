import type { APIRoute } from 'astro'
import { db } from '../../../lib/firebase-server'
import {
  getAuthUser,
  unauthorizedResponse,
  badRequestResponse,
  serverErrorResponse,
} from '../../../lib/api-helpers'

export const POST: APIRoute = async ({ request, cookies }) => {
  const user = getAuthUser(cookies)
  if (!user) return unauthorizedResponse()

  try {
    const body = await request.json()
    const { displayName } = body

    if (!displayName || typeof displayName !== 'string') {
      return badRequestResponse('Invalid display name')
    }

    // Update Firestore users collection
    await db.setDocument('users', user, { displayName }, true)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return serverErrorResponse('Internal Server Error')
  }
}

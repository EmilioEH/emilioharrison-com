import type { APIRoute } from 'astro'
import { getAuthUser, unauthorizedResponse } from '../../../lib/api-helpers'
import { db } from '../../../lib/firebase-server'

/**
 * POST /api/families/code
 * Generate a short code for others to join the family
 */
export const POST: APIRoute = async ({ cookies }) => {
  const userId = getAuthUser(cookies)

  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    const user = await db.getDocument('users', userId)
    if (!user || !user.familyId) {
      return new Response(JSON.stringify({ success: false, error: 'No family found' }), {
        status: 400,
      })
    }

    // Generate a 6-character code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const now = new Date()
    // Code valid for 24 hours
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()

    await db.setDocument('family_codes', code, {
      code,
      familyId: user.familyId,
      createdBy: userId,
      createdAt: now.toISOString(),
      expiresAt,
    })

    return new Response(JSON.stringify({ success: true, code }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('Generate Code Error:', e)
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 500,
    })
  }
}

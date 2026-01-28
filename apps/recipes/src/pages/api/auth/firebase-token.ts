import type { APIRoute } from 'astro'
import { db } from '../../../lib/firebase-server'

/**
 * Returns a Firebase custom token for the currently authenticated user.
 * This allows the client-side Firebase SDK to authenticate and access
 * Firestore with proper security rules.
 */
export const GET: APIRoute = async (context) => {
  const { cookies } = context

  try {
    // Check session authentication
    const siteAuth = cookies.get('site_auth')?.value
    const userId = cookies.get('site_user')?.value

    if (siteAuth !== 'true' || !userId) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Generate custom token for this user
    const customToken = await db.createCustomToken(userId)

    return new Response(JSON.stringify({ token: customToken }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Token is short-lived (1 hour), allow caching for 55 minutes
        'Cache-Control': 'private, max-age=3300',
      },
    })
  } catch (error) {
    console.error('Failed to create custom token:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to create token',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}

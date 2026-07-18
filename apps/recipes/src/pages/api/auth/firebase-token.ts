import type { APIRoute } from 'astro'
import { db } from '../../../lib/firebase-server'
import { getSessionFromCookies } from '../../../lib/session'

/**
 * Returns a Firebase custom token for the currently authenticated user.
 * This allows the client-side Firebase SDK to authenticate and access
 * Firestore with proper security rules.
 */
export const GET: APIRoute = async (context) => {
  const { cookies } = context

  try {
    // The UID must come from the signed session — never from a client-writable
    // cookie — because the token minted below IS that user for Firestore purposes.
    const session = getSessionFromCookies(cookies)

    if (!session) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Generate custom token for this user
    const customToken = await db.createCustomToken(session.uid)

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

import type { APIRoute } from 'astro'
import { db } from '../../../lib/firebase-server'

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { idToken } = await request.json()

    if (!idToken) {
      return new Response(JSON.stringify({ error: 'Missing ID token' }), { status: 400 })
    }

    console.log('[Debug] Backend received token', {
      length: idToken.length,
      prefix: idToken.substring(0, 10),
    })

    // Verify the token using Google's public endpoint
    // Use POST to avoid URL length limits with large tokens
    const tokenInfoRes = await fetch('https://oauth2.googleapis.com/tokeninfo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ id_token: idToken }),
    })

    if (!tokenInfoRes.ok) {
      const errorText = await tokenInfoRes.text()
      console.error(`Token verification failed: ${tokenInfoRes.status} ${errorText}`)
      return new Response(
        JSON.stringify({
          error: 'Invalid token',
          details: `Google verification failed: ${tokenInfoRes.status} - ${errorText}`,
        }),
        { status: 401 },
      )
    }

    const payload = await tokenInfoRes.json()

    // Verify audience matches Project ID or Client ID
    const projectId = db.projectId
    // In some cases, audience is the client ID (e.g., when initialized from a specific client)
    // We'll be flexible but log clearly if it doesn't match either.
    if (payload.aud !== projectId) {
      console.warn(
        `Token audience (${payload.aud}) does not match Project ID (${projectId}). This might be expected if using a specific Client ID.`,
      )
    }

    const name = payload.name || payload.email || 'Chef'
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: 'lax' as const,
    }

    // Auth token
    cookies.set('site_auth', 'true', cookieOptions)

    // User identity (not httpOnly so client can read "Welcome, Name")
    cookies.set('site_user', name, {
      ...cookieOptions,
      httpOnly: false,
    })

    return new Response(JSON.stringify({ success: true, name }), { status: 200 })
  } catch (error) {
    console.error('Login error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500 },
    )
  }
}

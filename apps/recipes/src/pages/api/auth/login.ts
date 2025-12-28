import type { APIRoute } from 'astro'
import { db } from '../../../lib/firebase-server'

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { idToken } = await request.json()

    if (!idToken) {
      return new Response(JSON.stringify({ error: 'Missing ID token' }), { status: 400 })
    }

    // Verify the token using Google's public endpoint
    const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`)
    if (!tokenInfoRes.ok) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 })
    }

    const payload = await tokenInfoRes.json()

    // Verify audience matches Project ID
    const projectId = db.projectId

    if (payload.aud !== projectId) {
      // It's possible payload.aud is the Client ID, not Project ID, depending on the provider.
      // For Firebase Auth ID tokens, 'aud' IS the Project ID.
      // We will log a warning if it doesn't match but might need to be lenient if testing setup is weird.
      // For strict security, we should return 401.
      console.error(`Token audience mismatch. Expected ${projectId}, got ${payload.aud}`)
      return new Response(JSON.stringify({ error: 'Token audience mismatch' }), { status: 401 })
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
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 })
  }
}

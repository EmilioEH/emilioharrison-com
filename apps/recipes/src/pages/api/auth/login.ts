import type { APIRoute } from 'astro'

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { idToken } = await request.json()

    if (!idToken) {
      return new Response(JSON.stringify({ error: 'Missing ID token' }), { status: 400 })
    }

    // Verify the token using Firebase Auth REST API
    // This is the correct endpoint for Firebase ID Tokens (tokeninfo is for Google OAuth tokens)
    const apiKey = import.meta.env.PUBLIC_FIREBASE_API_KEY
    if (!apiKey) {
      throw new Error('Missing PUBLIC_FIREBASE_API_KEY')
    }

    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      },
    )

    if (!verifyRes.ok) {
      const errorText = await verifyRes.text()
      console.error(`Token verification failed: ${verifyRes.status} ${errorText}`)
      return new Response(
        JSON.stringify({
          error: 'Invalid token',
          details: `Firebase verification failed: ${verifyRes.status} - ${errorText}`,
        }),
        { status: 401 },
      )
    }

    const data = await verifyRes.json()
    const user = data.users[0]

    // Use email or provider ID as name since display name might be missing
    const name = user.displayName || user.email || 'Chef'
    const email = user.email

    // Validate email against whitelist
    const allowedEmailsEnv = import.meta.env.ALLOWED_EMAILS || ''
    const allowedEmails = allowedEmailsEnv.split(',').map((e: string) => e.trim().toLowerCase())

    if (allowedEmailsEnv && (!email || !allowedEmails.includes(email.toLowerCase()))) {
      console.error(`Login blocked for unauthorized email: ${email}`)
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          details: 'Your email is not on the allowed list.',
        }),
        { status: 403 },
      )
    }

    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: 'lax' as const,
    }

    // Auth token
    cookies.set('site_auth', 'true', cookieOptions)

    // Store email for access control (httpOnly)
    if (email) {
      cookies.set('site_email', email, cookieOptions)
    }

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

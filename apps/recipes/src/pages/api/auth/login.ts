import type { APIRoute } from 'astro'
import { getEnv, getEmailList } from '../../../lib/env'
import {
  createSessionToken,
  getSessionSecret,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from '../../../lib/session'
import {
  verifyFirebaseToken,
  processPendingInvites,
  upsertUser,
  getUserStatus,
} from '../../../lib/auth-login'

/** Check if user is whitelisted or already approved */
async function checkAccessStatus(
  email: string | undefined,
  userId: string,
  allowedEmails: string[],
): Promise<{ isAllowed: boolean; status: string }> {
  const isWhitelisted =
    allowedEmails.length > 0 && email && allowedEmails.includes(email.toLowerCase())

  let status = await getUserStatus(userId)
  let isAllowed = false

  if (isWhitelisted) {
    isAllowed = true
    status = 'approved'
  } else if (status === 'approved') {
    isAllowed = true
  }

  return { isAllowed, status }
}

/** Get appropriate error message based on status */
function getAccessDeniedMessage(status: string): string {
  if (status === 'pending') return 'Your access request is pending approval.'
  if (status === 'rejected') return 'Your access request has been denied.'
  return 'You do not have access to this application.'
}

/** Create access denied response */
function createAccessDeniedResponse(email: string | undefined, status: string): Response {
  console.error(`Login blocked. Email: ${email}, Status: ${status}`)
  return new Response(
    JSON.stringify({
      error: 'Unauthorized',
      details: getAccessDeniedMessage(status),
      code: status === 'pending' ? 'auth/pending' : 'auth/denied',
    }),
    { status: 403 },
  )
}

export const POST: APIRoute = async (context) => {
  const { request, cookies } = context
  try {
    const { idToken } = await request.json()

    if (!idToken) {
      return new Response(JSON.stringify({ error: 'Missing ID token' }), { status: 400 })
    }

    // 1. Verify Token
    const apiKey = getEnv(context, 'PUBLIC_FIREBASE_API_KEY')
    if (!apiKey) throw new Error('Missing PUBLIC_FIREBASE_API_KEY')

    let user
    try {
      user = await verifyFirebaseToken(idToken, apiKey)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`Token verification failed: ${msg}`)
      return new Response(JSON.stringify({ error: 'Invalid token', details: msg }), { status: 401 })
    }

    const { localId: userId, email, displayName } = user
    const name = displayName || email || 'Chef'

    // 2. Access Control & Status Check
    const allowedEmails = getEmailList(context, 'ALLOWED_EMAILS')
    let { isAllowed, status } = await checkAccessStatus(email, userId, allowedEmails)

    // 3. Auto-authorization via Pending Invites
    let familyIdToJoin: string | null = null
    if (!isAllowed && email) {
      familyIdToJoin = await processPendingInvites(email, userId)
      if (familyIdToJoin) {
        isAllowed = true
        status = 'approved'
      }
    }

    if (!isAllowed) {
      return createAccessDeniedResponse(email, status)
    }

    // 4. Update User Record
    await upsertUser(
      userId,
      email,
      name,
      status as 'approved' | 'pending' | 'rejected',
      familyIdToJoin,
    )

    // 5. Set Cookies
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      maxAge: SESSION_MAX_AGE_SECONDS, // 30 days
      sameSite: 'lax' as const,
    }

    // The signed session cookie is the ONLY cookie the server trusts for identity
    // (see lib/session.ts). It carries the uid/email verified against the Firebase
    // ID token above and is HMAC-signed, so it cannot be minted or altered client-side.
    const secret = getSessionSecret(context)
    if (!secret) {
      throw new Error(
        'Cannot issue a session: neither SESSION_SECRET nor FIREBASE_SERVICE_ACCOUNT is configured',
      )
    }
    cookies.set(SESSION_COOKIE_NAME, createSessionToken(secret, { uid: userId, email, name }), {
      ...cookieOptions,
      httpOnly: true,
    })

    // Display-only cookies for the client shell (localStorage cache keys, greeting).
    // Deliberately non-httpOnly so the client can read them; never trusted server-side.
    cookies.set('site_user', userId, { ...cookieOptions, httpOnly: false })
    cookies.set('site_username', name, { ...cookieOptions, httpOnly: false })

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

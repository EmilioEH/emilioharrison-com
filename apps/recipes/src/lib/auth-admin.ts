import { getEnv, getEmailList } from './env'
import { getSessionFromCookies } from './session'

/** Verify ID token and extract user email */
async function verifyIdToken(
  authHeader: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ email: string | null; user: any }> {
  if (!authHeader?.startsWith('Bearer ')) {
    return { email: null, user: null }
  }

  const idToken = authHeader.split('Bearer ')[1]
  const apiKey = getEnv(context, 'PUBLIC_FIREBASE_API_KEY')

  try {
    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      },
    )

    if (verifyRes.ok) {
      const data = await verifyRes.json()
      const user = data.users[0]
      return { email: user.email, user }
    }
  } catch {
    // Token verification failed
  }

  return { email: null, user: null }
}

/** Fallback: resolve identity from the signed session cookie (see lib/session.ts). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lookupSessionUser(context: any): { email: string | null; user: any } {
  if (!context.cookies) {
    return { email: null, user: null }
  }

  // The email here was verified against a Firebase ID token at login and is
  // HMAC-signed — unlike the legacy `site_user` cookie this used to trust, it
  // cannot be set to another user's identity by the client.
  const session = getSessionFromCookies(context.cookies)
  if (session?.email) {
    return {
      email: session.email,
      user: { id: session.uid, email: session.email, displayName: session.name || session.email },
    }
  }

  return { email: null, user: null }
}

// Helper to check admin status via ID Token
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const verifyAdmin = async (request: Request, context: any) => {
  const isTestMode = getEnv(context, 'PUBLIC_TEST_MODE') === 'true'
  const userId = context.cookies?.get('site_user')?.value
  const isTestUser = userId === 'TestUser' || userId === 'test_user'

  if (isTestMode && isTestUser) {
    return { id: userId, email: 'test@test.com', displayName: userId }
  }

  const authHeader = request.headers.get('Authorization')

  // 1. Try ID Token verification
  let { email, user } = await verifyIdToken(authHeader, context)

  // 2. Fallback: Check Session Cookie
  if (!email) {
    const sessionResult = lookupSessionUser(context)
    email = sessionResult.email
    user = sessionResult.user
  }

  if (!email) return null

  // 3. Check Admin Allowlist
  const adminEmails = getEmailList(context, 'ADMIN_EMAILS')
  return adminEmails.includes(email.toLowerCase()) ? user : null
}

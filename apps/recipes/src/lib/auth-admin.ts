import { getEnv, getEmailList } from './env'

// Helper to check admin status via ID Token
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const verifyAdmin = async (request: Request, context: any) => {
  // 1. Get ID Token from Header (Bearer)
  const authHeader = request.headers.get('Authorization')
  let email: string | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let user: any = null

  if (authHeader?.startsWith('Bearer ')) {
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
        user = data.users[0]
        email = user.email
      }
    } catch {
      // Token verification failed
    }
  }

  // 2. Fallback: Check Session Cookie (Site User)
  if (!email && context.cookies) {
    const userId = context.cookies.get('site_user')?.value
    if (userId) {
      try {
        // We need to fetch the user doc to get the email
        // Importing db here might cause circular deps if not careful, but it's used in API routes
        const { db } = await import('./firebase-server')
        const userDoc = await db.getDocument('users', userId)
        if (userDoc && userDoc.email) {
          email = userDoc.email
          user = { ...userDoc } // Mock user object properties needed downstream
        }
      } catch {
        // DB lookup failed
      }
    }
  }

  if (!email) return null

  // 3. Check Admin Allowlist
  // Strictly usage ADMIN_EMAILS, not ALLOWED_EMAILS
  const adminEmails = getEmailList(context, 'ADMIN_EMAILS')
  if (adminEmails.includes(email.toLowerCase())) return user

  return null
}

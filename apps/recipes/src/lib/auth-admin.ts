import { getEnv, getEmailList } from './env'

// Helper to check admin status via ID Token
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const verifyAdmin = async (request: Request, context: any) => {
  // 1. Get ID Token from Header
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const idToken = authHeader.split('Bearer ')[1]
  const apiKey = getEnv(context, 'PUBLIC_FIREBASE_API_KEY')

  const verifyRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    },
  )

  if (!verifyRes.ok) return null
  const data = await verifyRes.json()
  const user = data.users[0]
  const email = user.email

  // 2. Check Admin Allowlist
  // Strictly usage ADMIN_EMAILS, not ALLOWED_EMAILS
  const adminEmails = getEmailList(context, 'ADMIN_EMAILS')
  if (adminEmails.includes(email.toLowerCase())) return user

  return null
}

import type { APIRoute } from 'astro'
import { getEnv, getEmailList } from '../../../lib/env'
import { db } from '../../../lib/firebase-server'

// Helper to check admin status
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const verifyAdmin = async (request: Request, context: any) => {
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

  // 2. Check Allowlist (Super Admins)
  const allowedEmails = getEmailList(context, 'ALLOWED_EMAILS')
  if (allowedEmails.includes(email.toLowerCase())) return user

  // 3. Check Firestore Role (if we had roles there, but for now allowlist is safest for "Generating Codes")
  // Let's also check if they are an 'admin' in Firestore?
  // Ideally code generation is restricted to Super Admins or specifically trusted users.
  // For now, let's stick to ALLOWED_EMAILS + 'approved' users who are marked as creators/admin?
  // Actually, implementation plan says "Admin Only". Let's stick to ALLOWED_EMAILS for now to be safe.

  return null
}

export const GET: APIRoute = async (context) => {
  const { request } = context
  const admin = await verifyAdmin(request, context)

  if (!admin) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
  }

  try {
    const invites = await db.getCollection('invites')
    return new Response(JSON.stringify({ success: true, invites }), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
}

export const POST: APIRoute = async (context) => {
  const { request } = context
  const admin = await verifyAdmin(request, context)

  if (!admin) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
  }

  try {
    // Generate a simple 6-char code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()

    await db.setDocument('invites', code, {
      code,
      createdBy: admin.email,
      createdAt: new Date().toISOString(),
    })

    return new Response(JSON.stringify({ success: true, code }), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
}

export const DELETE: APIRoute = async (context) => {
  const { request } = context
  const admin = await verifyAdmin(request, context)

  if (!admin) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
  }

  try {
    const { code } = await request.json()
    await db.deleteDocument('invites', code)
    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
}

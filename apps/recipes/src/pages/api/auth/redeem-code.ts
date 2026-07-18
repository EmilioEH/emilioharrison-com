import type { APIRoute } from 'astro'
import { getEnv } from '../../../lib/env'
import { db } from '../../../lib/firebase-server'
import { isInviteRedeemable } from '../../../lib/invite-codes'
import { rateLimit, clientIpFrom } from '../../../lib/rate-limit'

export const POST: APIRoute = async (context) => {
  const { request, locals } = context
  try {
    // Rate-limit redemption attempts per IP to blunt code brute-forcing. Fails open when
    // no KV is bound (local dev).
    const kv = locals?.runtime?.env?.SESSION
    const { limited } = await rateLimit(kv, `redeem:${clientIpFrom(request)}`, 10, 600)
    if (limited) {
      return new Response(JSON.stringify({ error: 'Too many attempts. Please try again later.' }), {
        status: 429,
      })
    }

    const { idToken, code } = await request.json()

    if (!idToken || !code) {
      return new Response(JSON.stringify({ error: 'Missing token or code' }), { status: 400 })
    }

    // 1. Verify Token
    const apiKey = getEnv(context, 'PUBLIC_FIREBASE_API_KEY')
    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      },
    )

    if (!verifyRes.ok) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 })
    }

    const data = await verifyRes.json()
    const user = data.users[0]
    const userId = user.localId
    const email = user.email
    const name = user.displayName || email || 'Chef'

    // 2. Validate Code — must exist, be pending (single-use), and not expired. All failures
    // return the same generic message so a probe can't distinguish "wrong" from "already used"
    // from "expired".
    const inviteDoc = await db.getDocument('invites', code).catch(() => null)

    if (!inviteDoc || !isInviteRedeemable(inviteDoc)) {
      return new Response(JSON.stringify({ error: 'Invalid or expired code' }), { status: 400 })
    }

    // 3. Promote User
    await db.setDocument('users', userId, {
      id: userId,
      email,
      displayName: name,
      joinedAt: new Date().toISOString(), // This will be overwritten if we merge, but for setDocument it replaces.
      // Ideally we should check if user exists first to preserve joinedAt, but for "new" users via invite this is fine.
      // If they were "pending", preserving their original request date is nice but not critical.
      status: 'approved',
      redeemedCode: code, // Audit trail
    })

    // 4. Consume Code (Mark as accepted)
    await db.updateDocument('invites', code, {
      status: 'accepted',
      acceptedBy: userId,
      acceptedByName: name,
      acceptedAt: new Date().toISOString(),
    })

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (error) {
    console.error('Redeem Code Error:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 })
  }
}

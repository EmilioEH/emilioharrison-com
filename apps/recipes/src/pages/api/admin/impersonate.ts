import type { APIRoute } from 'astro'
import { verifyAdmin } from '../../../lib/auth-admin'
import { db } from '../../../lib/firebase-server'
import type { User } from '../../../lib/types'

export const POST: APIRoute = async (context) => {
  const { request, cookies } = context

  // 1. Verify Requestor is Admin
  const adminUser = await verifyAdmin(request, context)
  if (!adminUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
  }

  try {
    const { userId } = await request.json()
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), { status: 400 })
    }

    // 2. Fetch Target User
    const targetUser = (await db.getDocument('users', userId)) as User | null

    if (!targetUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 })
    }

    // 3. Set Cookies
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      maxAge: 60 * 60 * 24, // 1 day
      sameSite: 'lax' as const,
    }

    // Store admin's original ID in admin_mask if not already there
    // If admin_mask already exists, we maintain the ORIGINAL admin ID (nested impersonation not supported/needed)
    const existingMask = cookies.get('admin_mask')?.value
    if (!existingMask) {
      // We know adminUser is valid, but verifyAdmin logic can be complex.
      // We trust the current valid session is the admin.
      const currentUserId = cookies.get('site_user')?.value
      if (currentUserId) {
        cookies.set('admin_mask', currentUserId, cookieOptions)
      }
    }

    // Update site_user to target
    cookies.set('site_user', targetUser.id, { ...cookieOptions, httpOnly: false })

    // Update other display cookies
    if (targetUser.email) {
      cookies.set('site_email', targetUser.email, cookieOptions)
    }
    if (targetUser.displayName) {
      cookies.set('site_username', targetUser.displayName, { ...cookieOptions, httpOnly: false })
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (error) {
    console.error('Impersonation error:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 })
  }
}

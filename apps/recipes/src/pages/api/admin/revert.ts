import type { APIRoute } from 'astro'
import { db } from '../../../lib/firebase-server'
import { getEmailList } from '../../../lib/env'
import type { User } from '../../../lib/types'

export const POST: APIRoute = async (context) => {
  const { cookies } = context

  const adminMaskId = cookies.get('admin_mask')?.value
  if (!adminMaskId) {
    return new Response(JSON.stringify({ error: 'No active impersonation' }), { status: 400 })
  }

  try {
    // Verify the original user was indeed an admin (security check)
    const originalUser = (await db.getDocument('users', adminMaskId)) as User | null
    if (!originalUser || !originalUser.email) {
      return new Response(JSON.stringify({ error: 'Invalid admin mask' }), { status: 403 })
    }

    const adminEmails = getEmailList(context, 'ADMIN_EMAILS')
    if (!adminEmails.includes(originalUser.email.toLowerCase())) {
      return new Response(JSON.stringify({ error: 'Original user is not an admin' }), {
        status: 403,
      })
    }

    // Restore cookies
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: 'lax' as const,
    }

    cookies.set('site_user', originalUser.id, { ...cookieOptions, httpOnly: false })
    cookies.set('site_email', originalUser.email, cookieOptions)
    cookies.set('site_username', originalUser.displayName, { ...cookieOptions, httpOnly: false })

    // Delete mask
    cookies.delete('admin_mask', { path: '/' })

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (e) {
    console.error('Revert error', e)
    return new Response(JSON.stringify({ error: 'Internal Error' }), { status: 500 })
  }
}

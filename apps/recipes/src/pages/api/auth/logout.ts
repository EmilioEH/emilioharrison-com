import type { APIRoute } from 'astro'
import { SESSION_COOKIE_NAME } from '../../../lib/session'

export const POST: APIRoute = async ({ cookies }) => {
  cookies.delete(SESSION_COOKIE_NAME, { path: '/' })
  cookies.delete('site_user', { path: '/' })
  cookies.delete('site_username', { path: '/' })
  // Legacy cookies from the pre-signed-session scheme — clear them so stale
  // browsers don't keep sending them around.
  cookies.delete('site_auth', { path: '/' })
  cookies.delete('site_email', { path: '/' })

  return new Response(JSON.stringify({ success: true }), { status: 200 })
}

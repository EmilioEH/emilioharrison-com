import { defineMiddleware } from 'astro:middleware'
import { getEnv } from './lib/env'
import { isProtectedRoute, isLoginPage, isPublicApiRoute, getLoginUrl } from './lib/routes'

export const onRequest = defineMiddleware(async (context, next) => {
  const { cookies, url, redirect } = context

  // Check if the user is trying to access the protected route
  // Exclude login page to avoid redirect loops
  if (isProtectedRoute(url.pathname) && !isLoginPage(url.pathname)) {
    // Allow public API routes (e.g. login, feedback)
    if (url.pathname.includes('/api/')) {
      if (isPublicApiRoute(url.pathname)) {
        return next()
      }
      // If not public, fall through to auth check
    }

    const authCookie = cookies.get('site_auth')
    const userCookie = cookies.get('site_user')
    const emailCookie = cookies.get('site_email')

    // If no cookie or cookie value is wrong, OR if user name is missing
    if (!authCookie || authCookie.value !== 'true' || !userCookie || !userCookie.value) {
      if (url.pathname.includes('/api/')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return redirect(getLoginUrl())
    }

    // Validate email if whitelist is configured
    const allowedEmailsEnv = getEnv(context, 'ALLOWED_EMAILS')
    if (allowedEmailsEnv) {
      const allowedEmails = allowedEmailsEnv.split(',').map((e: string) => e.trim().toLowerCase())
      const userEmail = emailCookie?.value?.toLowerCase()

      if (!userEmail || !allowedEmails.includes(userEmail)) {
        if (url.pathname.includes('/api/')) {
          return new Response(JSON.stringify({ error: 'Unauthorized email' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        return redirect(getLoginUrl())
      }
    }
  }

  return next()
})

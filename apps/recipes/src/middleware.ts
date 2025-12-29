import { defineMiddleware } from 'astro:middleware'
import { getEnv } from './lib/env'

export const onRequest = defineMiddleware(async (context, next) => {
  const { cookies, url, redirect } = context

  // Check if the user is trying to access the protected route
  // Exclude login page to avoid redirect loops and allow form submission
  if (url.pathname.startsWith('/protected') && !url.pathname.includes('/login')) {
    // Allow API routes without authentication
    if (url.pathname.includes('/api/')) {
      return next()
    }

    const authCookie = cookies.get('site_auth')
    const userCookie = cookies.get('site_user')
    const emailCookie = cookies.get('site_email')

    // If no cookie or cookie value is wrong, OR if user name is missing, redirect to login
    if (!authCookie || authCookie.value !== 'true' || !userCookie || !userCookie.value) {
      return redirect('/protected/recipes/login')
    }

    // Validate email if whitelist is configured
    const allowedEmailsEnv = getEnv(context, 'ALLOWED_EMAILS')
    if (allowedEmailsEnv) {
      const allowedEmails = allowedEmailsEnv.split(',').map((e: string) => e.trim().toLowerCase())
      const userEmail = emailCookie?.value?.toLowerCase()

      if (!userEmail || !allowedEmails.includes(userEmail)) {
        // Redirect to login with error (handled by client logic or just a clean slate)
        return redirect('/protected/recipes/login')
      }
    }
  }

  return next()
})

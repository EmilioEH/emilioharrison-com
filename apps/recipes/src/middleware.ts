import { defineMiddleware } from 'astro:middleware'
import type { APIContext } from 'astro'
import { isProtectedRoute, isLoginPage, isPublicApiRoute, getLoginUrl } from './lib/routes'
import { setRequestContext } from './lib/request-context'

/** Creates a 401 JSON response for API routes */
const createUnauthorizedApiResponse = (message: string) =>
  new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })

/** Checks if the request is to an API route */
const isApiRoute = (pathname: string) => pathname.includes('/api/')

/** Returns unauthorized response or redirect based on route type */
const handleUnauthorized = (context: APIContext, message: string) => {
  if (isApiRoute(context.url.pathname)) {
    return createUnauthorizedApiResponse(message)
  }
  return context.redirect(getLoginUrl())
}

/** Validates user authentication from cookies */
const isAuthenticated = (context: APIContext): boolean => {
  const authCookie = context.cookies.get('site_auth')
  const userCookie = context.cookies.get('site_user')
  return authCookie?.value === 'true' && !!userCookie?.value
}

export const onRequest = defineMiddleware(async (context, next) => {
  // Store the request context for modules that need access to Cloudflare runtime env
  // (like firebase-server.ts which needs FIREBASE_SERVICE_ACCOUNT)
  setRequestContext(context)

  const { url } = context
  const pathname = url.pathname

  // Skip non-protected routes and login page
  if (!isProtectedRoute(pathname) || isLoginPage(pathname)) {
    return next()
  }

  // Allow public API routes (e.g. login, feedback submission)
  if (isApiRoute(pathname) && isPublicApiRoute(pathname)) {
    return next()
  }

  // Check authentication
  if (!isAuthenticated(context)) {
    return handleUnauthorized(context, 'Unauthorized')
  }

  // Legacy isEmailAuthorized check removed.
  // Access control is now handled at login time via API/Firestore logic.
  // If the user has valid cookies, they are assumed to be authorized.

  return next()
})

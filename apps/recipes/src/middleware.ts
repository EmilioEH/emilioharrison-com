import { defineMiddleware } from 'astro:middleware'
import type { APIContext } from 'astro'
import { isProtectedRoute, isLoginPage, isPublicApiRoute, getLoginUrl } from './lib/routes'
import { setRequestContext } from './lib/request-context'
import { getSessionFromCookies } from './lib/session'

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

export const onRequest = defineMiddleware(async (context, next) => {
  // Store the request context for modules that need access to Cloudflare runtime env
  // (like firebase-server.ts which needs FIREBASE_SERVICE_ACCOUNT)
  setRequestContext(context)

  // Resolve the signed session once per request (lib/session.ts) — the only identity the
  // server trusts. Pages (login/index) read it from locals instead of raw cookies.
  context.locals.session = getSessionFromCookies(context.cookies)

  const { url } = context
  const pathname = url.pathname

  // Skip non-protected routes and login page
  if (!isProtectedRoute(pathname) || isLoginPage(pathname)) {
    return next()
  }

  // Allow public API routes (e.g. login, invite redemption, image serving)
  if (isApiRoute(pathname) && isPublicApiRoute(pathname, context.request.method)) {
    return next()
  }

  // Check authentication — a verified session, not forgeable display cookies.
  if (!context.locals.session) {
    return handleUnauthorized(context, 'Unauthorized')
  }

  return next()
})

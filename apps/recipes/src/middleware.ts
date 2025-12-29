import { defineMiddleware, type APIContext } from 'astro:middleware'
import { getEmailList } from './lib/env'
import { isProtectedRoute, isLoginPage, isPublicApiRoute, getLoginUrl } from './lib/routes'

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

/** Validates user email against whitelist */
const isEmailAuthorized = (context: APIContext): boolean => {
  const allowedEmails = getEmailList(context, 'ALLOWED_EMAILS')
  if (allowedEmails.length === 0) return true // No whitelist = all allowed

  const emailCookie = context.cookies.get('site_email')
  const userEmail = emailCookie?.value?.toLowerCase()
  return !!userEmail && allowedEmails.includes(userEmail)
}

export const onRequest = defineMiddleware(async (context, next) => {
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

  // Check email authorization
  if (!isEmailAuthorized(context)) {
    return handleUnauthorized(context, 'Unauthorized email')
  }

  return next()
})

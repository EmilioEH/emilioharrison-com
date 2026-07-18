/**
 * Application Base URL derived from environment configuration.
 * Ensures strict consistency with astro.config.mjs 'base' setting.
 */
export const APP_BASE_URL = import.meta.env.BASE_URL || '/'

// Public API routes that do NOT require authentication. Entries without `methods`
// are public for every method; otherwise only the listed methods skip auth.
const PUBLIC_API_ROUTES: Array<{ prefix: string; methods?: string[] }> = [
  { prefix: '/api/auth/login' },
  { prefix: '/api/auth/logout' },
  { prefix: '/api/auth/request-access' }, // Access request for new users
  { prefix: '/api/auth/redeem-code' }, // Invite code redemption for new users
  // Image serving stays public: the AI enhancement pipeline re-fetches
  // `/api/uploads/<key>` server-side without cookies (see ai-parser.ts).
  // Uploading (`POST /api/uploads`) requires an authenticated session.
  { prefix: '/api/uploads/', methods: ['GET', 'HEAD'] },
]

/**
 * Checks if the given pathname falls under the protected application routes.
 * Uses strict prefix matching against the configured Base URL.
 *
 * @param pathname The URL pathname (e.g. /protected/recipes/dashboard)
 */
export function isProtectedRoute(pathname: string): boolean {
  // If base is '/', arguably everything is protected except explicit public routes?
  // But typically 'base' implies the app root.
  // In this app, everything under the base path is considered part of the "Recipes App"
  // which is protected, except for the login page and public assets/APIs.

  return pathname.startsWith(APP_BASE_URL)
}

/**
 * Checks if the route is the Login page, to avoid redirect loops.
 */
export function isLoginPage(pathname: string): boolean {
  // Construct the login path dynamically
  // Ensure we don't double slash
  const base = APP_BASE_URL.endsWith('/') ? APP_BASE_URL.slice(0, -1) : APP_BASE_URL
  return pathname === `${base}/login` || pathname === `${base}/login/`
}

/**
 * Checks if the pathname (and request method) matches a whitelisted public API route.
 */
export function isPublicApiRoute(pathname: string, method: string): boolean {
  const normalizedMethod = method.toUpperCase()
  return PUBLIC_API_ROUTES.some(
    (route) =>
      pathname.includes(route.prefix) &&
      (!route.methods || route.methods.includes(normalizedMethod)),
  )
}

/**
 * Helper to get the full Login URL for redirects.
 */
export function getLoginUrl(): string {
  const base = APP_BASE_URL.endsWith('/') ? APP_BASE_URL.slice(0, -1) : APP_BASE_URL
  return `${base}/login`
}

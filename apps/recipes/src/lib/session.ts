/**
 * Signed session tokens — the server's single source of truth for request identity.
 *
 * At login (`api/auth/login.ts`) the server verifies a Firebase ID token and issues a
 * `site_session` cookie containing `base64url(JSON payload).hmacSha256Hex(payload)`. Every
 * later request resolves identity by verifying that signature server-side; the legacy
 * `site_user` / `site_username` cookies still exist but are display-only (the client shell
 * reads them for cache keys and greetings) and are never trusted by the server.
 *
 * The signing secret is `SESSION_SECRET` when configured, otherwise it is derived from the
 * `FIREBASE_SERVICE_ACCOUNT` private key — key material every real deployment already has,
 * so no new configuration is required for the scheme to be enforced.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { AstroCookies } from 'astro'
import { getEnv } from './env'
import { getRequestContext } from './request-context'

export const SESSION_COOKIE_NAME = 'site_session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days

export interface SessionPayload {
  /** Firebase Auth UID, verified against a Firebase ID token at login. */
  uid: string
  /** Email verified at login; used for admin-allowlist checks. */
  email?: string
  /** Display name captured at login. */
  name?: string
  /** Expiry, unix seconds. */
  exp: number
}

const toBase64Url = (input: string): string =>
  Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

const fromBase64Url = (input: string): string => {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  return Buffer.from(padded, 'base64').toString('utf8')
}

/**
 * Resolve the HMAC signing secret for session cookies. Returns null when neither
 * `SESSION_SECRET` nor `FIREBASE_SERVICE_ACCOUNT` is available (auth then fails closed).
 */
export function getSessionSecret(context?: unknown): string | null {
  const ctx = context ?? getRequestContext()

  const explicit = getEnv(ctx, 'SESSION_SECRET')
  if (explicit) return explicit

  const serviceAccount = getEnv(ctx, 'FIREBASE_SERVICE_ACCOUNT')
  if (serviceAccount) {
    try {
      const parsed = JSON.parse(serviceAccount) as { private_key?: string }
      if (parsed.private_key) return parsed.private_key
    } catch {
      // Malformed service account JSON — fall through to null
    }
  }

  return null
}

export function createSessionToken(
  secret: string,
  identity: { uid: string; email?: string; name?: string },
  maxAgeSeconds: number = SESSION_MAX_AGE_SECONDS,
): string {
  const payload: SessionPayload = {
    uid: identity.uid,
    ...(identity.email ? { email: identity.email } : {}),
    ...(identity.name ? { name: identity.name } : {}),
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  }
  const encoded = toBase64Url(JSON.stringify(payload))
  const signature = createHmac('sha256', secret).update(encoded).digest('hex')
  return `${encoded}.${signature}`
}

/** Verify a session token's signature and expiry. Returns null for anything invalid. */
export function verifySessionToken(secret: string, token: string): SessionPayload | null {
  const dot = token.lastIndexOf('.')
  if (dot <= 0) return null

  const encoded = token.slice(0, dot)
  const signature = token.slice(dot + 1)

  const expected = createHmac('sha256', secret).update(encoded).digest()
  const given = Buffer.from(signature, 'hex')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null

  try {
    const payload = JSON.parse(fromBase64Url(encoded)) as SessionPayload
    if (!payload || typeof payload.uid !== 'string' || !payload.uid) return null
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

/**
 * Resolve the verified session for a request. This is the only supported way to answer
 * "who is making this request" server-side.
 *
 * In `PUBLIC_TEST_MODE` builds (E2E only — never production), the legacy forged cookies
 * (`site_user`/`site_email`) are accepted so Playwright specs can establish identity
 * without a real Firebase login.
 */
export function getSessionFromCookies(cookies: AstroCookies): SessionPayload | null {
  const token = cookies.get(SESSION_COOKIE_NAME)?.value
  if (token) {
    const secret = getSessionSecret()
    if (secret) {
      const payload = verifySessionToken(secret, token)
      if (payload) return payload
    }
  }

  // `import.meta.env.PUBLIC_TEST_MODE` is statically replaced by Vite (reliable in the built
  // worker); `getEnv` covers process.env in unit tests. Never true in a production build.
  const isTestMode =
    import.meta.env.PUBLIC_TEST_MODE === 'true' ||
    getEnv(getRequestContext(), 'PUBLIC_TEST_MODE') === 'true'
  if (isTestMode) {
    const uid = cookies.get('site_user')?.value
    if (uid) {
      return {
        uid,
        email: cookies.get('site_email')?.value,
        name: cookies.get('site_username')?.value || uid,
        exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
      }
    }
  }

  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getEnv(context: any, key: string): string {
  // 1. Check Cloudflare runtime (if available through context)
  const cloudflareEnv = context?.locals?.runtime?.env?.[key]
  if (cloudflareEnv) return cloudflareEnv

  // 2. Check process.env (Node.js/CI/Local)
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key] as string
  }

  // 3. Fallback to static import.meta.env for known keys
  // This is the most reliable way for Vite to replace values
  if (key === 'ALLOWED_EMAILS') return import.meta.env.ALLOWED_EMAILS || ''
  if (key === 'ADMIN_EMAILS') return import.meta.env.ADMIN_EMAILS || ''
  if (key === 'PUBLIC_FIREBASE_API_KEY') return import.meta.env.PUBLIC_FIREBASE_API_KEY || ''
  if (key === 'FIREBASE_SERVICE_ACCOUNT') return import.meta.env.FIREBASE_SERVICE_ACCOUNT || ''

  // 4. Dynamic check as last resort
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dynamicEnv = (import.meta.env as any)?.[key]
  if (dynamicEnv) return dynamicEnv

  return ''
}

/**
 * Kill-switch for the self-hosted background AI worker (see BACKGROUND-JOBS-VM-PLAN.md).
 *
 * When `true`, the slow background jobs (recipe enhancement after import, grocery-list
 * generation) are handed off to the VM worker by writing a `pending` Firestore doc and returning
 * immediately — instead of running under Cloudflare's `ctx.waitUntil` (which is capped at ~30s).
 * When absent/`false` (the default), the legacy in-request `waitUntil` path runs, so merging the
 * cutover changes nothing in production until this flag is explicitly set on the Cloudflare env.
 * Flipping it back to `false` is an instant rollback — no redeploy.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isBackgroundWorkerEnabled(context: any): boolean {
  return getEnv(context, 'BACKGROUND_WORKER_ENABLED') === 'true'
}

/**
 * Safely parse a comma-separated email list from an environment variable.
 * Returns an empty array if the env var is empty, undefined, or malformed.
 *
 * @example
 * const adminEmails = getEmailList(context, 'ADMIN_EMAILS')
 * // Returns: ['admin@example.com'] or []
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getEmailList(context: any, key: string): string[] {
  const envValue = getEnv(context, key)
  if (!envValue || typeof envValue !== 'string') {
    return []
  }
  return envValue
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

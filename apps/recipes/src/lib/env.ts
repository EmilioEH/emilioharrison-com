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

  // 4. Dynamic check as last resort
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dynamicEnv = (import.meta.env as any)?.[key]
  if (dynamicEnv) return dynamicEnv

  return ''
}

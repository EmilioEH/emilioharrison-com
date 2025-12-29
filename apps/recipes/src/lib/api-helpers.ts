import type { AstroCookies, APIContext } from 'astro'
import { GoogleGenAI } from '@google/genai'

// Define Cloudflare Env interface if not globally available,
// or use a generic approach. Ideally this should come from App.Locals or separate type def.
// For now, we type safely around 'any' inside this specific helper.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getCloudflareEnv(locals: App.Locals): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const runtime = (locals as any).runtime
  if (!runtime || !runtime.env) {
    // Fallback to import.meta.env for local dev if runtime is missing
    return import.meta.env
  }
  return runtime.env
}

/**
 * Extracts the authenticated user ID from cookies.
 * Returns null if not authenticated.
 */
export function getAuthUser(cookies: AstroCookies): string | null {
  const userCookie = cookies.get('site_user')
  return userCookie?.value || null
}

/**
 * Standard 401 Unauthorized Response
 */
export function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Standard 500 Internal Server Error Response
 */
export function serverErrorResponse(message: string = 'Internal Server Error'): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Standard 400 Bad Request Response
 */
export function badRequestResponse(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Initializes the Google Generative AI client using the environment from locals or import.meta.
 * Throws an error if the API key is missing.
 */
export function initGeminiClient(locals: APIContext['locals']): GoogleGenAI {
  const env = getCloudflareEnv(locals)
  const apiKey = env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY configuration')
  }

  return new GoogleGenAI({ apiKey })
}

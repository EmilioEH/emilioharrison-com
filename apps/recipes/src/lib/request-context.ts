/**
 * Request Context Store
 *
 * This module provides a way to store and access the Astro request context
 * across the application, particularly for accessing Cloudflare runtime
 * environment variables in modules that don't have direct access to the
 * request context (like the Firebase server singleton).
 *
 * The middleware sets this context at the start of each request.
 */

import type { APIContext } from 'astro'

// Store for the current request's context
// In Cloudflare Workers, each request runs in isolation, so this is safe
let currentContext: APIContext | null = null

/**
 * Set the current request context. Called by middleware at request start.
 */
export function setRequestContext(context: APIContext): void {
  currentContext = context
}

/**
 * Get the current request context. Returns null if not set.
 */
export function getRequestContext(): APIContext | null {
  return currentContext
}

/**
 * Clear the request context. Optional cleanup.
 */
export function clearRequestContext(): void {
  currentContext = null
}

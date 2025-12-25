/// <reference types="astro/client" />

declare global {
  namespace App {
    interface Locals {
      runtime: {
        env: {
          SITE_PASSWORD: string
          GEMINI_API_KEY?: string
          SESSION: import('@cloudflare/workers-types').KVNamespace
        }
        cf: import('@cloudflare/workers-types').IncomingRequestCfProperties
        ctx: {
          waitUntil: (promise: Promise<unknown>) => void
          passThroughOnException: () => void
        }
      }
    }
  }
}

export {}

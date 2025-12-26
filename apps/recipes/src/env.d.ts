/// <reference types="astro/client" />

declare global {
  namespace App {
    interface Locals {
      runtime: {
        env: {
          SITE_PASSWORD: string
          GEMINI_API_KEY?: string
          SESSION: import('@cloudflare/workers-types').KVNamespace
          DB: import('@cloudflare/workers-types').D1Database
          BUCKET: import('@cloudflare/workers-types').R2Bucket
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

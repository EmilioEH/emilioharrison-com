/// <reference types="astro/client" />

declare global {
  namespace App {
    interface Locals {
      runtime: {
        env: {
          SITE_PASSWORD: string
          GEMINI_API_KEY?: string
          SESSION: import('@cloudflare/workers-types').KVNamespace
          PUBLIC_FIREBASE_API_KEY: string
          PUBLIC_FIREBASE_AUTH_DOMAIN: string
          PUBLIC_FIREBASE_PROJECT_ID: string
          PUBLIC_FIREBASE_STORAGE_BUCKET: string
          PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string
          PUBLIC_FIREBASE_APP_ID: string
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

/// <reference types="astro/client" />

export interface ImportMetaEnv {
  readonly PUBLIC_TEST_MODE?: string
  readonly PUBLIC_FIREBASE_API_KEY: string
  readonly PUBLIC_FIREBASE_AUTH_DOMAIN: string
  readonly PUBLIC_FIREBASE_PROJECT_ID: string
  readonly PUBLIC_FIREBASE_STORAGE_BUCKET: string
  readonly PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string
  readonly PUBLIC_FIREBASE_APP_ID: string
  readonly PUBLIC_VAPID_KEY: string
  readonly VAPID_PRIVATE_KEY: string
  readonly VAPID_SUBJECT: string
}

declare global {
  namespace App {
    interface Locals {
      runtime: {
        env: {
          GEMINI_API_KEY?: string
          SESSION: import('@cloudflare/workers-types').KVNamespace
          PUBLIC_FIREBASE_API_KEY: string
          PUBLIC_FIREBASE_AUTH_DOMAIN: string
          PUBLIC_FIREBASE_PROJECT_ID: string
          PUBLIC_FIREBASE_STORAGE_BUCKET: string
          PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string
          PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string
          PUBLIC_FIREBASE_APP_ID: string
          PUBLIC_VAPID_KEY: string
          VAPID_PRIVATE_KEY: string
          VAPID_SUBJECT: string
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

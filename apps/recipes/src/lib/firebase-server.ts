import { FirebaseRestService } from './firebase-rest'
import type { ServiceAccount } from './types'

// Helper to get service account from Env or File
const getServiceAccount = async (): Promise<ServiceAccount> => {
  // 1. Try Environment Variable (Production/CI)
  // Ensure we don't crash in Node.js where import.meta.env isn't defined by Vite
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env = (import.meta as any).env
  const envVar = env?.FIREBASE_SERVICE_ACCOUNT

  if (envVar) {
    try {
      if (typeof envVar === 'string') {
        return JSON.parse(envVar) as ServiceAccount
      }
      return envVar as unknown as ServiceAccount
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT env var', e)
    }
  }

  // 2. Fallback to local file (Development)
  try {
    // Use import.meta.glob to safely check for the file without breaking the build if missing.
    // import.meta.glob returns an object { path: function }. If file is missing, object is empty.
    const modules = import.meta.glob('../../firebase-service-account.json', { eager: true })

    // The key must match the pattern exactly or be resolved.
    // Vite globs are relative to the file.
    const key = '../../firebase-service-account.json'

    if (modules[key]) {
      // With eager: true, modules[key] is the module itself (including default export)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (modules[key] as any).default as unknown as ServiceAccount
    }
  } catch (e) {
    console.warn('Local service account file check failed or empty.', e)
  }

  // 3. Fallback to Node.js (Scripts/Local)
  try {
    const mod = await import('../../firebase-service-account.json')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (mod as any).default as unknown as ServiceAccount
  } catch {
    // Ignore if missing, will throw below
  }

  // If we get here, neither Env nor File worked.
  throw new Error(
    'Service Account not found via Env (FIREBASE_SERVICE_ACCOUNT) or File (firebase-service-account.json). Please check your configuration.',
  )
}

// Top-level await for async loading
const serviceAccount = await getServiceAccount()

export const firebase = new FirebaseRestService(serviceAccount)
export const db = firebase // Alias for now, though API is different
export const bucket = firebase // Alias for now

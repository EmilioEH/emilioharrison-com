import { FirebaseRestService } from './firebase-rest'
import type { ServiceAccount } from './types'

// Helper to get service account from Env or File
const getServiceAccount = async (): Promise<ServiceAccount> => {
  // 1. Try Environment Variable (Production/CI)
  const envVar = import.meta.env.FIREBASE_SERVICE_ACCOUNT
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
    // Dynamic import to avoid build errors if file is missing
    const serviceAccountModule = await import('../../firebase-service-account.json')
    return serviceAccountModule.default as unknown as ServiceAccount
  } catch (e) {
    console.error('Error loading service account:', e)
    throw new Error(
      'Service Account not found via Env (FIREBASE_SERVICE_ACCOUNT) or File (firebase-service-account.json). Please check your configuration.',
    )
  }
}

// Top-level await for async loading
const serviceAccount = await getServiceAccount()

export const firebase = new FirebaseRestService(serviceAccount)
export const db = firebase // Alias for now, though API is different
export const bucket = firebase // Alias for now

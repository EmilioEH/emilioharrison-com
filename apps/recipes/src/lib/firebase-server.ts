import { FirebaseRestService } from './firebase-rest'
import type { ServiceAccount } from './types'
import { getEnv } from './env'

// Cache the service account
let cachedServiceAccount: ServiceAccount | null = null

// Helper to get service account from Env or File
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getServiceAccount = async (context?: any): Promise<ServiceAccount> => {
  if (cachedServiceAccount) return cachedServiceAccount

  // 1. Try Environment Variable (Production/CI)
  const envVar = getEnv(context, 'FIREBASE_SERVICE_ACCOUNT')

  if (envVar) {
    try {
      if (typeof envVar === 'string') {
        cachedServiceAccount = JSON.parse(envVar) as ServiceAccount
        return cachedServiceAccount
      }
      cachedServiceAccount = envVar as unknown as ServiceAccount
      return cachedServiceAccount
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT env var', e)
    }
  }

  // 2. Fallback to local file (Development only - file won't exist in production)
  try {
    // Use dynamic import for JSON file (works with Vite's JSON handling)
    const serviceAccountModule = await import('../../firebase-service-account.json')
    if (serviceAccountModule.default) {
      cachedServiceAccount = serviceAccountModule.default as unknown as ServiceAccount
      return cachedServiceAccount
    }
  } catch (e) {
    console.warn('Local service account file check failed or empty.', e)
  }

  throw new Error(
    'Service Account not found via Env (FIREBASE_SERVICE_ACCOUNT) or File (firebase-service-account.json).',
  )
}

/**
 * Lazy DB instance that can be initialized on first use.
 * This is a Proxy that delegates to the actual FirebaseRestService.
 */

let _dbInstance: FirebaseRestService | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getDb(context?: any): Promise<FirebaseRestService> {
  if (!_dbInstance) {
    const sa = await getServiceAccount(context)
    _dbInstance = new FirebaseRestService(sa)
  }
  return _dbInstance
}

// Export a Proxy for 'db' that auto-initializes
export const db = new Proxy({} as FirebaseRestService, {
  get(target, prop) {
    // If it's a method, return an async wrapper
    if (
      [
        'getCollection',
        'getDocument',
        'createDocument',
        'setDocument',
        'updateDocument',
        'deleteDocument',
        'uploadFile',
        'downloadFile',
        'getFileMetadata',
      ].includes(prop as string)
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return async (...args: any[]) => {
        const instance = await getDb()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (instance as any)[prop](...args)
      }
    }

    // For properties like projectId, we return a getter that might throw if not initialized
    // but in this app, projectId is derived from the service account which we can load.
    if (prop === 'projectId') {
      if (_dbInstance) return _dbInstance.projectId
      // This is a bit tricky since it's sync. For now, most usages are in async contexts.
      console.warn(
        'Accessing db.projectId before initialization. This may fail if not initialized elsewhere.',
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (target as any)[prop]
  },
})

// Alias for storage operations (uses same REST service)
// Alias for storage operations (uses same REST service)
export const bucket = db

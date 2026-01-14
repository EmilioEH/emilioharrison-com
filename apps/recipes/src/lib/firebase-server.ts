import { FirebaseRestService } from './firebase-rest'
import type { ServiceAccount } from './types'
import { getEnv } from './env'
import { getRequestContext } from './request-context'

// Cache the service account
let cachedServiceAccount: ServiceAccount | null = null

// Helper to get service account from Env or File
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getServiceAccount = async (context?: any): Promise<ServiceAccount> => {
  if (cachedServiceAccount) return cachedServiceAccount

  // Use the provided context, or fall back to the request context store
  // (set by middleware for Cloudflare runtime env access)
  const effectiveContext = context ?? getRequestContext()

  // 1. Try Environment Variable (Production/CI)
  const envVar = getEnv(effectiveContext, 'FIREBASE_SERVICE_ACCOUNT')

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
    // Use import.meta.glob with eager:true - returns {} when file doesn't exist (won't break build)
    // but correctly loads the module when it does exist
    const modules = import.meta.glob('../../firebase-service-account.json', {
      eager: true,
    }) as Record<string, { default: ServiceAccount }>

    const firstModule = Object.values(modules)[0]
    if (firstModule?.default) {
      cachedServiceAccount = firstModule.default
      return cachedServiceAccount
    }
  } catch (e) {
    console.warn('Local service account file check failed or empty.', e)
  }

  if (import.meta.env?.SSR === false) {
    // Client-side should never call this
    throw new Error('Firebase Admin SDK cannot be used on client side')
  }

  throw new Error(
    'Service Account not found via Env (FIREBASE_SERVICE_ACCOUNT) or File (firebase-service-account.json). ' +
      'Please check your .env or server configuration.',
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

// Extended interface for the proxy that includes async getProjectId
interface FirebaseDbProxy extends FirebaseRestService {
  getProjectId(): Promise<string>
}

// Export a Proxy for 'db' that auto-initializes
export const db = new Proxy({} as FirebaseDbProxy, {
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
        'getProjectId', // New: async accessor for projectId
      ].includes(prop as string)
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return async (...args: any[]) => {
        // CHECK FOR TEST MODE MOCKS
        const context = getRequestContext()
        const isTestUser = context?.cookies?.get('site_user')?.value === 'TestUser'

        if (typeof process !== 'undefined' && process.env.DEBUG_TESTS) {
          console.log('[FirebaseServer] Checking Test Mode:', {
            hasContext: !!context,
            siteUser: context?.cookies?.get('site_user')?.value,
            isTestUser,
          })
        }

        const testMode =
          isTestUser ||
          (typeof process !== 'undefined'
            ? process.env.PUBLIC_TEST_MODE === 'true'
            : import.meta.env.PUBLIC_TEST_MODE === 'true')

        if (testMode) {
          if (prop === 'getDocument') {
            const [collection, id] = args
            // Basic User Mock
            if (collection === 'users' && id === 'TestUser') {
              return {
                id: 'TestUser',
                email: 'emilioeh1991@gmail.com',
                displayName: 'Emilio',
                hasOnboarded: true,
              }
            }
            // Secondary User Mock
            if (collection === 'users' && id === 'User2') {
              return {
                id: 'User2',
                email: 'guest@example.com',
                displayName: 'Guest',
                hasOnboarded: true,
              }
            }
            // Family Mock
            if (collection === 'families' && id === 'test-family-id') {
              return {
                id: 'test-family-id',
                name: 'Test Family',
                members: ['TestUser'],
                createdBy: 'TestUser',
              }
            }
          }
          // Fallthrough for other methods or unmocked data
        }

        const instance = await getDb()
        // Special case: getProjectId returns projectId from instance
        if (prop === 'getProjectId') {
          return instance.projectId
        }
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

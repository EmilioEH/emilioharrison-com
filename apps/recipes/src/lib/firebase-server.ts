import { FirebaseRestService } from './firebase-rest'
import type { ServiceAccount } from './types'

// JSON import might be strict, handled by bundler
import serviceAccountRaw from '../../firebase-service-account.json'

const serviceAccount = serviceAccountRaw as unknown as ServiceAccount

export const firebase = new FirebaseRestService(serviceAccount)
export const db = firebase // Alias for now, though API is different
export const bucket = firebase // Alias for now

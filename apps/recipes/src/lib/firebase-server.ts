import { FirebaseRestService } from './firebase-rest'
import type { ServiceAccount } from './types'

import serviceAccountRaw from '../../firebase-service-account.json'

const serviceAccount = import.meta.env.FIREBASE_SERVICE_ACCOUNT
  ? typeof import.meta.env.FIREBASE_SERVICE_ACCOUNT === 'string'
    ? JSON.parse(import.meta.env.FIREBASE_SERVICE_ACCOUNT)
    : import.meta.env.FIREBASE_SERVICE_ACCOUNT
  : (serviceAccountRaw as unknown as ServiceAccount)

export const firebase = new FirebaseRestService(serviceAccount)
export const db = firebase // Alias for now, though API is different
export const bucket = firebase // Alias for now

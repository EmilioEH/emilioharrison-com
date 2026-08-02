import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, type Firestore, FieldValue } from 'firebase-admin/firestore'
import { isStale } from './reaper'
import type { WorkerConfig } from './config'
import type { Recipe, WorkerStore } from './types'

/**
 * Initialises firebase-admin from the service-account JSON and returns the Firestore handle
 * (used both by the store below and by the onSnapshot listeners in index.ts). The env JSON is the
 * raw Google-downloaded service account (snake_case), so map its fields to what `cert()` wants.
 */
export function initFirestore(config: WorkerConfig): Firestore {
  if (getApps().length === 0) {
    const sa = config.serviceAccount as {
      project_id?: string
      client_email?: string
      private_key?: string
    }
    initializeApp({
      credential: cert({
        projectId: sa.project_id,
        clientEmail: sa.client_email,
        privateKey: sa.private_key,
      }),
    })
  }
  const db = getFirestore()
  // Job results can carry explicitly-undefined fields; let the SDK drop them rather than reject
  // the write (the Cloudflare REST client serialised these as nullValue — same net effect).
  db.settings({ ignoreUndefinedProperties: true })
  return db
}

const nowIso = () => new Date().toISOString()

/** firebase-admin-backed WorkerStore. All claims are transactional (see the interface doc). */
export function createFirestoreStore(db: Firestore): WorkerStore {
  const groceryLists = db.collection('grocery_lists')

  return {
    async claimGrocery(listId) {
      const ref = groceryLists.doc(listId)
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref)
        if (!snap.exists) return null
        const data = snap.data() as { status?: string; inputRecipes?: Recipe[] }
        if (data.status !== 'pending') return null
        tx.update(ref, {
          status: 'processing',
          progress: 0,
          message: 'Analyzing recipes...',
          groceryClaimedAt: nowIso(),
          updatedAt: nowIso(),
        })
        return Array.isArray(data.inputRecipes) ? data.inputRecipes : []
      })
    },

    async writeGroceryProgress(listId, progress, message) {
      await groceryLists.doc(listId).update({ progress, message, updatedAt: nowIso() })
    },

    async completeGrocery(listId, ingredients) {
      await groceryLists.doc(listId).update({
        ingredients,
        status: 'complete',
        progress: 100,
        message: 'Done!',
        updatedAt: nowIso(),
        // The input recipe payload was only needed to run the job — don't leave it on the doc.
        inputRecipes: FieldValue.delete(),
        groceryClaimedAt: FieldValue.delete(),
      })
    },

    async failGrocery(listId, message) {
      await groceryLists.doc(listId).update({
        status: 'error',
        message,
        updatedAt: nowIso(),
        groceryClaimedAt: FieldValue.delete(),
      })
    },

    async reapStuckGrocery(deadlineMs, now) {
      const snap = await groceryLists.where('status', '==', 'processing').get()
      let count = 0
      for (const doc of snap.docs) {
        const claimedAt = (doc.data() as { groceryClaimedAt?: string }).groceryClaimedAt
        if (!isStale(claimedAt, now, deadlineMs)) continue
        await doc.ref.update({
          status: 'error',
          message: 'Generation did not finish in time and was cancelled.',
          updatedAt: nowIso(),
          groceryClaimedAt: FieldValue.delete(),
        })
        count++
      }
      return count
    },
  }
}

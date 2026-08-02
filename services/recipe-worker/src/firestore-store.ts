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
  const importJobs = db.collection('import_jobs')
  const importBatches = db.collection('import_batches')

  /**
   * Finishes one import job and moves its batch's counters in the same transaction, so the badge
   * can never disagree with the jobs it counts — three jobs finishing at once (the concurrency
   * cap) would otherwise race on a read-modify-write of the batch.
   *
   * A batch is `complete` only if nothing failed, `partial` if some did, `failed` if none
   * succeeded — the client needs to distinguish "all fifteen are waiting for you" from "twelve
   * are, and three need another go".
   */
  const finishImport = async (
    jobId: string,
    outcome: 'complete' | 'error',
    fields: Record<string, unknown>,
  ) => {
    const jobRef = importJobs.doc(jobId)

    await db.runTransaction(async (tx) => {
      const jobSnap = await tx.get(jobRef)
      if (!jobSnap.exists) return
      const job = jobSnap.data() as {
        status?: string
        batchId?: string
        reviewState?: string
      }
      // Only a job this worker still holds may be finished — the reaper may have given up on it
      // already, and double-counting it would leave the batch permanently short of its total.
      if (job.status !== 'processing') return

      const batchRef = job.batchId ? importBatches.doc(job.batchId) : null
      const batchSnap = batchRef ? await tx.get(batchRef) : null

      tx.update(jobRef, {
        ...fields,
        status: outcome,
        updatedAt: nowIso(),
        // Set only if the enqueue didn't: this is what the badge counts, and a completed job with
        // no reviewState would be invisible in the review flow.
        ...(job.reviewState ? {} : { reviewState: 'unreviewed' }),
        importClaimedAt: FieldValue.delete(),
      })

      if (!batchRef || !batchSnap?.exists) return
      const batch = batchSnap.data() as {
        total?: number
        completed?: number
        failed?: number
      }
      const completed = (batch.completed ?? 0) + (outcome === 'complete' ? 1 : 0)
      const failed = (batch.failed ?? 0) + (outcome === 'error' ? 1 : 0)
      const total = batch.total ?? 0
      const done = completed + failed >= total

      tx.update(batchRef, {
        completed,
        failed,
        status: done
          ? failed === 0
            ? 'complete'
            : completed === 0
              ? 'failed'
              : 'partial'
          : 'processing',
        updatedAt: nowIso(),
      })
    })
  }

  return {
    async claimGrocery(listId) {
      const ref = groceryLists.doc(listId)
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref)
        if (!snap.exists) return null
        const data = snap.data() as {
          status?: string
          inputRecipes?: Recipe[]
        }
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

    async claimImport(jobId) {
      const ref = importJobs.doc(jobId)
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref)
        if (!snap.exists) return null
        const data = snap.data() as {
          status?: string
          batchId?: string
          createdBy?: string
          photoKeys?: string[]
        }
        if (data.status !== 'pending') return null

        const photoKeys = Array.isArray(data.photoKeys) ? data.photoKeys.filter(Boolean) : []
        if (photoKeys.length === 0) {
          // Nothing to parse — fail it here rather than claiming it and looping through the
          // pipeline to reach the same conclusion.
          tx.update(ref, {
            status: 'error',
            error: 'This import job has no photos attached.',
            updatedAt: nowIso(),
          })
          return null
        }

        tx.update(ref, {
          status: 'processing',
          importClaimedAt: nowIso(),
          updatedAt: nowIso(),
        })
        return {
          batchId: data.batchId ?? '',
          createdBy: data.createdBy ?? '',
          photoKeys,
        }
      })
    },

    async completeImport(jobId, result) {
      await finishImport(jobId, 'complete', {
        parsedRecipe: result.parsedRecipe,
        ...(result.partialFailure ? { partialFailure: result.partialFailure } : {}),
        error: FieldValue.delete(),
      })
    },

    async failImport(jobId, message) {
      await finishImport(jobId, 'error', {
        error: message,
        parsedRecipe: null,
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

    async reapStuckImports(deadlineMs, now) {
      const snap = await importJobs.where('status', '==', 'processing').get()
      let count = 0
      for (const doc of snap.docs) {
        const claimedAt = (doc.data() as { importClaimedAt?: string }).importClaimedAt
        if (!isStale(claimedAt, now, deadlineMs)) continue
        // Goes through the same finisher as a normal failure so the batch counters move too —
        // otherwise an abandoned job leaves its batch stuck at `processing` forever and the
        // badge never settles.
        await finishImport(doc.id, 'error', {
          error: 'This import did not finish in time. Try it again.',
          parsedRecipe: null,
        })
        count++
      }
      return count
    },
  }
}

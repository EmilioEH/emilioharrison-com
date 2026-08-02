import { GoogleGenAI } from '@google/genai'
import { computeGroceryList } from '../../../apps/recipes/src/lib/services/grocery-core'
import { loadConfig } from './config'
import { initFirestore, createFirestoreStore } from './firestore-store'
import { createAiErrorLogger } from './ai-error-log'
import { runGroceryForDoc } from './jobs'
import { sweepStuckJobs } from './reaper'

/**
 * Entry point for the self-hosted Chefboard background worker (see BACKGROUND-JOBS-VM-PLAN.md).
 *
 * Subscribes to Firestore in real time for grocery-list generation, claims each pending doc
 * transactionally, and runs the shared compute core from apps/recipes with a generous timeout —
 * no Cloudflare `waitUntil` ceiling. Wraps the pure orchestration in jobs.ts with the real
 * firebase-admin store and Gemini client; a reaper interval backstops crash-stranded docs.
 *
 * This worker also carried background recipe enhancement until that feature was removed and the
 * queue that fed it stopped existing — see the commit that deleted the remains.
 */
function main() {
  const config = loadConfig()
  const db = initFirestore(config)
  const store = createFirestoreStore(db)
  const logAiError = createAiErrorLogger(db)
  const gemini = new GoogleGenAI({ apiKey: config.geminiApiKey })

  console.log(
    `[worker] starting — origin=${config.origin} jobTimeout=${config.jobTimeoutMs}ms ` +
      `reaper=${config.reaperDeadlineMs}ms/${config.reaperIntervalMs}ms`,
  )

  const groceryDeps = {
    store,
    gemini,
    jobTimeoutMs: config.jobTimeoutMs,
    computeGrocery: computeGroceryList,
    logAiError,
  }

  // Grocery queue: `grocery_lists` docs with status == 'pending'. onSnapshot fires once with the
  // current backlog (as 'added') on startup, then incrementally — so a worker restart picks up
  // anything queued while it was down. The transactional claim makes duplicate fires (or a second
  // worker) harmless.
  const unsubGrocery = db
    .collection('grocery_lists')
    .where('status', '==', 'pending')
    .onSnapshot(
      (snap) => {
        for (const change of snap.docChanges()) {
          if (change.type === 'removed') continue
          void runGroceryForDoc(groceryDeps, change.doc.id)
        }
      },
      (err) => console.error('[worker] grocery listener error:', err),
    )

  const reaperTimer = setInterval(
    () => void sweepStuckJobs(store, config.reaperDeadlineMs),
    config.reaperIntervalMs,
  )

  const shutdown = (signal: string) => {
    console.log(`[worker] ${signal} received — shutting down`)
    clearInterval(reaperTimer)
    unsubGrocery()
    // Give any in-flight Firestore writes a moment, then exit so systemd can restart cleanly.
    setTimeout(() => process.exit(0), 500)
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  console.log('[worker] listeners attached; waiting for jobs.')
}

main()

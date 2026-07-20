import { GoogleGenAI } from '@google/genai'
import { computeEnhancedRecipe } from '../../../apps/recipes/src/lib/services/enhancement-core'
import { computeGroceryList } from '../../../apps/recipes/src/lib/services/grocery-core'
import { loadConfig } from './config'
import { initFirestore, createFirestoreStore } from './firestore-store'
import { runEnhancementForDoc, runGroceryForDoc } from './jobs'
import { sweepStuckJobs } from './reaper'

/**
 * Entry point for the self-hosted Chefboard background worker (see BACKGROUND-JOBS-VM-PLAN.md).
 *
 * Subscribes to Firestore in real time for the two slow AI jobs, claims each pending doc
 * transactionally, and runs the shared compute cores from apps/recipes with a generous timeout —
 * no Cloudflare `waitUntil` ceiling. Wraps the pure orchestration in jobs.ts with the real
 * firebase-admin store and Gemini client; a reaper interval backstops crash-stranded docs.
 */
function main() {
  const config = loadConfig()
  const db = initFirestore(config)
  const store = createFirestoreStore(db)
  const gemini = new GoogleGenAI({ apiKey: config.geminiApiKey })

  console.log(
    `[worker] starting — origin=${config.origin} jobTimeout=${config.jobTimeoutMs}ms ` +
      `reaper=${config.reaperDeadlineMs}ms/${config.reaperIntervalMs}ms`,
  )

  const enhancementDeps = {
    store,
    gemini,
    origin: config.origin,
    jobTimeoutMs: config.jobTimeoutMs,
    computeEnhanced: computeEnhancedRecipe,
  }
  const groceryDeps = {
    store,
    gemini,
    jobTimeoutMs: config.jobTimeoutMs,
    computeGrocery: computeGroceryList,
  }

  // Enhancement queue: `recipes` docs with enhancementStatus == 'pending'. onSnapshot fires once
  // with the current backlog (as 'added') on startup, then incrementally — so a worker restart
  // picks up anything queued while it was down. The transactional claim makes duplicate fires
  // (or a second worker) harmless.
  const unsubEnhance = db
    .collection('recipes')
    .where('enhancementStatus', '==', 'pending')
    .onSnapshot(
      (snap) => {
        for (const change of snap.docChanges()) {
          if (change.type === 'removed') continue
          void runEnhancementForDoc(enhancementDeps, change.doc.id)
        }
      },
      (err) => console.error('[worker] enhancement listener error:', err),
    )

  // Grocery queue: `grocery_lists` docs with status == 'pending'.
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
    unsubEnhance()
    unsubGrocery()
    // Give any in-flight Firestore writes a moment, then exit so systemd can restart cleanly.
    setTimeout(() => process.exit(0), 500)
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  console.log('[worker] listeners attached; waiting for jobs.')
}

main()

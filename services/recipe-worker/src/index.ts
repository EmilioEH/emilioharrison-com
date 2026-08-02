import { GoogleGenAI } from '@google/genai'
import OpenAI from 'openai'
import { computeGroceryList } from '../../../apps/recipes/src/lib/services/grocery-core'
import { parsePhotosToRecipe } from '../../../apps/recipes/src/lib/services/parse-photo-core'
import { loadConfig } from './config'
import { initFirestore, createFirestoreStore } from './firestore-store'
import { createAiErrorLogger } from './ai-error-log'
import { createPhotoFetcher } from './photos'
import { createLimiter } from './concurrency'
import { runGroceryForDoc, runImportForDoc } from './jobs'
import { sweepStuckJobs } from './reaper'

/**
 * Entry point for the self-hosted Chefboard background worker (see BACKGROUND-JOBS-VM-PLAN.md).
 *
 * Subscribes to Firestore in real time for grocery-list generation and bulk photo import, claims
 * each pending doc transactionally, and runs the shared compute cores from apps/recipes with a
 * generous timeout — no Cloudflare `waitUntil` ceiling. Wraps the pure orchestration in jobs.ts
 * with the real firebase-admin store and provider clients; a reaper interval backstops
 * crash-stranded docs.
 *
 * Photo import lives here rather than in the browser for one reason: phone browsers suspend
 * JavaScript and cancel in-flight fetches when the user switches apps, and a fifteen-photo batch
 * takes minutes. See BULK-PHOTO-IMPORT-PLAN.md.
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
  const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: config.openRouterApiKey,
  })

  console.log(
    `[worker] starting — origin=${config.origin} jobTimeout=${config.jobTimeoutMs}ms ` +
      `importTimeout=${config.importJobTimeoutMs}ms importConcurrency=${config.importConcurrency} ` +
      `bucket=${config.storageBucket} reaper=${config.reaperDeadlineMs}ms/${config.reaperIntervalMs}ms`,
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

  const importDeps = {
    store,
    openai,
    fetchPhotos: createPhotoFetcher(config.storageBucket),
    parsePhotos: parsePhotosToRecipe,
    importJobTimeoutMs: config.importJobTimeoutMs,
    logAiError,
  }
  const importLimiter = createLimiter(config.importConcurrency)

  // Import queue: `import_jobs` docs with status == 'pending'. A batch of fifteen arrives at once,
  // so unlike grocery these are put through a concurrency gate rather than fired off unbounded —
  // fifteen simultaneous parse pipelines would swamp a 4-vCPU box.
  const unsubImports = db
    .collection('import_jobs')
    .where('status', '==', 'pending')
    .onSnapshot(
      (snap) => {
        for (const change of snap.docChanges()) {
          if (change.type === 'removed') continue
          const jobId = change.doc.id
          void importLimiter.run(() => runImportForDoc(importDeps, jobId))
        }
        const { active, queued } = importLimiter.stats()
        if (queued > 0) console.log(`[worker] import queue: ${active} running, ${queued} waiting`)
      },
      (err) => console.error('[worker] import listener error:', err),
    )

  const reaperTimer = setInterval(
    () => void sweepStuckJobs(store, config.reaperDeadlineMs),
    config.reaperIntervalMs,
  )

  const shutdown = (signal: string) => {
    console.log(`[worker] ${signal} received — shutting down`)
    clearInterval(reaperTimer)
    unsubGrocery()
    unsubImports()
    // Give any in-flight Firestore writes a moment, then exit so systemd can restart cleanly.
    setTimeout(() => process.exit(0), 500)
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  console.log('[worker] listeners attached; waiting for jobs.')
}

main()

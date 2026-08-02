/**
 * Worker configuration, read from `process.env` (populated on the VM by a root-owned 600
 * EnvironmentFile — see the README runbook). Fails fast and loudly at startup if a required
 * secret is missing, so a misconfigured deploy crash-loops visibly under systemd rather than
 * silently doing nothing.
 */

export interface WorkerConfig {
  /** Firebase service-account JSON (same credential the Cloudflare REST client uses). */
  serviceAccount: Record<string, unknown>
  /** Gemini API key for the grocery calls. */
  geminiApiKey: string
  /** OpenRouter key for photo-import parsing. A deliberate deviation from
   * BACKGROUND-JOBS-VM-PLAN.md ("not the OpenRouter key — that stays on Cloudflare"): bulk photo
   * import is the one job that needs it, and backgrounding photo import is the whole feature.
   * See BULK-PHOTO-IMPORT-PLAN.md, "Decisions already taken". */
  openRouterApiKey: string
  /** Firebase Storage bucket holding uploaded photos. Derived from the service account's project
   * unless overridden — the worker reads photos straight from storage with the credential it
   * already holds, so bulk import adds no new network path and no inbound port. */
  storageBucket: string
  /** Absolute origin used to resolve relative `sourceImage` paths during enhancement
   * (e.g. https://emilioharrison.com). */
  origin: string
  /** Per-job Gemini call budget. Generous here — unlike Cloudflare's waitUntil, a real Node
   * process has no ~30s ceiling. */
  jobTimeoutMs: number
  /** Whole-job budget for one photo-import job, retry included. Separate from `jobTimeoutMs`
   * because that one is genuinely too tight here: a single measured photo parse took 108.1s
   * against a 120s budget. Must stay comfortably under `reaperDeadlineMs`, or the reaper will
   * flip a job that is still legitimately running. */
  importJobTimeoutMs: number
  /** How many import jobs may be in flight at once. Three full parse pipelines in parallel were
   * measured clean (no 429s, no throttling); an uncapped 15-photo batch would fan out to fifteen
   * on a 4-vCPU box. */
  importConcurrency: number
  /** A doc left in `processing` longer than this is considered abandoned (worker crashed
   * mid-job) and flipped to `error` by the reaper. */
  reaperDeadlineMs: number
  /** How often the reaper sweeps. */
  reaperIntervalMs: number
}

function required(name: string): string {
  const value = process.env[name]
  if (!value || value.trim() === '') {
    throw new Error(`[recipe-worker] Missing required env var: ${name}`)
  }
  return value
}

function optionalInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`[recipe-worker] ${name} must be a positive number, got: ${raw}`)
  }
  return n
}

export function loadConfig(): WorkerConfig {
  const rawServiceAccount = required('FIREBASE_SERVICE_ACCOUNT')
  let serviceAccount: Record<string, unknown>
  try {
    serviceAccount = JSON.parse(rawServiceAccount)
  } catch {
    throw new Error('[recipe-worker] FIREBASE_SERVICE_ACCOUNT is not valid JSON')
  }

  const projectId = typeof serviceAccount.project_id === 'string' ? serviceAccount.project_id : ''

  return {
    serviceAccount,
    geminiApiKey: required('GEMINI_API_KEY'),
    openRouterApiKey: required('OPENROUTER_API_KEY'),
    storageBucket: process.env.WORKER_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
    origin: process.env.WORKER_ORIGIN || 'https://emilioharrison.com',
    jobTimeoutMs: optionalInt('WORKER_JOB_TIMEOUT_MS', 120_000),
    importJobTimeoutMs: optionalInt('WORKER_IMPORT_JOB_TIMEOUT_MS', 300_000),
    importConcurrency: optionalInt('WORKER_IMPORT_CONCURRENCY', 3),
    reaperDeadlineMs: optionalInt('WORKER_REAPER_DEADLINE_MS', 10 * 60_000),
    reaperIntervalMs: optionalInt('WORKER_REAPER_INTERVAL_MS', 60_000),
  }
}

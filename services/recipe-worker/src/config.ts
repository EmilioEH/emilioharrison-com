/**
 * Worker configuration, read from `process.env` (populated on the VM by a root-owned 600
 * EnvironmentFile — see the README runbook). Fails fast and loudly at startup if a required
 * secret is missing, so a misconfigured deploy crash-loops visibly under systemd rather than
 * silently doing nothing.
 */

export interface WorkerConfig {
  /** Firebase service-account JSON (same credential the Cloudflare REST client uses). */
  serviceAccount: Record<string, unknown>
  /** Gemini API key for the enhancement/grocery calls. */
  geminiApiKey: string
  /** Absolute origin used to resolve relative `sourceImage` paths during enhancement
   * (e.g. https://emilioharrison.com). */
  origin: string
  /** Per-job Gemini call budget. Generous here — unlike Cloudflare's waitUntil, a real Node
   * process has no ~30s ceiling. */
  jobTimeoutMs: number
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

  return {
    serviceAccount,
    geminiApiKey: required('GEMINI_API_KEY'),
    origin: process.env.WORKER_ORIGIN || 'https://emilioharrison.com',
    jobTimeoutMs: optionalInt('WORKER_JOB_TIMEOUT_MS', 120_000),
    reaperDeadlineMs: optionalInt('WORKER_REAPER_DEADLINE_MS', 10 * 60_000),
    reaperIntervalMs: optionalInt('WORKER_REAPER_INTERVAL_MS', 60_000),
  }
}

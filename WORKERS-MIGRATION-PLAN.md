# Migration Plan: Cloudflare Pages → Workers (+ Workflows for AI jobs)

Status: **PROPOSED** — no migration work has started. This document is the sign-off artifact.

## Why

The AI-pipeline outage saga (PRs #35–#44) bottomed out at a platform constraint, not a code bug:
**Cloudflare Pages' only background-work primitive is `ctx.waitUntil`, which is silently killed
~30 seconds after the response is sent** — catch blocks and all. Every server-side AI job
(background Enhancement, grocery generation) has to fit its entire AI call *plus* its
error-status write inside that window. Today they do, by capping Gemini at 25s with thinking
disabled — but that is a ceiling on the product, not a fix. A bigger week, a slower model day,
or any future AI feature with real depth hits the same wall.

Migrating this project from Cloudflare **Pages** to Cloudflare **Workers with static assets**
removes the wall and unlocks the platform features Pages lacks:

| Capability | Pages (today) | Workers (after) |
|---|---|---|
| Long-running background jobs | ~30s `waitUntil`, silent kill | **Workflows**: unlimited wall-clock per step, durable state, automatic retries |
| Persistent server logs | None (live tail only) | **Workers Logs** (persistent, searchable — complements the Firestore error log added in PR #44) |
| Scheduled jobs (cron) | Not supported | Cron Triggers (e.g. a nightly reaper for stuck `processing` docs) |
| Queues consumers, Durable Objects, rate-limit binding | Not supported | Supported |

Cloudflare's own guidance also now steers new projects to Workers; Pages is in maintenance.

## Current state (what the migration touches)

- One Pages project, `emilioharrison-com`, deployed from Git with `pages_build_output_dir = "dist"`.
- `scripts/build-all.mjs` builds both Astro apps, merges static output into `dist/`, and writes a
  custom **gateway worker** to `dist/_worker.js/` that routes `/protected/recipes/*` to the
  recipes app worker and everything else to the website worker ("advanced mode" Pages).
- KV namespace binding `SESSION` (id `47c74c58…`), env secrets (`OPENROUTER_API_KEY`,
  `GEMINI_API_KEY`, `FIREBASE_SERVICE_ACCOUNT`, `SESSION_SECRET`, `PUBLIC_FIREBASE_*`).
- Custom domain `emilioharrison.com` + per-branch preview deploys (used heavily in review).

## Target state

- One **Worker** with static assets. Per Cloudflare's official Pages→Workers migration guide:
  - `main` → the gateway worker entry (moved out of `dist/` or listed in `.assetsignore` so it
    isn't served as an asset).
  - `assets = { directory = "./dist" }` replaces `pages_build_output_dir`.
  - `not_found_handling` set explicitly (Pages auto-detected SPA behavior; Workers doesn't).
  - Same `compatibility_date`/`nodejs_compat`, same KV binding, same secrets (re-entered once).
- Two **Workflows** bound to the Worker, replacing the `waitUntil` jobs:
  - `enhancement-workflow`: steps = fetch source → Gemini call → merge/clamp → Firestore write.
  - `grocery-workflow`: steps = build prompt → Gemini call → parse/repair → Firestore write.
  - Each step gets **unlimited wall time** (AI calls are I/O waits; only CPU counts), automatic
    retries with backoff, and durable state — a killed isolate resumes instead of leaving a doc
    stuck at `processing`. The API endpoints shrink to "validate → create workflow instance →
    202", and the existing Firestore status-doc contract with the client stays identical, so
    **no client changes are required**.
  - The 25s budgets and `WAITUNTIL_SAFE_TIMEOUT_MS` become obsolete; per-step timeouts can be
    generous (e.g. 2–5 min) because failure handling is structural, not a race against a kill.

## Decisions needed before starting (owner: Emilio)

1. **Workers plan tier.** Workflows on the Free plan cap CPU at **10ms per step** — likely too
   tight for parsing large AI JSON responses. The **$5/mo Workers Paid plan** raises this to 30s
   (configurable to 5 min) and is the safe choice. Confirm you're willing to be on paid.
2. **Deploy pipeline.** Pages' Git integration goes away. Options: **Workers Builds** (closest
   equivalent, still Git-triggered, supports preview URLs with manual setup) or a GitHub Action
   running `wrangler deploy`. Recommendation: Workers Builds, to keep the PR-preview workflow
   this repo's review process depends on.
3. **Cutover window.** DNS/custom-domain move is near-instant but should happen when you're not
   mid-meal-planning. Rollback = point the domain back at the Pages project (kept intact,
   frozen, until Phase 4 sign-off).

## Phases

**Phase 1 — Config, no deploy risk.** Author the root `wrangler.jsonc` (main/assets/KV/flags),
adjust `build-all.mjs` to emit the gateway entry outside the assets dir, verify everything with
`wrangler dev` locally. Pure code; production untouched. *(≈ one PR)*

**Phase 2 — Staging on workers.dev.** Deploy to the free `*.workers.dev` subdomain with real
secrets. Run the full manual QA checklist (photo import, URL import, refresh, enhancement,
grocery, admin) against it. Production still on Pages. *(dashboard work + QA pass)*

**Phase 3 — Workflows.** Port the two AI jobs to Workflow classes; endpoints create instances
instead of calling `waitUntil`. Delete the budget constants and their CLAUDE.md warning; add a
cron-triggered reaper marking any `processing` doc older than 10 min as `error` (belt and
suspenders). Verify on staging. *(≈ one PR, the meat of the migration)*

**Phase 4 — Cutover.** Move the custom domain to the Worker, watch Workers Logs for a few days,
then delete the Pages project. Rollback at any point = repoint the domain. *(dashboard work)*

## Risks

- **Preview-deploy parity**: Workers Builds preview URLs need manual configuration; verify in
  Phase 2 before anything depends on it.
- **Gateway asset serving order**: Workers serves static assets *before* the Worker by default;
  the gateway relies on routing every `/protected/recipes/*` request through worker code — needs
  `run_worker_first` (or route config) validated in Phase 1.
- **`@google/genai` pin**: 1.34.0 is pinned for Workers-runtime compatibility; the runtime is the
  same on Workers proper, but re-verify in Phase 2 rather than assuming.
- **Secrets drift**: secrets are re-entered by hand once; use the Phase 2 QA pass to catch any
  missed one before cutover.

## Estimated effort

Phases 1+3 are code PRs I can do end-to-end (~a day of focused work each, including staging
verification). Phases 2+4 need your Cloudflare dashboard access for project creation, secrets,
and the domain move — each is under an hour of hands-on time.

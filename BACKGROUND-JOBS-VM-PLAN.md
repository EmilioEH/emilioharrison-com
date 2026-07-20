# Migration Plan: Background AI Jobs → self-hosted VM worker

Status: **APPROVED (approach)** — Firestore-listener handoff chosen. Not yet built.

Supersedes the earlier "migrate to Workers Paid + Workflows" draft. Same goal (remove the
30-second `ctx.waitUntil` ceiling behind PRs #35–#44), different route: run the two slow AI jobs
on Emilio's existing always-on VM instead of paying for Cloudflare Workflows.

## Why this route

The AI-pipeline outages bottomed out at a platform constraint: Cloudflare Pages' only
background-work primitive, `ctx.waitUntil`, is silently killed ~30s after the response is sent.
The two Gemini jobs (background Enhancement, grocery generation) must currently cram their AI
call *and* their error-status write inside that window (capped at 25s, thinking disabled). That
works today but is a ceiling on the product, not a fix.

Emilio already runs a **Contabo KVM VPS** (Ubuntu 24.04, Node 24, 4 vCPU / 8 GB, always-on with
19+ day uptime, clean outbound to OpenRouter/Gemini/Firestore). Moving the two jobs there:

- **Removes the ceiling** — a real Node process has no `waitUntil` limit; jobs can take minutes.
- **Costs nothing** — reuses infra that's already paid for and idle (load ~0.3).
- **Persistent logs** — journald on the box, complementing the Firestore error log (PR #44).
- **No new attack surface** — see the handoff decision below.

Honest tradeoff: this moves one piece of infrastructure from "Cloudflare manages it" to "we
manage it" — the VM now holds the Gemini + Firebase secrets, runs a systemd service we keep
alive, and if it goes down, *background* enhancement/grocery pause (the app itself, and
in-request photo/URL import, keep working). For a personal app that's an acceptable trade, and
it's the whole reason to avoid the $5/mo Workers Paid plan.

## Handoff mechanism: Firestore realtime listener (decided)

A plain Node process can use the **`firebase-admin` SDK** — which breaks in the Cloudflare
Workers runtime (hence the app's custom REST client), but runs fine on a real VM. So the worker
**subscribes to Firestore in real time** rather than being POSTed to:

- The Cloudflare endpoints just write a job's status doc as `pending` and return `202`. No
  network path from Cloudflare to the VM. **No public port, no domain, no TLS, no inbound
  auth** — the box stays exactly as locked down as it is now.
- The VM worker holds an `onSnapshot` listener on the "pending jobs" query, claims each job in a
  transaction (so a future second worker can't double-run it), runs the Gemini call with a
  generous timeout, and writes the result back.
- The client contract is **unchanged** — the browser already watches these Firestore docs, so
  **zero client changes**.

(The alternative — a public HTTPS push endpoint behind Caddy — was rejected: for background jobs
the lower latency doesn't matter, and it would open a new public surface to secure and patch.)

## What moves vs. stays

| Piece | Runs on | Notes |
|---|---|---|
| Auth, session, uploads, all fast API | Cloudflare | unchanged |
| Photo import (OpenRouter, 3-phase OCR) | Cloudflare | in-request, client holds connection — never had the 30s problem |
| URL import | Cloudflare | in-request |
| AI Refresh (`refresh.ts`) | Cloudflare | in-request; the client waits on the response. Stays put (no `waitUntil`). |
| **Background Enhancement** (Gemini) | **VM** | today's `waitUntil` job |
| **Grocery generation** (Gemini) | **VM** | today's `waitUntil` job |

Only the two Gemini `waitUntil` jobs move. The VM needs only `GEMINI_API_KEY` + the Firebase
service-account JSON — **not** the OpenRouter key (that stays on Cloudflare).

## The real engineering work

The job logic (`recipe-enhancement-job.ts`, `generate-grocery-list.ts`'s inner job, and their
dependencies: `ai-parser.ts`, `recipe-merge.ts`, `grocery-progress.ts`) currently assumes a
Cloudflare `locals`/runtime context — it reads env via `context.locals.runtime.env` and gets the
Gemini client through `initGeminiClient(locals)`. Factoring it so the same code runs in plain
Node (env via `process.env`, Firestore via `firebase-admin` instead of the REST client) is the
bulk of the effort. Target: **one shared job module** the VM worker calls directly, keeping a
single source of truth for the AI logic rather than forking it.

## Job/queue shape

Reuse the existing status docs as the queue — no new collection needed:

- **Enhancement**: recipe docs already carry `enhancementStatus`. Cloudflare's create-recipe
  endpoint sets it to `pending` (it already does) and *stops* triggering the `waitUntil` job.
  The worker listens for `enhancementStatus == 'pending'`, claims (→ `processing` +
  `enhancementClaimedAt`), runs, writes `complete`/`error`. The bounded poll already in
  `RecipeDetail.tsx` picks up the transition exactly as it does now.
- **Grocery**: `grocery_lists/{id}` already has `status`. Same pattern: endpoint writes
  `pending` + returns 202; worker claims and runs.
- **Reaper**: a periodic sweep (worker-internal `setInterval`, or a systemd timer) flips any doc
  stuck in `processing` beyond a generous deadline (e.g. 10 min) to `error`, so a worker crash
  mid-job can't strand a doc forever. The client's stuck-state UI (PR #41, threshold aligned in
  #43) already handles a doc that goes `error` or stops updating.

## Phases

**Phase 1 — Extract the shared job module (Cloudflare repo, this environment).** Refactor the two
jobs + deps to be context-agnostic: env via an injected config object, Firestore via an injected
data-access interface (Cloudflare passes its REST client; the VM passes a `firebase-admin`
adapter). Cloudflare endpoints switch from `waitUntil(job)` to "write `pending`, return 202".
Delete the 25s budgets, `WAITUNTIL_SAFE_TIMEOUT_MS`, and the CLAUDE.md waitUntil warning. Full
test suite stays green. *One PR — the meat.*

**Phase 2 — The worker service (`services/recipe-worker/`, same repo).** A small Node entrypoint:
`firebase-admin` init from the service-account JSON, `onSnapshot` listeners for the two pending
queues, transactional claim, calls the shared job module, plus the reaper. A `systemd` unit file
and a README with the exact VM setup steps. *One PR.*

**Phase 3 — Deploy to the VM (done by the Claude Code instance on the box).** Check out the
branch, `npm ci` in the worker dir, drop the two secrets into an `EnvironmentFile` (root-owned,
`600`), `systemctl enable --now recipe-worker`, verify with `journalctl -u recipe-worker -f`
against a real enhancement + grocery run. Cloudflare and VM run the new path together; the old
`waitUntil` path is already gone as of Phase 1's merge, so this is the activation step.

**Phase 4 — Watch + document.** Tail journald + the Admin → AI Errors panel for a few days of
real use. Update `apps/recipes/README.md` and CLAUDE.md's "Server-side background AI jobs"
section to describe the split (fast/in-request on Cloudflare, slow/background on the VM).

## Rollback

Phase 1 deletes the old `waitUntil` path. If the VM worker misbehaves after Phase 3, the fastest
rollback is to re-point enhancement/grocery back to an in-request Cloudflare call with the tight
budgets (revert Phase 1's endpoint changes) — the old code is one `git revert` away in history.
The VM holds no unique state (Firestore is the source of truth), so losing the VM loses no data:
pending jobs just wait until it's back.

## Risks

- **`firebase-admin` service-account scope**: the same JSON the Cloudflare REST client already
  uses; confirm it has Firestore read/write in Phase 3.
- **Double-processing**: mitigated by the transactional claim; single worker for now anyway.
- **Worker liveness**: systemd `Restart=always` + the reaper cover crashes; a full VM outage
  degrades gracefully (jobs queue, app keeps working). Optional later: a dead-man's-switch alert.
- **Secret handling on the VM**: service-account JSON + Gemini key in a root-owned `600`
  EnvironmentFile, never in the repo. Verified present/scoped during Phase 3.

## Effort

Phases 1–2 are code PRs I can do end-to-end here (~a day each including tests). Phase 3 is done
by the VM's own Claude Code from a copy-pasteable runbook I'll include — under an hour hands-on.

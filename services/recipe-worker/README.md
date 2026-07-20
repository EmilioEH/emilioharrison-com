# Chefboard background AI worker

A small, self-hosted Node service that runs Chefboard's two slow AI jobs —
**recipe enhancement** and **grocery-list generation** — off the Cloudflare
request path.

## Why this exists

Cloudflare Pages kills `ctx.waitUntil` background work ~30 seconds after the
response is sent, silently and without running `catch` blocks. Both AI jobs can
legitimately take longer than that on a dense recipe, which left docs stranded
in `processing` forever. This worker is a normal long-lived Node process with no
such ceiling: it watches Firestore for queued jobs, claims each one, runs the
**same compute cores** the Cloudflare code uses (`apps/recipes/src/lib/services/
enhancement-core.ts` and `grocery-core.ts`), and writes the result back.

See `BACKGROUND-JOBS-VM-PLAN.md` at the repo root for the full four-phase
migration plan and rollback steps. **This service (Phase 2) does not touch the
Cloudflare app** — deploying it changes nothing in production until the Phase 3
cutover flips the endpoints to enqueue `pending` docs instead of running the
work inline.

## How it works

- **Two Firestore listeners** (`src/index.ts`): `recipes` where
  `enhancementStatus == 'pending'`, and `grocery_lists` where
  `status == 'pending'`. `onSnapshot` replays the current backlog on startup, so
  a restart picks up anything queued while the worker was down.
- **Transactional claim** (`src/firestore-store.ts`): each job is claimed in a
  `runTransaction` that flips the doc to `processing` and stamps a
  `*ClaimedAt` timestamp, returning the payload only if it was still `pending`.
  Duplicate listener fires — or even a second worker — are therefore harmless.
- **Shared compute, injected deps** (`src/jobs.ts`): the orchestration is pure
  and takes the store, the Gemini client, and the compute function as
  parameters, so it unit-tests against fakes with no Firestore or network.
- **Reaper** (`src/reaper.ts`): an in-process `setInterval` sweeps docs stuck in
  `processing` past `WORKER_REAPER_DEADLINE_MS` and flips them to `error`. This
  is the crash-recovery backstop (worker died mid-job); the daily recycle timer
  below is a *separate* concern (memory hygiene).

## Requirements

- Node 22+ (the box runs v24; `firebase-admin@13` needs `>=18`).
- Run via `tsx` (`node --import tsx src/index.ts`) — the worker imports the app's
  `.ts` compute cores directly across the monorepo, so there is no build step.
- Install deps from the repo root (`npm install`) so the workspace is linked, or
  `cd services/recipe-worker && npm install`.

## Configuration

All config comes from environment variables (`src/config.ts`). The worker
**fails fast and loudly** at startup if a required secret is missing, so a
misconfigured deploy crash-loops visibly under systemd rather than silently
doing nothing.

| Var | Required | Default | Purpose |
| --- | --- | --- | --- |
| `FIREBASE_SERVICE_ACCOUNT` | yes | — | The service-account JSON (one line), same credential the Cloudflare REST client uses. |
| `GEMINI_API_KEY` | yes | — | Gemini key for enhancement + grocery calls. |
| `WORKER_ORIGIN` | no | `https://emilioharrison.com` | Absolute origin used to resolve relative `sourceImage` paths during enhancement. |
| `WORKER_JOB_TIMEOUT_MS` | no | `120000` | Per-job Gemini budget. Generous — no waitUntil ceiling here. |
| `WORKER_REAPER_DEADLINE_MS` | no | `600000` | A doc in `processing` longer than this is treated as abandoned. |
| `WORKER_REAPER_INTERVAL_MS` | no | `60000` | How often the reaper sweeps. |

### Secrets: where they live

Put the secrets in a **root-owned, `600`, outside the git checkout** env file at
`/root/.recipe-worker.env`, matching the existing OpenClaw gateway convention
(`/root/.openclaw/.env`):

```ini
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"...", ... }'
GEMINI_API_KEY='...'
```

> **Wrap both values in single quotes.** systemd's `EnvironmentFile` parser
> otherwise re-interprets the `\n` escape sequences inside the service-account
> `private_key`, corrupting it before Node ever sees it — the worker then
> crash-loops with `Failed to parse private key` even though the JSON is valid.
> Single quotes make systemd take the value literally. (The JSON itself must
> still be on one line.)

```bash
chown root:root /root/.recipe-worker.env
chmod 600 /root/.recipe-worker.env
```

- **Never** commit these values or paste them into the repo, a PR, or a commit.
- **Do not** follow the plaintext-in-crontab pattern used elsewhere on this box
  for the trading bot — an EnvironmentFile is the correct mechanism.
- **The service-account JSON has no backup on the box.** If you rebuild the VM,
  re-download it from Firebase console → Project Settings → Service Accounts.
  Losing the file is not catastrophic (regenerate a key), but there is no copy
  to restore from.

## Install (systemd `--user` under root, with linger)

The box already runs the OpenClaw gateway as a `--user` unit with linger
enabled, so a user session persists across reboots without a login. Mirror that:

```bash
# 1. Make sure linger is on (survives reboots without an interactive login).
loginctl enable-linger root

# 2. Link the units into the user systemd dir.
mkdir -p ~/.config/systemd/user
cp ~/emilioharrison-com/services/recipe-worker/deploy/recipe-worker.service          ~/.config/systemd/user/
cp ~/emilioharrison-com/services/recipe-worker/deploy/recipe-worker-recycle.service  ~/.config/systemd/user/
cp ~/emilioharrison-com/services/recipe-worker/deploy/recipe-worker-recycle.timer    ~/.config/systemd/user/
systemctl --user daemon-reload

# 3. Enable + start. Use `enable --now`, NOT just `start` — `enable` is what makes
#    it come back after an unattended-upgrades reboot.
systemctl --user enable --now recipe-worker.service
systemctl --user enable --now recipe-worker-recycle.timer
```

> If you would rather run a **system** unit (`/etc/systemd/system/`), drop the
> `--user` flags, change the service `[Install] WantedBy` to
> `multi-user.target`, and reference the units without `--user`. The `--user`
> route is chosen only to match the existing box convention.

### Verify

```bash
systemctl --user status recipe-worker.service
journalctl --user -u recipe-worker.service -f      # live logs
systemctl --user list-timers recipe-worker-recycle.timer
```

A healthy start logs `listeners attached; waiting for jobs.`

## Operations

- **Logs**: `journalctl --user -u recipe-worker.service` (there is no monitoring
  stack on the box beyond journald).
- **Restart**: `systemctl --user restart recipe-worker.service` — safe at any
  time; the transactional claim + backlog replay mean no job is lost.
- **Daily recycle**: `recipe-worker-recycle.timer` restarts the worker at
  04:00 America/Chicago to release slow grpc-js stream memory growth. This is
  memory hygiene, distinct from the reaper's crash recovery. `MemoryMax=512M` in
  the service unit is a hard backstop if a leak outpaces the daily cycle.
- **Restart-storm guard**: `Restart=always` with
  `StartLimitBurst=5`/`StartLimitIntervalSec=60` — a persistently failing
  credential can't spin-loop the CPU; systemd gives up after 5 failures/min.

## Health alerting (dead-man's switch)

There is no push-based monitoring on the box. Reuse the existing OpenClaw
cron → Signal path for a dead-man's switch: a cron job that checks
`systemctl --user is-active recipe-worker.service` (and optionally the age of the
newest `complete` job) and pings Signal only when something is wrong. Keep the
alert *secret-free* — it should carry status, never credentials or doc contents.

## Development

```bash
cd services/recipe-worker
npm run check:ts    # tsc --noEmit
npm run test        # vitest (jobs + reaper, in-memory fakes — no network)
npm run lint
```

`jobs.ts` and `reaper.ts` are pure and fully covered by fakes; `firestore-store.ts`
and `index.ts` are the thin firebase-admin/onSnapshot adapters exercised in
staging against a real project.

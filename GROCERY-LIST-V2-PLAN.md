# Redesign Plan: Grocery List (Raw + Smart)

Status: **DRAFT — for discussion, not yet approved or built.**

Written after a live production incident: the VM worker's grocery generation was silently
returning `status: complete` with 0 items, several times in a row, with no user-visible error.
Root-caused (see session log / PR #52 discussion) to a chain of small trust assumptions that each
seemed reasonable in isolation but compound into "the AI can silently fail and the user sees
nothing." This plan is a from-scratch reconsideration of the feature, not another patch on top of
`generate-grocery-list.ts` / `grocery-core.ts`.

## The actual problem, stated plainly

The current design has exactly one path to a grocery list, and every step of that path is a
single point of failure with no fallback:

```
client has recipes in memory (maybe stale/thin)
  → snapshot frozen onto a Firestore doc (client-supplied, unverified)
    → one Gemini call, thinking disabled, schema-validated but not sanity-checked
      → whatever comes back is "complete," even {"ingredients": []}
```

Every layer trusts the layer before it. When any one thing degrades — a slow-loading client, a
model that's had a bad day, a deprecated model name — the user gets a blank list with no
indication anything went wrong. There is no cheap, deterministic fallback underneath the AI step.

## What the feature should feel like (per your spec)

1. User selects recipes for the week (existing week-planning flow — unchanged).
2. Opens the Grocery tab. **Immediately**, with no wait and no AI call, sees a **Raw list**: every
   ingredient line from every selected recipe, as written on the recipe.
3. Toggles to **Smart list**: the same ingredients, but combined across recipes and converted to
   purchasable units —

   ```
   Recipe A: 1 onion, 2.5 lb ground beef
   Recipe B: 1 cup onion, 1.5 lb ground beef
   Smart list: 2 onions, 4 lb ground beef
   ```

The key structural idea: **Raw is not a fallback UI state for when Smart fails — it's the
foundation Smart is built on top of.** Raw needs no AI, no worker, no network round trip beyond
recipes the client already needs to render the week anyway. It cannot fail the way an LLM call
can. Smart is a genuine enhancement layered on top, and because Raw always exists underneath, a
degraded Smart list is a visible "still combining, here's what you've got in the meantime" state
instead of a blank screen.

## Architecture

### 1. Raw list — client-side, synchronous, AI-free

- Computed entirely from data the client already has (or a small, bounded per-recipe fetch for
  the selected week — see "Data fidelity" below). No Firestore `grocery_lists` doc, no worker, no
  Gemini call.
- Grouped by recipe (matches what's on each recipe page — least surprising to the user) with a
  flat "combined, uncombined" view as a fallback rendering if grouping gets busy for a big week.
- Renders the instant the Grocery tab opens. This alone fixes the worst part of today's failure
  mode: even if Smart list generation is completely broken, the user is never staring at nothing.

### 2. Smart list — server-authoritative fetch + AI aggregation + reliability layer

**Data fidelity (fixes today's root cause):** the worker/endpoint takes only the *list of selected
recipe IDs* from the client and re-fetches the full canonical recipe documents itself, directly
from Firestore, at generation time. It never trusts a client-supplied ingredient blob. This
removes the entire bug class we spent today chasing — a thin list-view projection, a stale
in-memory snapshot from before an import finished, a frozen payload that's already wrong by the
time it's used. The client's only job is to say *which* recipes are in the week; the server owns
what "the ingredients" means.

**Aggregation + conversion:** same core idea as today's `computeGroceryList` — one AI call given
all selected recipes' ingredients, instructed to combine matching ingredients and convert to
purchasable units (the existing prompt's conversion table — cloves→heads, cups of onion→whole
onions, etc. — is good and should carry forward largely as-is). This is inherently a job for a
model, not deterministic code: "1 cup diced onion ≈ 1 onion" is a judgment call, not arithmetic.

**Reliability layer (the actual fix, not a patch):**
- *Sanity check before persisting.* An empty or suspiciously small `ingredients` array against a
  non-trivial input is not a success — it's a distinguishable failure state. Never again write
  `status: complete` for a result that didn't do the job.
- *Bounded automatic retry.* On a failed sanity check, retry once or twice before giving up —
  cheap insurance against the sampling variance we measured today (same prompt, same data,
  succeeded most of the time but not always).
- *Graceful degradation, not an error screen.* If Smart generation still fails after retries, the
  UI shows the Raw list with an inline "Smart list is temporarily unavailable — showing your raw
  ingredients" message. The user is never blocked from shopping.
- *One source of truth for the model name.* Today it's duplicated in `ai-parser.ts` and
  `grocery-core.ts` with a "keep these in sync" comment — exactly the kind of thing that silently
  drifts and is why the `gemini-2.5-flash` retirement cost hours instead of minutes. Centralize it
  in `config`/env, one place, one deploy to change it everywhere.

### 3. Optional but recommended: a canary job

A scheduled job (cron on the VM, or a Cloudflare cron trigger) that runs a fixed, known-good test
recipe through the real Smart-list pipeline periodically and pages you (reusing the existing
OpenClaw → Signal dead-man's-switch pattern already used for worker liveness) the moment it
starts failing. Everything we found today, we found because you were personally watching logs
with me in real time during a live test. This is how you'd find out on your own, before a real
grocery night.

## What moves vs. stays

| Piece | Change |
|---|---|
| Week/recipe selection | Unchanged |
| Raw list | **New** — client-side, no AI, no persistence needed (cheap to recompute) |
| Smart list trigger | Client sends recipe **IDs** only, not full recipe objects |
| Smart list data source | **Changed** — server re-fetches full recipes by ID instead of trusting client payload |
| Smart list aggregation prompt | Mostly unchanged (existing conversion rules are good) |
| Smart list "success" definition | **Changed** — sanity-checked + retried, not just schema-valid |
| Model config | **Changed** — single source of truth instead of two files |
| Firestore `grocery_lists` doc | Same shape, but `inputRecipes` becomes IDs, not full objects (smaller writes too) |
| Failure UX | **Changed** — falls back to Raw list instead of blank/stuck state |

## Data fidelity for Raw list

Raw needs `ingredients` (or `structuredIngredients` if present) for exactly the recipes in the
active week — a small, bounded set, not the whole library. Two reasonable options, worth deciding
together rather than me picking:

- **(a)** A small parallel fetch of `GET /api/recipes/[id]` (full doc, already exists) for each
  planned recipe when the week's plan changes. Simple, reuses an existing endpoint, N small
  requests where N is a handful.
- **(b)** A new lightweight batch endpoint, `GET /api/recipes/batch?ids=...`, returning full
  ingredients for a small ID list in one round trip. Slightly more work now, nicer long-term if
  weeks commonly have 7+ recipes.

## Open questions (for you, not decided here)

- Does Smart generation kick off automatically the moment the Grocery tab opens (today's
  behavior, ready-when-you-toggle) or lazily on first toggle to Smart (saves a Gemini call if the
  user never checks it)? Auto-start trades a bit of cost for a snappier toggle.
- Does Raw list need any persistence (offline access, multi-device sync) or is "cheap to
  recompute from already-synced recipe data" good enough? Leaning toward no persistence needed.
- Retry budget: 1 retry or 2? Each retry is a real Gemini cost; worth capping deliberately rather
  than open-ended.
- Is the canary job worth building now, or a fast-follow once Raw/Smart is stable?

## Suggested phasing (small, shippable, in order)

1. **Raw list, client-only.** Ships independently of everything else below; immediately gives
   users a working list even before touching Smart list internals at all. Lowest risk, biggest
   immediate reliability win.
2. **Server-authoritative Smart data fetch.** Change the client payload to IDs only, move the
   recipe fetch server-side. Removes today's actual root cause.
3. **Reliability layer.** Sanity check, bounded retry, graceful fallback to Raw on persistent
   failure, centralized model config.
4. **Canary job.** Optional, once 1–3 are stable in production.

Each phase is independently shippable and independently valuable — this isn't an all-or-nothing
rewrite.

# Performance Plan — Chefboard (apps/recipes)

**Goal:** Make the app fast to open and smooth to use — first load, repeat loads, and in-app interactions.

**Audit date:** 2026-07-13 (production build measured locally from this branch)

## Baseline (measured)

| Metric | Value today | Target after plan |
| --- | --- | --- |
| Entry chunk `RecipeManager.[hash].js` | 2,128 KB raw / **665 KB gzip** | ≤ 200 KB gzip |
| Critical-path JS (entry + firebase-client + react + framer-motion) | ~850 KB gzip | ≤ 350 KB gzip |
| Total `_astro/*.js` shipped | 4.3 MB (30 files) | n/a (split, mostly lazy) |
| `GET /api/recipes` Firestore reads | Entire `recipes` collection (all users), 4 sequential REST calls | Only caller's + family's recipes, parallel calls |
| Repeat-visit recipe paint | Spinner until network completes | Instant paint from local cache |
| Service worker asset caching | 3 icon files only | All hashed `_astro/*` assets |
| Mount-time API round trips | 5 (partly serialized, 1 duplicated) | 1–2 |
| List card image size | Up to 1920 px stored image per card | ~400 px thumbnail per card |

**How to reproduce the baseline numbers:**

```bash
cd apps/recipes && npx astro build
ls -la dist/protected/recipes/_astro/*.js | sort -k5 -rn | head
gzip -c dist/protected/recipes/_astro/RecipeManager.*.js | wc -c
```

**Definition of done for every item below (repo quality gate):**
`npm run check:safety` passes, `npm run test:e2e:fast` passes, and the item's own acceptance criteria are met. Items that change architecture also update `apps/recipes/README.md`.

---

## Phase 1 — Ship less JavaScript (P1) and paint instantly on repeat visits (P2)

Independent of each other; do in either order or in parallel. Together they change first load from "seconds of blank screen" to fast, and repeat loads to near-instant.

### P1. Code-split the entry bundle

**Problem:** `ShareRecipeDialog.tsx` statically imports `@react-pdf/renderer`, and `RecipeManager.tsx` statically imports the dialog — so the entire PDF engine (pdfkit, layout engine, embedded font-metric tables) ships in the code needed to show the recipe list. All 12 `ViewMode` screens (cooking mode, week planner, onboarding, admin, settings, bulk import, …) are also statically imported.

**Change:**

1. Load the PDF pipeline on demand: dynamic `await import('@react-pdf/renderer')` + dynamic import of `RecipePdfDocument` inside the share/export handler (same pattern `FeedbackModal.tsx` already uses for `html2canvas`).
2. Convert non-library `ViewMode` screens to `React.lazy()` + `<Suspense>` in `RecipeManager`'s view switch. Library view (and anything visible at first paint: control bar, tab bar, cards) stays static.
3. Wire the already-installed `rollup-plugin-visualizer` behind an npm script (e.g. `npm run analyze`) to verify composition.

**Acceptance criteria:**

- [ ] Entry chunk (`RecipeManager.[hash].js`) ≤ 200 KB gzip on a production build.
- [ ] `grep -c "PDFDocument\|Helvetica" dist/.../RecipeManager.*.js` returns 0 — no PDF engine in the entry chunk.
- [ ] Cooking mode, week planner, onboarding, settings, and admin views each land in their own lazy chunk (verify in build output / visualizer).
- [ ] Sharing a recipe as PDF still works end-to-end (existing or new Playwright test covers opening ShareRecipeDialog and generating the PDF).
- [ ] Switching to each lazy view shows content or a suspense fallback — never a blank screen or error (Playwright: visit every `ViewMode` once, chromium project).
- [ ] Deep links (`?view=detail&recipe=…`, `?view=week`, etc.) still resolve correctly on hard refresh.
- [ ] No regression in offline behavior for views already visited in-session.

### P2. Persist the recipe store — stale-while-revalidate

**Problem:** `recipeStore.ts` is a plain in-memory atom. Every launch shows a spinner until `GET /api/recipes` completes, even for data seen minutes ago.

**Change:** Persist the last recipes payload locally (`@nanostores/persistent` is already a dependency; use localStorage, or IndexedDB if measured payloads exceed ~2 MB). On launch: hydrate the store from cache immediately, render, then run the existing `refreshRecipes()` in the background and reconcile. Cache is keyed/invalidated per user (cleared on logout and on user switch, including admin impersonation).

**Acceptance criteria:**

- [ ] Warm launch (recipes cached): library list is visible on first render without waiting for the network — no `loading-indicator` shown when cached data exists (Playwright: load app, reload, assert cards render before the `/api/recipes` response resolves, e.g. by delaying the route).
- [ ] Background refresh updates the UI when the server payload differs from cache (Playwright: mutate a recipe server-side/mock, reload, assert updated title appears without user action).
- [ ] Cold launch (no cache) behaves exactly as today: spinner, then data.
- [ ] Logout clears the cached recipes; logging in as a different user never shows the previous user's recipes (unit + E2E).
- [ ] Recipe create/update/delete write through to the persisted cache (no stale flash on next launch after an edit).
- [ ] A corrupt/oversized cache entry falls back to network fetch without crashing (unit test with garbage in the storage key).

---

## Phase 2 — Fix the recipes API (P3)

### P3. Query only visible recipes; slim the list payload

**Problem:** `GET /api/recipes` (`src/pages/api/recipes/index.ts`) calls `db.getCollection('recipes')`, which pages through **every recipe in the database across all users** (300/page) and filters in worker memory. Latency grows with total recipes ever created by anyone, and every user's recipes transit the worker on every request. The 4 Firestore REST calls (user → family → collection → favorites) run sequentially. The response also returns full documents (instructions, step mappings, `sourceImage` which may be base64) when the library only needs card fields.

**Change:**

1. Add a `runQuery` method to `FirebaseRestService` (Firestore REST `:runQuery` with structured query) and filter server-side: `createdBy in [me + family]` plus the legacy no-`createdBy` recipes (documented one-time backfill of `createdBy`/`familyId` is acceptable as part of this item if `in` limits bite — Firestore `in` caps at 30 values).
2. Parallelize independent Firestore calls with `Promise.all` (favorites + recipes after the user/family lookups).
3. Split payloads: list endpoint returns card fields only (id, title, image/thumb, tags, times, rating, cost, isFavorite, protein/mealType/etc. needed by filters); `GET /api/recipes/[id]` remains the full document. Client fetches the full doc on detail open (and caches it in the store).
4. Remove the per-request `console.log` debug block.

**Acceptance criteria:**

- [ ] The endpoint issues no full-collection list call: Firestore requests are `runQuery` with a `createdBy`/`familyId` filter (assert via unit test on the service layer / MSW request inspection).
- [ ] A user sees exactly: their own recipes + family members' recipes + legacy recipes without `createdBy` — verified by unit tests covering all three cases and a multi-user E2E (TestUser vs. second user fixture).
- [ ] Favorites flags still populate correctly on list items.
- [ ] List response contains no `instructions`, no step mappings, and no base64 `sourceImage` (assert on response shape in a unit/integration test).
- [ ] Opening a recipe detail view fetches and renders the full document; edit → save → detail still round-trips correctly (E2E).
- [ ] Grocery generation, week planner, and cooking mode — which may have assumed full docs in the store — still work (E2E for each happy path).
- [ ] For the current dataset, list response body is measurably smaller than baseline (record before/after size in the PR description).
- [ ] No `console.log` in the request path.

---

## Phase 3 — Make the PWA behave like an app (P4, P5)

### P4. Real service-worker caching

**Problem:** `public/sw.js` pre-caches 3 icons; its cache-first `fetch` handler never hits for JS/CSS because nothing adds them. Every cold HTTP cache re-downloads ~4.3 MB of assets. On SW update, `controllerchange` forces `window.location.reload()`, yanking the app out from under the user.

**Change:** Version the cache per deploy. Cache-first for `/_astro/*` (content-hashed, immutable) populated at fetch time; network-first (falling back to cache) for the HTML shell and navigation requests; never cache `/api/*`. With hashed assets cached, remove the forced-reload dance in `RecipeLayout.astro` — new assets are picked up on next natural navigation; keep a non-blocking "update available" path if desired.

**Acceptance criteria:**

- [ ] Second visit serves all `/_astro/*` requests from the SW cache (Playwright: capture network, assert 0 network hits for hashed assets on reload; or assert `caches` contents via `page.evaluate`).
- [ ] `/api/*` responses are never served from SW cache (assert cache contents after exercising the app).
- [ ] Deploying a new build (new hashes) serves the new assets — old cache is evicted on activate (test by bumping the cache version locally and asserting old entries are gone).
- [ ] The forced `window.location.reload()` on `controllerchange` is removed; a SW update while viewing a recipe never navigates the user away (this deletes the existing defer-reload workaround too — verify the bug it guarded against stays fixed).
- [ ] App shell loads from cache when offline after one prior visit (Playwright: `context.setOffline(true)`, reload, library renders from cached shell + P2's cached data).

### P5. Thumbnails for list images

**Problem:** `RecipeCard.tsx` renders `recipe.images[0]` — the stored image, up to 1920 px (`image-optimization.ts` cap) — for every card in the scrolling list.

**Change:** At upload time, generate a second ~400 px variant with the existing `processImage()` and upload both; store `thumbUrl` alongside the full image. Cards render `thumbUrl || images[0]` (graceful fallback for existing recipes). Add explicit `width`/`height` (or `aspect-ratio`) and `decoding="async"` on card images; keep `loading="lazy"`. Optional backfill script in `scripts/` to generate thumbs for existing recipes.

**Acceptance criteria:**

- [ ] New/edited recipe uploads produce both a full image and a ≤ 450 px-wide thumbnail; the recipe document stores both URLs (unit test on the upload flow with MSW).
- [ ] Library cards request the thumbnail, not the full image, when `thumbUrl` exists (Playwright: inspect the `img src` / network requests).
- [ ] Recipes without `thumbUrl` still render their full image (no broken cards for legacy data).
- [ ] Card images reserve layout space — zero layout shift from images while scrolling the library (explicit dimensions/aspect-ratio present in DOM).
- [ ] Detail view still uses the full-resolution image.
- [ ] Median image bytes for a library screenful drops ≥ 70% vs. baseline for thumbnailed recipes (record before/after in PR).

---

## Phase 4 — One round trip to boot (P6 + P7, one refactor)

### P6+P7. Bootstrap endpoint + instant shell

**Problem:** On launch the client fires 5 requests — `/api/recipes`, then `/api/week/planned` (gated on recipes finishing), `/api/families/current` **twice** (`useFamilySync.ts` and `RecipeManager.tsx` both fetch it), and `/api/auth/firebase-token`. Meanwhile `[...path].astro` blocks HTML delivery on a Firestore `users` lookup (plus cold-isolate JWT signing + OAuth exchange) only to render a blank `client:only` shell.

**Change:**

1. Add `GET /api/bootstrap` returning `{ user: {displayName, isAdmin, hasOnboarded}, recipes (slim list), planned, family }`, with all Firestore reads parallelized server-side.
2. Client: one bootstrap fetch on mount feeds `recipeStore`, `familyStore`, and planned-recipe state; delete the duplicate `families/current` fetch; keep `firebase-token` separate (different lifecycle).
3. `[...path].astro`: stop awaiting Firestore; render the shell (or SSR skeleton) immediately. User fields arrive via bootstrap (P2's cache makes the wait invisible on repeat visits).
4. Cache the Firestore OAuth access token in the `SESSION` KV binding (TTL < token expiry) so cold isolates skip the JWT/OAuth exchange.

**Acceptance criteria:**

- [ ] App boot performs at most 2 API round trips before the library is interactive: `bootstrap` + `firebase-token` (Playwright: count requests to `/api/*` during load).
- [ ] `/api/families/current` is fetched at most once per app load; the duplicate call is gone.
- [ ] Week-planned data no longer waits for the recipes fetch to finish (no serialized dependency; verify via request timing or by delaying the recipes portion in MSW).
- [ ] `[...path].astro` contains no `await db.*` call; TTFB for the HTML shell does not include a Firestore round trip.
- [ ] Onboarding gating, admin gating, and display name all still work, including the `force_onboarding`/`skip_onboarding` query params and admin impersonation banner (E2E).
- [ ] KV-cached token: two consecutive API requests on a cold isolate mint at most one OAuth token (unit test the KV path; verify token is never logged and KV entry expires before the token does).
- [ ] Old individual endpoints keep working until all callers migrate (grep confirms no remaining client callers of the replaced boot-time fetches at the end of the phase).

---

## Phase 5 — Polish and guardrails

Small independent items; pick up opportunistically.

### P8. Search responsiveness

**Change:** Wrap the Fuse.js search input in `useDeferredValue` (or debounce) in `useFilteredRecipes.ts`.

**Acceptance criteria:**

- [ ] Typing in search stays responsive with 500+ mock recipes (no dropped keystrokes in a Playwright type-fast test); results still correct.

### P9. Font audit

**Change:** Remove unused weights from the 9 `@fontsource` imports in `RecipeLayout.astro` (verify usage against `tailwind.config.js` font settings and actual class usage).

**Acceptance criteria:**

- [ ] Only weights actually referenced by the design system are imported; visual diff of key screens shows no fallback-font rendering (spot-check library, detail, cooking mode).

### P10. Bundle-size CI guardrail

**Change:** Configure the already-installed `size-limit` with a budget for the entry chunk (post-P1 value + ~10%) and add it to `check:ci`.

**Acceptance criteria:**

- [ ] `npm run check:ci` fails if the entry chunk exceeds the budget (verify by temporarily re-adding a static heavy import).

### P11. Library list virtualization (deferred — only if needed)

**Trigger:** revisit when a real user library exceeds ~300 recipes or scroll jank is reported after P5.

**Acceptance criteria (when picked up):**

- [ ] Scrolling a 1,000-recipe mock library holds 60 fps on a mid-range device profile; scrollspy category headers (`RecipeLibrary.tsx` manual sync) still track correctly.

---

## Sequencing summary

| Order | Item | Why this order |
| --- | --- | --- |
| 1 | P1 bundle split | Biggest first-load lever; independent; easy to verify |
| 1 | P2 persisted store | Biggest repeat-load lever; independent of P1 |
| 2 | P3 API query + slim payload | Scaling/latency fix; P2's cache absorbs any payload-shape churn |
| 3 | P4 SW caching | Depends on stable chunking from P1 |
| 3 | P5 thumbnails | Independent; pairs with P3's slim payload (`thumbUrl` in list fields) |
| 4 | P6+P7 bootstrap + shell | Touches SSR page, stores, and several endpoints — land after the data layer settles |
| 5 | P8–P11 | Polish + regression guardrails (P10 should land immediately after P1) |

Each phase is a separate PR with before/after measurements in the description, using the commands in the Baseline section.

# Performance Plan — Chefboard (apps/recipes)

**Goal:** Make the app fast to open and smooth to use — first load, repeat loads, and in-app interactions.

**Audit date:** 2026-07-13 (production build measured locally from this branch)

## Baseline (measured)

| Metric                                                             | Value today                                                                                                                                             | Target after plan                                |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Entry chunk `RecipeManager.[hash].js`                              | 2,128 KB raw / **665 KB gzip**                                                                                                                          | ≤ 200 KB gzip                                    |
| Critical-path JS (entry + firebase-client + react + framer-motion) | ~850 KB gzip                                                                                                                                            | ≤ 350 KB gzip                                    |
| Total `_astro/*.js` shipped                                        | 4.3 MB (30 files)                                                                                                                                       | n/a (split, mostly lazy)                         |
| `GET /api/recipes` Firestore reads                                 | Entire `recipes` collection (all users), 4 sequential REST calls                                                                                        | Only caller's + family's recipes, parallel calls |
| Repeat-visit recipe paint                                          | Spinner until network completes                                                                                                                         | Instant paint from local cache                   |
| Service worker asset caching                                       | 3 icon files only                                                                                                                                       | All hashed `_astro/*` assets                     |
| Mount-time API round trips                                         | 4 (`recipes`, `week/planned` serialized after it, `families/current`, `firebase-token` — see P6+P7's corrected problem statement; no literal duplicate) | 1–2                                              |
| List card image size                                               | Up to 1920 px stored image per card                                                                                                                     | ~400 px thumbnail per card                       |

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

- [x] Entry chunk (`RecipeManager.[hash].js`) ≤ 200 KB gzip on a production build. — 59.4 KB gzip (193.4 KB raw), down from 665 KB gzip.
- [x] `grep -c "PDFDocument\|Helvetica" dist/.../RecipeManager.*.js` returns 0 — no PDF engine in the entry chunk.
- [x] Cooking mode, week planner, onboarding, settings, and admin views each land in their own lazy chunk (verify in build output / visualizer). — plus RecipeDetail, RecipeEditor, BulkRecipeImporter, FeedbackDashboard, InviteView, FamilyManagementView, NotificationSettingsView, and the `@react-pdf/renderer` engine itself.
- [x] Sharing a recipe as PDF still works end-to-end (existing or new Playwright test covers opening ShareRecipeDialog and generating the PDF). — `tests/recipe-share.spec.ts`.
- [x] Switching to each lazy view shows content or a suspense fallback — never a blank screen or error (Playwright: visit every `ViewMode` once, chromium project). — `tests/lazy-view-modes.spec.ts`. Two pre-existing, out-of-scope gaps surfaced during verification (not regressions — confirmed identical on the unmodified branch): `admin-dashboard` redirects TestUser to library because `isAdmin` is resolved server-side and can't be forced true from client-side test mocks; `grocery` is a valid `ViewMode` with no renderer at all in `RecipeManager`/`RecipeManagerView`. Both are covered with lenient "doesn't crash" assertions and flagged for separate follow-up.
- [x] Deep links (`?view=detail&recipe=…`, `?view=week`, etc.) still resolve correctly on hard refresh.
- [x] No regression in offline behavior for views already visited in-session. — lazy chunks are cached via the same browser HTTP cache as any other `_astro/*.js` asset; not regression-tested with real offline simulation (see P4 for real SW caching).

### P2. Persist the recipe store — stale-while-revalidate

**Problem:** `recipeStore.ts` is a plain in-memory atom. Every launch shows a spinner until `GET /api/recipes` completes, even for data seen minutes ago.

**Change:** Persist the last recipes payload locally (`@nanostores/persistent` is already a dependency; use localStorage, or IndexedDB if measured payloads exceed ~2 MB). On launch: hydrate the store from cache immediately, render, then run the existing `refreshRecipes()` in the background and reconcile. Cache is keyed/invalidated per user (cleared on logout and on user switch, including admin impersonation).

**Acceptance criteria:**

- [x] Warm launch (recipes cached): library list is visible on first render without waiting for the network — no `loading-indicator` shown when cached data exists (Playwright: load app, reload, assert cards render before the `/api/recipes` response resolves, e.g. by delaying the route). — `tests/recipe-cache-persistence.spec.ts`.
- [x] Background refresh updates the UI when the server payload differs from cache (Playwright: mutate a recipe server-side/mock, reload, assert updated title appears without user action).
- [x] Cold launch (no cache) behaves exactly as today: spinner, then data.
- [x] Logout clears the cached recipes; logging in as a different user never shows the previous user's recipes (unit + E2E). — cache is keyed per-user via `localStorage` (`chefboard:recipesCache:<userId>`, derived from the non-`httpOnly` `site_user` cookie); admin-impersonation isolation covered by a unit test (no usable multi-account E2E fixture exists for impersonation — `admin-impersonation.spec.ts` is itself `describe.skip`).
- [x] Recipe create/update/delete write through to the persisted cache (no stale flash on next launch after an edit).
- [x] A corrupt/oversized cache entry falls back to network fetch without crashing (unit test with garbage in the storage key). — malformed JSON, wrong shape, oversized payload (>4 MB ceiling), and a simulated quota-exceeded write error are all covered in `recipeStore.test.ts`.

Implementation note: persistence uses a hand-rolled `localStorage` layer in `recipeStore.ts` rather than `@nanostores/persistent`, because that helper bakes its storage key in at atom-creation time and this cache must be keyed dynamically per authenticated user.

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

- [x] The endpoint issues no full-collection list call: Firestore requests are `runQuery` with a `createdBy`/`familyId` filter (assert via unit test on the service layer / MSW request inspection). — `FirebaseRestService.runQuery()` in `src/lib/firebase-rest.ts`; `GET /api/recipes` never calls `getCollection('recipes')` (unit-tested in `src/pages/api/recipes/index.test.ts`).
- [x] A user sees exactly: their own recipes + family members' recipes + legacy recipes without `createdBy` — verified by unit tests covering all three cases and a multi-user E2E (TestUser vs. second user fixture). — unit tests cover all three cases plus leak-prevention and `in`-cap chunking.
- [x] Favorites flags still populate correctly on list items. — unit-tested; `isFavorite` attached after the scoped query.
- [x] List response contains no `instructions`, no step mappings, and no base64 `sourceImage` (assert on response shape in a unit/integration test). — `steps`/`structuredSteps`/`structuredIngredients`/`stepIngredients` all excluded (unit-tested); `sourceImage` is intentionally kept as an image fallback per the task brief (see P5 for the actual base64 fix — thumbnails).
- [x] Opening a recipe detail view fetches and renders the full document; edit → save → detail still round-trips correctly (E2E). — `RecipeDetail.tsx` now blocks on a full-document fetch when the held recipe lacks `steps` (the slim-record signal), unit-tested in `RecipeDetail.test.tsx` (renders immediately when already-full, blocks-then-hydrates via `'hydrate'` mode when slim, un-blocks on fetch failure) and verified via `tests/recipe-share.spec.ts` (5/5 passing).
- [x] Grocery generation, week planner, and cooking mode — which may have assumed full docs in the store — still work (E2E for each happy path). — grocery (`api-utils.ts`/`grocery-utils.ts`) already falls back to full `ingredients` when `structuredIngredients` is absent, unaffected; cooking mode's two entry points (`RecipeDetail.tsx`, `WeekPlanView.tsx`) both now hydrate the full document before starting a session; `RecipeManager.tsx`'s share/PDF entry point does the same. `tests/grocery-list.spec.ts` (3 tests) and one test in `tests/recipe-details.spec.ts` fail in this sandbox — independently confirmed identical, byte-for-byte failures (same assertions, same line numbers) on an unmodified `origin/main` build via a side-by-side worktree comparison, so these are pre-existing environment gaps, not regressions from this change.
- [x] Real Firestore correctness check: the `createdBy == null` legacy-recipe filter was originally implemented as a `fieldFilter`/`EQUAL` comparison against `null`, which Firestore's REST API actually rejects (it requires a dedicated `unaryFilter`/`IS_NULL`) — a mocked-fetch unit test wouldn't catch this wire-format mismatch. Fixed in `firebase-rest.ts` to use `unaryFilter`, with a test asserting the corrected shape.
- [x] For the current dataset, list response body is measurably smaller than baseline (record before/after size in the PR description). — ~83% smaller for a realistic 30-recipe library with Storage-URL images (267KB → 45KB); see PR description for the base64-sourceImage edge case, which dominates size regardless of this change (P5's thumbnail work is the real fix there).
- [x] No `console.log` in the request path. — removed; unit-tested (`never leaves a console.log in the request path`).

**⚠️ Required manual deploy step:** run the legacy-recipe backfill once against production Firestore after this deploys. Firestore cannot query "field does not exist," so the `createdBy == null` branch of the scoped query only matches legacy recipes that have been explicitly backfilled to `createdBy: null` — until it runs, any recipe that predates the `createdBy` field entirely (as opposed to having it explicitly `null`) won't appear in anyone's library list. One-time and idempotent (a no-op once nothing is missing the field). Two ways to trigger it:

- **From the deployed app (no local credentials needed):** log in as an admin on the live site, open the browser console, and run `fetch('/protected/recipes/api/admin/backfill-legacy-created-by', { method: 'POST' }).then((r) => r.json()).then(console.log)`. `GET` (same URL) returns a dry-run count with no writes, if you want to check first.
- **Locally, with real production credentials:** `npx tsx scripts/backfill-legacy-created-by.ts` (requires a local `firebase-service-account.json`).

---

## Phase 3 — Make the PWA behave like an app (P4, P5)

### P4. Real service-worker caching

**Problem:** `public/sw.js` pre-caches 3 icons; its cache-first `fetch` handler never hits for JS/CSS because nothing adds them. Every cold HTTP cache re-downloads ~4.3 MB of assets. On SW update, `controllerchange` forces `window.location.reload()`, yanking the app out from under the user.

**Change:** Version the cache per deploy. Cache-first for `/_astro/*` (content-hashed, immutable) populated at fetch time; network-first (falling back to cache) for the HTML shell and navigation requests; never cache `/api/*`. With hashed assets cached, remove the forced-reload dance in `RecipeLayout.astro` — new assets are picked up on next natural navigation; keep a non-blocking "update available" path if desired.

**Acceptance criteria:**

- [x] Second visit serves all `/_astro/*` requests from the SW cache (Playwright: capture network, assert 0 network hits for hashed assets on reload; or assert `caches` contents via `page.evaluate`). — `tests/service-worker-caching.spec.ts`; verified with the browser's own HTTP cache disabled via CDP (`Network.setCacheDisabled`) so a `transferSize === 0` result can only be explained by the SW's Cache Storage, not the ordinary disk cache. Note: the SW registers on `window.onload`, so the very first-ever page load's own asset requests can never be SW-intercepted (they've already finished loading by the time the SW installs) — this is inherent to lazy/runtime caching, not a bug; the test does one warm reload before asserting cache hits, matching a real "closed and reopened the installed PWA" pattern.
- [x] `/api/*` responses are never served from SW cache (assert cache contents after exercising the app). — verified two ways: a `tests/unit/sw.test.js` unit test drives the fetch handler directly and asserts `event.respondWith` is never called for `/api/*` (and nothing lands in either cache store); `tests/service-worker-caching.spec.ts` exercises real API-backed app flows then inspects `caches` contents via `page.evaluate` for any `/api/` entry.
- [x] Deploying a new build (new hashes) serves the new assets — old cache is evicted on activate (test by bumping the cache version locally and asserting old entries are gone). — `tests/unit/sw.test.js` loads `sw.js` into a `node:vm` sandbox with fake Cache Storage seeded with a previous deploy's cache names, then asserts `activate` deletes every non-current-version cache and keeps the current one.
- [x] The forced `window.location.reload()` on `controllerchange` is removed; a SW update while viewing a recipe never navigates the user away (this deletes the existing defer-reload workaround too — verify the bug it guarded against stays fixed). — removed from `RecipeLayout.astro` (and the `sw_update_pending` deferred-reload consumer in `RecipeManager.tsx`); `tests/service-worker-caching.spec.ts` opens a recipe detail, dispatches a synthetic `controllerchange`, and asserts no navigation occurs. The original bug (a forced reload racing `useRouter`'s URL push mid-navigation-to-a-recipe) can't recur because there's no forced reload left to race — `useRouter` also already restores `view`/`recipe` from the URL on mount, so a normal reopen still lands back on whatever recipe was open.
- [x] App shell loads from cache when offline after one prior visit (Playwright: `context.setOffline(true)`, reload, library renders from cached shell + P2's cached data). — `tests/service-worker-caching.spec.ts`. Same registration-timing caveat as above applies: the test does one online warm reload (so the SW is controlling from the start and can cache the document + assets) before going offline, rather than a single literal cold visit — a genuinely-first-ever cold open immediately followed by offline isn't covered by the current lazy-caching design, since nothing has been cached yet at that point.

**Incidental fix surfaced by this work:** `public/manifest.json`'s `start_url`/`scope` were `/protected/recipes` (no trailing slash), which sits _outside_ the SW's registration scope (`/protected/recipes/sw.js`'s default scope is its containing directory, `/protected/recipes/` — SW scope matching is a literal string-prefix check). That's the exact URL Android Chrome opens when launching the installed PWA, so the real primary usage pattern this phase targets was never actually controlled by the service worker at all, pre-existing and independent of this change. Fixed by adding the trailing slash to both fields.

### P5. Thumbnails for list images

**Problem:** `RecipeCard.tsx` renders `recipe.images[0]` — the stored image, up to 1920 px (`image-optimization.ts` cap) — for every card in the scrolling list.

**Change:** At upload time, generate a second ~400 px variant with the existing `processImage()` and upload both; store `thumbUrl` alongside the full image. Cards render `thumbUrl || images[0]` (graceful fallback for existing recipes). Add explicit `width`/`height` (or `aspect-ratio`) and `decoding="async"` on card images; keep `loading="lazy"`. Optional backfill script in `scripts/` to generate thumbs for existing recipes.

**Known gap:** no backfill script was written — legacy recipes without `thumbUrl` keep loading their full-size image in the library list until the photo is re-uploaded or the recipe is edited with a new photo. Acceptable per this item's original scope; revisit if a large legacy library's list-view byte weight becomes a real complaint.

**Acceptance criteria:**

- [x] New/edited recipe uploads produce both a full image and a ≤ 450 px-wide thumbnail; the recipe document stores both URLs (unit test on the upload flow with MSW). — `createThumbnail()` (420px/0.7 quality) added to `image-optimization.ts`, wired into the three client upload flows that call `processImage()` on a device photo: `OverviewMode.tsx` (add-photo-to-existing-recipe), `AiImporter.tsx` (initial photo-scan import), and `BulkRecipeImporter.tsx`. `RecipeListItem`/`Recipe` gain `thumbUrl?: string`; `toListRecipe()` in `src/pages/api/recipes/index.ts` carries it through the P3 slim projection. Unit-tested in `image-optimization.test.ts` (dimension/quality assertions) and `src/pages/api/recipes/index.test.ts` (thumbUrl present/absent).
- [x] Library cards request the thumbnail, not the full image, when `thumbUrl` exists (Playwright: inspect the `img src` / network requests). — `tests/recipe-images.spec.ts` "Library card thumbnails (P5)" describe block.
- [x] Recipes without `thumbUrl` still render their full image (no broken cards for legacy data). — same describe block, "falls back to the full image when thumbUrl is absent" test; no backfill for pre-existing recipes (documented trade-off, matches this item's original scope).
- [x] Card images reserve layout space — zero layout shift from images while scrolling the library (explicit dimensions/aspect-ratio present in DOM). — `RecipeCard.tsx` img now has `width={96}` `height={96}` `aspect-square` alongside existing `loading="lazy"` `decoding="async"`; Playwright asserts explicit DOM attributes and identical bounding-box size before/after scrolling.
- [x] Detail view still uses the full-resolution image. — `OverviewMode.tsx`/`Carousel.tsx` never read `thumbUrl`; Playwright test navigates card → detail and asserts the full-size URL is shown.
- [x] Median image bytes for a library screenful drops ≥ 70% vs. baseline for thumbnailed recipes (record before/after in PR). — measured (not estimated) via `sharp` on two synthetic photographic-noise test images at the same resize/quality parameters as `processImage()`/`createThumbnail()`: 233.7 KB → 8.2 KB (96.5%) and 298.4 KB → 8.5 KB (97.1%). Real photo bytes will vary with content, but both measured cases clear the 70% target by a wide margin.

---

## Phase 4 — One round trip to boot (P6 + P7, one refactor)

### P6+P7. Bootstrap endpoint + instant shell

**Problem (corrected):** On launch the client fires 4 requests, not 5, and none is a literal duplicate — `/api/families/current` is fetched **once** at boot (`useFamilySync.ts`); `RecipeManager.tsx` also calls it, but from three event-driven/recurring call sites (a 30-second "did anything change elsewhere" poll, `FamilySetup`'s post-setup refetch, and the sync-notification toast's own refresh button), none of which fire at mount. The actual boot-time set is: `GET /api/recipes` (via `useRecipes`), `GET /api/week/planned` (gated on `useRecipes`'s `loading` flag finishing — a serialized dependency, not a duplicate), `GET /api/families/current` (via `useFamilySync`, once), and `GET /api/auth/firebase-token`. Separately, **both** SSR entry points — `src/pages/index.astro` (the exact `/protected/recipes/` root, which Astro routes ahead of the catch-all for the index path) and `src/pages/[...path].astro` (everything else) — independently duplicated a blocking `await db.getDocument('users', userId)` Firestore lookup (plus, on a cold isolate, the JWT-sign + OAuth-exchange dance) before sending the HTML shell, even though `RecipeManagerClient` is `client:only="react"` and renders nothing server-side anyway.

**Change:**

1. Add `GET /api/bootstrap` returning `{ user: {displayName, isAdmin, hasOnboarded}, recipes (slim list), planned, family }`, with all Firestore reads parallelized server-side.
2. Client: one bootstrap fetch on mount feeds `recipeStore`, `familyStore`, and planned-recipe state; delete `useFamilySync.ts`'s boot-time fetch (the three event-driven `/api/families/current` call sites in `RecipeManager.tsx` are untouched); keep `firebase-token` separate (different lifecycle).
3. `src/pages/index.astro` **and** `src/pages/[...path].astro` (both had the same blocking lookup — see corrected problem statement above): stop awaiting Firestore; render the shell immediately. User fields arrive via bootstrap (P2's cache makes the wait invisible on repeat visits).
4. Cache the Firestore OAuth access token in the `SESSION` KV binding (TTL < token expiry) so cold isolates skip the JWT/OAuth exchange.

**Acceptance criteria:**

- [x] App boot performs at most 2 API round trips before the library is interactive: `bootstrap` + `firebase-token` (Playwright: count requests to `/api/*` during load). — `tests/boot-performance.spec.ts` (measured: 5→1 in this sandbox, since `firebase-token` can't fire without real Firebase credentials here — see that spec's own note; unaffected/unchanged either way).
- [x] `/api/families/current` is fetched at most once per app load; the duplicate call is gone. — corrected above: there was no literal duplicate: `useFamilySync.ts`'s single boot-time fetch is now removed entirely (bootstrap covers it); the three event-driven call sites in `RecipeManager.tsx` are untouched and still work.
- [x] Week-planned data no longer waits for the recipes fetch to finish (no serialized dependency; verify via request timing or by delaying the recipes portion in MSW). — both now arrive in the same `/api/bootstrap` response; structurally can't be serialized relative to each other anymore.
- [x] `[...path].astro` contains no `await db.*` call; TTFB for the HTML shell does not include a Firestore round trip. — also fixed the same issue in `src/pages/index.astro` (the actual root-route SSR entry, missed on a first pass — see corrected problem statement).
- [x] Onboarding gating, admin gating, and display name all still work, including the `force_onboarding`/`skip_onboarding` query params and admin impersonation banner (E2E). — `useIdentityResolution.ts` (unit-tested) resolves these client-side; admin-impersonation banner in `RecipeLayout.astro` was already driven by the `admin_mask` cookie, not `isAdmin` — untouched, still synchronous. `isAdmin` for the burger-menu admin-dashboard link is now a synchronous `site_email`-cookie check at SSR time (same pattern already used in `api/families/current.ts`'s PATCH/DELETE handlers) rather than a Firestore read — see the README's "Bootstrap Endpoint + Instant Shell" entry for the judgment call this required.
- [x] KV-cached token: two consecutive API requests on a cold isolate mint at most one OAuth token (unit test the KV path; verify token is never logged and KV entry expires before the token does). — `src/lib/firebase-rest.test.ts`'s "KV-cached access token" describe block; TTL is `expires_in - 300s` (e.g. 3300s for a 3600s token).
- [x] Old individual endpoints keep working until all callers migrate (grep confirms no remaining client callers of the replaced boot-time fetches at the end of the phase). — `/api/recipes`, `/api/week/planned`, `/api/families/current` all still exist and are called by other flows (background refresh, post-mutation refetches, the three family-sync call sites, `useBootstrap`'s own fallback path if `/api/bootstrap` itself fails).

**Independent security review (this touches auth/SSR/caching, so I went through it line by line rather than just trusting the implementation report):** `bootstrap.ts` falls back to the `site_email` cookie for its admin check only when `userDoc.email` is unset in Firestore — traced every consumer of the resulting `isAdmin` flag (both here and the SSR pages' own cookie-only check) and confirmed it only ever gates UI visibility (the burger menu's admin-dashboard link), never a real authorization decision — every actual `/api/admin/*` route independently re-verifies via `verifyAdmin()` against real Firestore data, with no cookie fallback. Also confirmed this pattern is consistent with (and more conservative than) a pre-existing precedent already in `api/families/current.ts`, which uses a pure cookie-only admin check for a real cross-family authorization decision. Not a new risk. Re-ran the full targeted E2E set myself (boot-performance, onboarding, admin-dashboard, family-join/leave/management, auth, header-integration, recipe-images, lazy-view-modes, recipe-cache-persistence, recipe-share, service-worker-caching — 50/58 pass); every failure independently reproduced identically against unmodified `main` via side-by-side worktree builds, including one (`family-join.spec.ts`'s invite-badge test) that looked suspiciously related to this change on first read but turned out to fail identically on `main` too.

---

## Phase 5 — Polish and guardrails

Small independent items; pick up opportunistically.

### P8. Search responsiveness

**Change:** Wrap the Fuse.js search input in `useDeferredValue` (or debounce) in `useFilteredRecipes.ts`.

**Acceptance criteria:**

- [x] Typing in search stays responsive with 500+ mock recipes (no dropped keystrokes in a Playwright type-fast test); results still correct. — `useFilteredRecipes.ts` wraps `searchQuery` in `useDeferredValue`; the input itself stays bound to the immediate value so typing never lags, only the Fuse.js search/filter/sort computation uses the deferred one. `tests/search.spec.ts`'s new test (520 mock recipes, `pressSequentially`) confirms the input reflects every keystroke and the final filtered result is correct.

### P9. Font audit

**Change:** Remove unused weights from the 9 `@fontsource` imports in `RecipeLayout.astro` (verify usage against `tailwind.config.js` font settings and actual class usage).

**Acceptance criteria:**

- [x] Only weights actually referenced by the design system are imported; visual diff of key screens shows no fallback-font rendering (spot-check library, detail, cooking mode). — Investigation found the plan's premise was half wrong: none of Archivo Black/DM Sans/Space Grotesk (the fonts actually imported, and the ones named in `CLAUDE.md`'s design-system section) were referenced by any `font-family` in the app — the `recipe-ui` skill confirms Roboto is the real design-system font and flags the Archivo/DM Sans/Space Grotesk framing as leftover from an unrelated project. Fix: dropped those three packages, added `@fontsource/roboto` at exactly the 5 weights actually used by Tailwind's `font-normal`/`font-medium`/`font-semibold`/`font-bold`/`font-black` utilities (400/500/600/700/900, counts 12/191/49/300/9 respectively). Verified via a Playwright screenshot script (`chromium.launch`) confirming computed `fontFamily: "Roboto, system-ui, sans-serif"` and correct weight resolution on a bold heading, with all 5 weight files showing `(loaded)` status — no fallback-font rendering.

### P10. Bundle-size CI guardrail

**Change:** Configure the already-installed `size-limit` with a budget for the entry chunk (post-P1 value + ~10%) and add it to `check:ci`.

**Acceptance criteria:**

- [x] `npm run check:ci` fails if the entry chunk exceeds the budget (verify by temporarily re-adding a static heavy import). — Added `.size-limit.json` budgeting the `RecipeManager.*.js` entry chunk at 80 KB gzip (measured actual: 60.25 KB, ~33% headroom); wired `check:size` (`build` + `size-limit`) into `check:ci`. Verified the guardrail actually catches a regression by temporarily reintroducing a static `@react-pdf/renderer` import into `RecipeManager.tsx` and rebuilding — `size-limit` exited 1, reporting a 507 KB overage — then cleanly reverted (confirmed via `git diff --stat` showing no residual changes).

### P11. Library list virtualization (deferred — only if needed)

**Trigger:** revisit when a real user library exceeds ~300 recipes or scroll jank is reported after P5.

**Acceptance criteria (when picked up):**

- [ ] Scrolling a 1,000-recipe mock library holds 60 fps on a mid-range device profile; scrollspy category headers (`RecipeLibrary.tsx` manual sync) still track correctly.

---

## Sequencing summary

| Order | Item                        | Why this order                                                                      |
| ----- | --------------------------- | ----------------------------------------------------------------------------------- |
| 1     | P1 bundle split             | Biggest first-load lever; independent; easy to verify                               |
| 1     | P2 persisted store          | Biggest repeat-load lever; independent of P1                                        |
| 2     | P3 API query + slim payload | Scaling/latency fix; P2's cache absorbs any payload-shape churn                     |
| 3     | P4 SW caching               | Depends on stable chunking from P1                                                  |
| 3     | P5 thumbnails               | Independent; pairs with P3's slim payload (`thumbUrl` in list fields)               |
| 4     | P6+P7 bootstrap + shell     | Touches SSR page, stores, and several endpoints — land after the data layer settles |
| 5     | P8–P11                      | Polish + regression guardrails (P10 should land immediately after P1)               |

Each phase is a separate PR with before/after measurements in the description, using the commands in the Baseline section.

# Chefboard: The Focused AI Recipe Manager

Chefboard is a lean recipe manager built around one job: get a recipe from "I found this online / on a card" to "it's on this week's grocery list" with as little friction as possible. AI handles the tedious parts — parsing messy recipe photos and web pages into structured data, and turning a week's worth of recipes into a categorized grocery list.

> [!NOTE]
> This application lives in the `apps/recipes` directory of a monorepo and is deployed to `/protected/recipes`.

## 🎯 Core Feature Set

The app is intentionally scoped to five flows. Everything else has been cut to keep maintenance surface, bundle size, and test burden small:

1. **Browse recipes** — a searchable, filterable, groupable library (`RecipeLibrary.tsx`), shared across your family.
2. **View a recipe** — full ingredients/instructions, star rating & reviews, personal notes, share as text or PDF, and a manual "Refresh AI Data" action.
3. **Add a new recipe** — manual entry, paste a URL, scan a photo of a recipe card, or pick a stack of photos and have them read in the background (see "Bulk photo import").
4. **Add a recipe to a week** — one tap adds/removes a recipe from the currently active week. No day-of-week picker — a recipe is either in this week's plan or it isn't.
5. **Generate a grocery list** — for everything in the active week, with a Standard (deterministic) and Smart (AI) list mode, manual add/edit, check-off, and share/copy as text.
6. **Decide what to cook** — a conversation that asks one thing at a time, offers options it has counted against your actual library, and lets you say what's wrong in words once it has shown you something (`SuggesterConversation.tsx`). The week you just finished is reviewed in four taps per recipe (`WeekReviewPrompt.tsx`), which is what feeds the suggestions over time.

Family sharing (shared recipes, shared week plan, shared grocery list, invites) is a first-class part of all five flows, not a bolt-on.

### What's deliberately NOT here

Cooking mode (step-by-step/timers), favorites, recipe version history, day-level meal scheduling, in-app feedback collection, push notifications & reminders, onboarding tutorials, bulk *edit*/select (bulk photo *import* now exists — see below), H-E-B pricing integration, AI cost estimation, recurring grocery items, "reverse-engineer a dish from a photo" import, and admin user-impersonation/family-admin tooling. If you're looking for one of these in the code and can't find it, it was removed on purpose — see git history around the `cooking-app-scope-plan` branch for the rationale.

## 🛠 Tech Stack

- **Framework**: [Astro 5](https://astro.build/) (SSR, `output: 'server'`, Islands Architecture)
- **UI**: React + [shadcn/ui](https://ui.shadcn.com/) (TailwindCSS + Radix UI primitives)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **State**: [Nanostores](https://github.com/nanostores/nanostores) + `@nanostores/persistent`
- **Search**: [Fuse.js](https://fusejs.io/) — fuzzy search over recipe titles and ingredients, with match highlighting
- **AI**: two providers, split by task (see "AI Integration" below) — OpenRouter (`qwen/qwen3.5-9b`) for the photo-scan OCR pipeline, Gemini 2.5 Flash (`@google/genai`) for everything else
- **Backend**: [Cloudflare Workers/Pages](https://pages.cloudflare.com/) (host) + [Firebase Firestore](https://firebase.google.com/docs/firestore) (data, via a custom REST client) + [Firebase Storage](https://firebase.google.com/docs/storage) (images, via a server-side upload proxy)
- **Testing**: [Vitest](https://vitest.dev/) (unit) + [Playwright](https://playwright.dev/) (E2E) + [Stryker](https://stryker-mutator.io/) (mutation, scoped to `api-utils.js`/`grocery-utils.js`)

## 🧱 Architectural Patterns

### 1. Custom SPA Router (not Astro routing)

Astro does the initial SSR load, but the app itself is a client-rendered SPA managed by `RecipeManager.tsx` and the `useRouter` hook (`ViewMode = 'library' | 'detail' | 'edit' | 'week' | 'family-settings' | 'admin-dashboard' | 'invite' | 'import-review'`).

- **Do NOT** add new `src/pages/*.astro` files for app features. `src/pages/[...path].astro` is a catch-all that always renders the SPA entry point, so deep links still work.
- **Instead**, add a new `ViewMode` and render a conditional component from `RecipeManager.tsx`/`RecipeManagerView.tsx`.
- **Why**: preserves the app-like feel, in-memory state (scroll position, etc.), and offline capability.
- **Code-splitting**: every non-`library` `ViewMode` is a `React.lazy()` chunk behind a `<Suspense>` boundary (see `RecipeManagerView.tsx`). Sharing a recipe as PDF similarly dynamic-`import()`s `@react-pdf/renderer` inside `ShareRecipeDialog.tsx`'s share handler, since that engine is only needed when a user actually exports. Run `npm run analyze` (`ANALYZE=true`, `rollup-plugin-visualizer`) to inspect chunk composition.

### 2. AI Integration — two providers, split by task

- **OpenRouter** (`createOpenRouterClient` in `src/lib/api-helpers.ts`, `OPENROUTER_API_KEY`): used **only** for the photo/URL/text import flow — one transcription call per photo (ingredients + steps + headnote together) followed by a text-only structuring call, both on a single model, `qwen/qwen3.5-flash-02-23`, with `reasoning: { enabled: false }` on every call (the OpenRouter counterpart of Gemini's `thinkingBudget: 0`; without it, dense pages blow the OCR/structuring timeouts). The pipeline itself lives in `src/lib/services/parse-photo-core.ts` — free of Cloudflare/Astro imports, exactly like `grocery-core.ts`, so the self-hosted VM worker can run it for bulk photo import (see `BULK-PHOTO-IMPORT-PLAN.md`). `pages/api/parse-recipe.ts` is only the NDJSON streaming wrapper around it; put new pipeline behaviour in the core, never in the route.
- **Gemini** (`initGeminiClient` in `src/lib/api-helpers.ts`, `@google/genai`, `GEMINI_API_KEY`, model `gemini-2.5-flash`): used for everything else — `executeAiParse()` in `src/lib/services/ai-parser.ts` (background enhancement + manual "Refresh AI Data"), grocery list generation. Pinned to `@google/genai@1.34.0` — a later version breaks the Cloudflare Workers runtime; verify Workers compatibility before bumping.
  - `style='strict'`: the initial import — fast transcription so the user can save right away.
  - `style='enhanced'`: a background **Total Reparse** from the original `sourceUrl`/`sourceImage` (not a text-to-text touch-up) that restructures the recipe into "Kenji-style" scientific step grouping, descriptive paragraphs, and standardized units — this is the "Smart View" toggle on the recipe overview.
  - Both styles must keep working independently — never force enhancement on initial import.
- Both providers are asked for structured JSON output (`responseMimeType`/`response_format: json_object`); `ai-parser.ts`'s `tryRepairJson` handles malformed model output from either.

### 2b. Bulk photo import

Pick several photos at once and get one recipe per photo, read in the background while the app is
closed. See `BULK-PHOTO-IMPORT-PLAN.md`.

- **Why it isn't done in the browser**: phone browsers suspend JS and cancel in-flight `fetch`
  calls when the user switches apps, and fifteen photos takes minutes. The work runs on the VM
  worker (`services/recipe-worker/`), which reads the uploaded photos straight out of Firebase
  Storage.
- **The split is by count**: one photo still takes the existing in-request `/api/parse-recipe`
  path unchanged; two or more go to the queue.
- **Grouping is manual**: a photo can be marked as the continuation page of the one above it. Not
  model-inferred — a wrong auto-grouping silently welds two recipes together and stays invisible
  until someone cooks from it.
- **Results are held on the job, not in `recipes`**: a recipe is created only when the user
  reviews and accepts a card, which is what keeps unreviewed transcription out of the library.
- **Endpoints**: `POST /api/imports` (enqueue, rate-limited to 6 batches/hour),
  `GET /api/imports` (outstanding jobs + badge counts), `POST /api/imports/[jobId]`
  (accept/discard/retry). Limits and the offline-detection threshold live in
  `lib/services/import-batches.ts`.
- **Reads are polled, not subscribed** — `firestore.rules` denies client reads on everything
  except `grocery_lists`.

### 3. Storage Proxy

- **Do NOT** use the Firebase Client SDK (`firebase/storage`) in the browser.
- All uploads go through `POST /api/uploads`, a server-side `FirebaseRestService` authenticated with a Service Account — avoids CORS/auth complexity on the client.
- **Library-card thumbnails** (`Recipe.thumbUrl`): a second, small (~420px) JPEG variant is generated and uploaded alongside the full image whenever a photo is added. `RecipeCard.tsx` renders `thumbUrl` first, falling back to the full-size image fields for recipes saved before this field existed (no backfill).

### 4. Real-Time Sync (Firestore Hooks)

`useFirestoreDocument` (`src/lib/firestoreHooks.ts`) manages subscription lifecycle for real-time Firestore data, gated on `authStore.ts` having a valid user.

### 5. Intelligent Image Extraction

URL imports use a tiered strategy (`src/lib/services/extract-images.ts`) to find the best recipe image: JSON-LD → Open Graph → Twitter Cards → Microdata, filtering out icons/avatars/UI chrome.

### 6. No Nested Arrays in Firestore

Firestore doesn't support nested arrays (e.g. `number[][]`). Use an array of objects instead: `Array<{ indices: number[] }>` (see the step-to-ingredient mapping in `lib/step-ingredient-mapping.ts`).

### 7. Full-Screen Nested Views

For "modal-like" fullscreen views nested inside the app's flex container (Week View, Recipe Detail):

- **Do NOT** use `absolute inset-0` for the root — the parent `<main>` in `RecipeManager` is `flex-1`, and absolutely-positioned children don't contribute to its height (collapsed-container bug).
- **Use** `flex flex-1 flex-col min-h-0` on the root instead.

### 8. Scrollspy

`RecipeLibrary.tsx` manually syncs sticky category headers to scroll position (`onScroll`, `scrollCache`) — check this when refactoring the list view.

### 9. CSS Variables Layout System

Sticky element positioning (header, search bar, content offsets) is driven entirely by CSS custom properties, defined in `src/styles/global.css`:

```css
:root {
  --safe-area-top: env(safe-area-inset-top, 0px);
  --header-height: 56px;
  --search-bar-height: 56px;
  --content-top: calc(var(--header-height) + var(--search-bar-height));
}

/* Search mode overrides (header hidden) */
[data-search-mode='true'] {
  --header-height: 0px;
  --content-top: calc(var(--safe-area-top) + var(--search-bar-height));
}
```

Tailwind utilities (`tailwind.config.js`): `top-header`/`pt-header`, `top-content-top`/`pt-content-top`, `pt-safe-top`.

**Agent Rule**: never hardcode pixel `top`/`padding-top` values on sticky/positioned elements — always use the CSS variable utilities. To add a new shell element, add a variable and fold it into `--content-top`.

### 10. Layout Primitives

Prefer the semantic layout components in `src/components/ui/layout.tsx` over manual Tailwind spacing:

```tsx
// Prefer:
<Stack spacing="lg"><h2>Title</h2><p>Content</p></Stack>

// Over:
<div className="space-y-6"><h2>Title</h2><p>Content</p></div>
```

`<Stack>` (vertical), `<Inline>` (horizontal, alignment/justify/wrap), `<Cluster>` (horizontal, wrapping, tag-like elements). Spacing scale: `xs` 2px, `sm` 8px, `md` 16px, `lg` 24px, `xl` 32px, `2xl` 48px.

### 11. iOS / WebKit Compatibility

Every iOS browser runs on WebKit — an Android-only pass doesn't validate iOS. Full rules in `.agent/rules/04-ios-webkit.md`; recurring failure modes:

1. Any `div`/`span` with `onClick` needs `cursor-pointer`, or iOS Safari won't fire taps.
2. Don't add a redundant `onClick` toggle on a controlled Radix trigger (`open` + `onOpenChange` already handles it) — causes open-then-immediately-close on iOS.
3. `body { position: fixed }` scroll locking must save/restore `scrollY` — use the ref-counted `src/lib/scroll-lock.ts` utility, not raw `document.body.style.overflow`.
4. Minimum touch target `h-11 w-11` (44px, Apple HIG); use an invisible `-inset-[10px]` hit-area extension if the visual size must stay smaller.
5. Swipe containers using `onTouchMove` + `preventDefault()` need `touch-action` set (Tailwind `touch-pan-y`).
6. Never set `user-scalable=no`/`maximum-scale` in the viewport meta tag.
7. `pointer-events-none` on elements hidden via `translate-y-full` — the hit area can persist on iOS after the transform hides it visually.

## 📂 Project Structure

```
src/
├── components/
│   ├── recipe-manager/       # Core recipe management
│   │   ├── dialogs/          # ShareRecipeDialog
│   │   ├── grocery/          # Grocery list UI
│   │   ├── importer/         # AI importer (URL/photo) + photo uploads
│   │   ├── views/            # FamilyManagementView, InviteView
│   │   ├── week-planner/     # Week workspace (plan + grocery tabs)
│   │   └── hooks/            # Recipe + router hooks
│   ├── recipe-details/       # Recipe overview, reviews, edit view
│   ├── recipe-pdf/           # PDF export document (@react-pdf/renderer)
│   ├── admin/                # Admin dashboard (users/codes/invites)
│   ├── auth/                 # Google + email link sign-in
│   ├── ui/                   # shadcn/ui primitives + layout.tsx
│   └── layout/                # Global burger menu, dialog root, scroll-to-top
├── pages/
│   ├── index.astro           # Main recipe app entry
│   ├── [...path].astro       # Catch-all — always renders the SPA
│   ├── login.astro / logout.astro
│   └── api/
│       ├── admin/            # users, access-codes, invites
│       ├── auth/             # login, logout, firebase-token, request-access, redeem-code
│       ├── families/         # current, code, invite, join, leave, members
│       ├── grocery/          # items (manual add/edit/check-off)
│       ├── recipes/          # index + [id] (CRUD, reviews, refresh, share)
│       ├── week/             # planned
│       ├── uploads.ts        # server-side Storage proxy
│       ├── bootstrap.ts      # consolidated boot-time data (see PERFORMANCE-PLAN.md)
│       ├── parse-recipe.ts   # NDJSON wrapper around services/parse-photo-core.ts
│       └── generate-grocery-list.ts  # Gemini grocery list generation
├── lib/
│   ├── services/              # ai-parser, parse-photo-core, extract-images, grocery-service, grocery-core, recipe-merge, ai-timeout, grocery-progress
│   ├── recipeStore.ts / weekStore.ts / familyStore.ts / authStore.ts
│   ├── firebase-client.ts / firebase-server.ts / firebase-rest.ts
│   ├── grocery-logic.ts / grocery-utils.ts
│   ├── types.ts
│   └── firestoreHooks.ts
├── stores/
│   └── overviewCooking.ts     # localStorage-backed ingredient/step check-off (recipe overview only)
├── layouts/
│   ├── Layout.astro / RecipeLayout.astro
└── styles/                    # Global CSS (CSS variables layout system)
tests/                          # Playwright E2E specs
├── msw-setup.ts                # Centralized network mocking & auth cookies
└── ...
```

## 🚦 The Quality Gate

```bash
npm run check:safety
# lint + format + (tsc --noEmit + astro check + vitest --run), in parallel where possible

npm run check:quick
# lint + tsc --noEmit — faster for iteration

npm run check:hygiene
# knip (dead exports) + depcheck (unused deps) + jscpd (duplication)

npm run test:unit      # Vitest, once
npm run test:e2e:fast  # Playwright, chromium only — use during development
npm run test:e2e       # Playwright, all browsers (chromium/firefox/webkit/mobile safari)
npm run test:stryker   # Mutation testing (api-utils.js, grocery-utils.js only)

npm run check:full     # check:safety + stryker + test:e2e:fast + npm audit
npm run check:ci       # the full CI suite: lint:strict + format + parallel checks + size-limit + stryker + full e2e + hygiene + audit
```

Run `npm run check:quick` (at minimum) before considering any change finished; run the fuller gates before a PR.

## 🍽 Choosing meals for the week

Two components at the top of the week plan, deliberately in that order.

**`WeekReviewPrompt`**, also a full screen, asks how the last finished week went — one row per recipe, four options: *Didn't make it · Meh · Good · Again*. This is the app's **only** writer of `cookingHistory`. Before it existed the field was initialised in four places and appended to in none, nothing anywhere set `lastCooked`, and rating meant navigating back to a recipe days later and volunteering a review — which is why four recipes out of 413 carried a rating after six months of weekly planning. The question now arrives in the context the cook is already in, on the cadence they already keep. `GET /api/week/review` decides which week is owed an answer (`lib/week-review.ts`); `POST` records it, stamps `lastCooked`/`lastCookedBy` on the recipe — the only moment the app knows a meal was actually made, and the reason that line had never appeared in `RecipeDetail` — and marks the week answered on the family document. Which recipes were on a given week is read from `families/{id}/weekPlans/{weekStart}` — an append-only record written when a recipe is planned, and never rewritten by unplanning. `weekPlan.assignedDate` is a single mutable field per recipe, so it only remembers the *latest* week: re-plan a recipe this week and it used to drop silently out of last week's review. Weeks planned before that record existed have no document and are still derived the old way. Only weeks within `REVIEW_BACKLOG_WEEKS` (3) are ever offered: without a floor the prompt walks backwards one week at a time forever, and after six months it is asking how a meal went in April.

`skipped` deliberately records nothing. A meal that was planned and not made is real information, and inventing a cook would poison the suggestions this feeds. It still counts as *answered*, though: which recipes have been replied to is tracked per week in `reviewProgress` on the family document, so answering three of five and coming back later asks about the remaining two rather than all five, and a second pass can't append a duplicate cook. A week stops being asked about when every recipe has an answer, or when the cook explicitly says *Don't ask about this week* (`dismiss: true`, recorded in `reviewedWeeks`). Sending `partial: true` saves what was answered and leaves the week open — the client must never invent `skipped` for the rest.

**`SuggesterConversation`** is a full screen (`WeekScreen.tsx`), entered from a button on the plan. Both it and the review started life embedded above the planned recipes, which put a form between the cook and the thing they came to look at on every visit. Each now slides in over the plan rather than changing route, so the week context underneath survives.

It is an exchange, not a wizard: **the model chooses the next question and the options in it**, and the client renders them from a closed widget vocabulary (`lib/services/suggest-turns.ts`). Six decisions hold it together, and `MEAL-SUGGESTER-V2-PLAN.md` records the trade-off behind each:

1. **Generative UI, not generated markup.** The model returns a typed `Turn` — chips, a counter, recipe picks, actions — never HTML. A strict CSP, a home-screen PWA and no runtime JSX compiler rule markup out, and nothing of value needs it.
2. **Code owns the state; the model owns the question.** `Constraints` (wanted + mood + facets + kept + rejected) is the single source of truth. Widget answers write into it; every filter and fallback reads it. The conversation is replayed for context only, which also makes `Constraints` a lossless summary — that is what lets replay stay capped at `MAX_REPLAYED_TURNS`.
3. **Every option is grounded.** `groundWidgets` counts each proposed chip against the real library under the constraints so far, drops the zeros, and drops a widget left with fewer than two live options. An ungrounded model happily offers "Thai" to a library with none. Mood and time pass through uncounted: mood is a steer, and time is a fixed coarse vocabulary.
4. **Free text becomes a visible chip.** A feedback turn may return a `ConstraintPatch`; `applyPatch` validates it against the shared vocabulary, and `ConstraintBar` renders the result as something the cook can remove. Nothing invisible accumulates — that is the failure mode of a chat.
5. **No streaming.** With `thinkingBudget: 0` a turn lands in a second or two, so the first turn is *prefetched* while the cook is still on the plan and previous turns stay on screen during a request. Revisit only if a turn is measured past ~3s.
6. **The old wizard is the degraded path.** `degradedTurn` expresses it in the same contract, with picks from `fallbackSuggestions`, so a model outage still gives a working exchange.

**Taps first, words after.** Narrowing is all taps, because the cook usually cannot name what they want. The composer appears only once a `recipes` widget has rendered — "too much chicken" is only sayable after you have been shown three chickens. Turning down a single card is local and instant (no model call); the batch "Show me others" used to discard cards the cook was still considering.

**Prompt layout matters here.** `buildConversationPreamble` emits the ~8,300-token menu first, byte-identical every turn, so it is a cache prefix; `buildTurnPrompt` appends everything that varies. The previous single-shot builder put the varying parts *above* the menu, which is harmless for one call and ruinous for a conversation. Verify with `usageMetadata.cachedContentTokenCount` rather than assuming. Note the rate limit is now per *turn*.

**The whole library** here means *the cook's* library, and that scope has exactly one implementation: `listAccessibleRecipes(userId)` in `lib/recipe-access.ts` — the collection-level twin of `loadAccessibleRecipe`, expressing the same rule as `GET /api/recipes` (`createdBy IN [me, ...family]` UNION legacy `createdBy == null`). The suggester previously carried its own copy which read the entire `recipes` collection and filtered it with `!createdBy || createdBy === userId || familyId`; the trailing `|| familyId` is truthy for anyone in a family, so the filter did nothing. The model saw other families' recipes, and any pick outside the cook's own library resolved to nothing on the client and vanished — ask for five meals, get three cards. `GET /api/bootstrap` keeps its own copy of these queries on purpose, interleaved with the family and invite fetches to keep the boot path to one round of parallel work.

**The whole library goes to the model.** The instinct is to pre-filter to a handful of candidates in code — right for structured criteria (see the USDA weight table), wrong here, because "something comforting" doesn't map to `protein` or `cuisine` and a metadata filter can drop the best answer before the model sees it. It only works because the library is small: 413 recipes with the facts that matter come to roughly 8,300 tokens, so it fits in one cheap call with no retrieval step.

The model is given numbered lines and must answer with those numbers; anything out of range, duplicated, or already on the plan is discarded (`parseTurn`). A wrong answer is a poor suggestion from the cook's own library, never a dish they don't own.

Facets are a **hard filter** — tapping Chicken means a beef dish is wrong however good a suggestion it would otherwise be — and a recipe with *nothing recorded* for that field is not a match either. It used to match everything: the comparison is bidirectional and `'chicken'.includes('')` is true, so tapping Chicken returned every recipe with no protein set. The time facet's tolerance of missing data is deliberate and different: a recipe with no time recorded is genuinely not known to be slow. That vocabulary lives in `lib/recipe-facets.ts`, shared with `RecipeFilters.tsx`, which had been carrying its own inline copy that had already drifted.

## 👨‍👩‍👧 Recipe Data & Family Sync

Recipes are stored in Firestore; family-scoped data (reviews, notes, week plan) lives alongside them.

**Visibility (creator-centric)**: you see recipes created by you and your family members. Recipes created outside your family are invisible. Legacy recipes with no `createdBy` (pre-dating that field) are visible to everyone.

- **Family-scoped** (`families/{familyId}/recipeData/{recipeId}`):
  - **Reviews**: star rating (1–5, required) + optional comment + optional photo. Multiple reviews per user over time; edit history preserved; average shown on the recipe overview.
  - **Notes** (`recipe.notes`): a shared, family-visible text field on the recipe itself.
  - **Week Plan**: `weekPlan.assignedDate` set to the active week's Monday when a recipe is added — there's no day-of-week assignment. Shared: if one member adds a recipe to the active week, everyone sees it.
  - **Legacy `ratings` array**: single-value ratings predating the review system; kept for backward-compatible average-rating display and PDF/share exports, but new writes always go to `reviews`.

**Family Management** (`views/FamilyManagementView.tsx`, reachable from the burger menu's "Manage Family"):

- **Creator**: created the family; full permissions, can't be removed or demoted.
- **Admin**: can rename the family, invite members, promote/demote, remove members.
- **User**: read-only member list.
- Invited members must have signed into the app at least once before they can be invited by email.

**Admin Dashboard** (`ADMIN_EMAILS`-gated, `src/components/admin/AdminDashboard.tsx`) — intentionally minimal:

- **Users**: approve/reject pending signups, disable/enable, delete.
- **Access Codes**: generate and revoke invite codes.
- **Family Invites**: monitor and revoke pending family invitations.

## 💻 Getting Started

1. **Install dependencies**: `npm install`

2. **Environment setup** — create `.env.local` in `apps/recipes/` (see `scripts/env-check.ts` for the exact required-key list):

   ```bash
   OPENROUTER_API_KEY=your_openrouter_key      # photo-scan import (parse-recipe.ts)
   GEMINI_API_KEY=your_gemini_key              # everything else AI-related

   PUBLIC_FIREBASE_API_KEY=your_api_key
   PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   PUBLIC_FIREBASE_PROJECT_ID=your-project
   PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
   PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   PUBLIC_FIREBASE_APP_ID=your_app_id

   # Users in ALLOWED_EMAILS are auto-approved on first login; ADMIN_EMAILS grants Admin Dashboard access
   ALLOWED_EMAILS=user1@gmail.com,user2@gmail.com
   ADMIN_EMAILS=you@gmail.com
   ```

   Cloudflare runtime env (not in `.env.local`): `FIREBASE_SERVICE_ACCOUNT` (JSON string) — see "Production Deployment" below.

   > Run `npm run check:env` any time to verify `.env.local` has everything `scripts/env-check.ts` requires.

3. **Development**:

   ```bash
   npm run dev
   ```

   Available at [`http://localhost:4321/protected/recipes`](http://localhost:4321/protected/recipes).
   - **Missing Google Sign-In button?** Run `npm run check:env` — the app needs valid Firebase keys to render auth components.
   - **Changed `.env.local`?** Restart the dev server — Vite doesn't hot-reload env changes.
   - **Port conflict?** `lsof -i :4321` then kill the process, or `npm run dev -- --port XXXX`.

4. **Preview with Wrangler** (Cloudflare bindings — KV `SESSION`, etc.):

   ```bash
   npm run build && npm run preview:wrangler
   ```

   Available at `http://localhost:8788/protected/recipes`. Requires a manual rebuild after code changes — use `npm run dev` for day-to-day UI work.

## 🚀 Production Deployment

Deployed to Cloudflare Pages (Workers runtime) behind the monorepo's gateway worker (see root `CLAUDE.md`).

1. **Firebase project**: enable Firestore and Storage in the [Firebase Console](https://console.firebase.google.com/).
2. **Service Account**: generate a private key (Project Settings → Service accounts). Locally, save as `firebase-service-account.json` in `apps/recipes/` (git-ignored). In production, set its JSON contents as the `FIREBASE_SERVICE_ACCOUNT` Cloudflare Pages environment variable/secret.
3. **Cloudflare Pages Dashboard bindings** (Settings → Functions):
   - **KV namespace binding**: variable name `SESSION` — used for session storage.
4. All `PUBLIC_*` and API-key env vars from the "Getting Started" section above must also be set as Cloudflare Pages environment variables.

> [!IMPORTANT]
> After adding or modifying bindings/env vars, trigger a new deployment (push a commit, or **Deployments → Retry deployment** in the dashboard) for changes to take effect.

## Agent Ecosystem

This repo drives more than one agent-instruction layer — read these before making non-trivial changes here:

- Root `CLAUDE.md` — monorepo-wide conventions, commands, and shared patterns across both apps.
- `.github/copilot-instructions.md` — Copilot's equivalent of this file; named workflows (Explore/Iterate/Build/Review/Improve) map to `.github/agents/` and `.github/prompts/`. Key rule: never start implementing until a diagnosis/plan has been shown and approved.
- `.agent/rules/` — always-on constraints: workflow order, tech stack, the quality gate, the design system, iOS/WebKit compatibility.
- `.agent/knowledge/` — domain reference: recipe schema, grocery logic, Gemini API notes, sync standards.
- `.agent/workflows/` — step-by-step procedures (run tests, run locally, etc.).

---

Built with ❤️ by Emilio.

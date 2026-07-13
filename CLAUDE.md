# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a monorepo containing two Astro applications deployed to Cloudflare Pages with a custom routing gateway:

- **apps/recipes** ("Chefboard"): Feature-rich recipe management PWA with Firebase backend, AI recipe parsing/enhancement, authentication, family sharing, grocery lists, and cooking mode. See `apps/recipes/README.md` for the full feature list and architectural deep-dives — read it before making non-trivial changes there.
- **apps/website**: Personal portfolio/blog site using Keystatic CMS for content management

Both apps use Astro SSR (`output: 'server'`) with React islands, Tailwind CSS, and deploy to Cloudflare Workers.

## Development Commands

### Monorepo-Level

```bash
npm run build      # Build both apps and merge outputs with gateway worker
npm run dev        # Run dev servers for both apps concurrently
npm run test        # Run tests across all workspaces
npm run lint        # Run linting across all workspaces
npm run preview     # Preview unified build locally (wrangler pages dev dist)
```

### Recipes App (`apps/recipes`)

```bash
cd apps/recipes
npm run dev              # Start dev server
npm run go               # check:env then dev
npm run build            # Production build
npm run build:test       # Build with PUBLIC_TEST_MODE=true for E2E tests
npm run preview:wrangler # Preview with Wrangler (port 8788)

# Testing
npm run test             # Vitest in watch mode
npm run test:unit        # Unit tests once (vitest --run)
npm run test:watch       # Unit tests in watch mode
npm run test:e2e         # Playwright E2E, all browsers (chromium/firefox/webkit/mobile safari)
npm run test:e2e:fast    # Playwright, chromium only — use this during development
npm run test:stryker     # Mutation tests (only api-utils.js, grocery-utils.js)

# To run a single test file/case, call the runner directly, e.g.:
#   npx vitest run src/lib/date-helpers.test.ts
#   npx playwright test tests/cooking-mode.spec.ts -g "starts a session"

# Type Checking & Linting
npm run check:ts         # tsc --noEmit
npm run check:astro      # astro check
npm run check:parallel   # check:ts + check:astro + test:unit in parallel
npm run check:quick      # lint + check:ts
npm run check:safety     # lint + format + check:parallel  (pre-commit-grade)
npm run check:hygiene    # knip (dead exports) + depcheck (unused deps) + jscpd (duplication)
npm run check:full       # check:safety + stryker + test:e2e:fast + scan
npm run check:ci         # full CI suite: lint:strict + format + check:parallel + stryker + test:e2e + check:hygiene + scan
npm run lint             # ESLint
npm run lint:strict      # ESLint with stricter config (used in CI)
npm run scan             # npm audit --audit-level=high

# Environment
npm run check:env        # Validate .env.local has required keys (scripts/env-check.ts)

# Utilities
npm run format            # Prettier
npm run sync:feedback     # Pull feedback from Firebase (scripts/sync-feedback.ts)
npm run feedback:resolve  # Mark feedback resolved (scripts/resolve-feedback.ts)
```

Required env keys (`scripts/env-check.ts`): `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `PUBLIC_FIREBASE_*`, `PUBLIC_VAPID_KEY`, `VAPID_PRIVATE_KEY`. Cloudflare runtime env: `FIREBASE_SERVICE_ACCOUNT` (JSON string).

### Website App (`apps/website`)

```bash
cd apps/website
npm run dev              # Start dev server
npm run build            # Production build
npm run test              # Vitest
npm run test:e2e          # Playwright E2E
npm run check:safety      # lint + format + tsc --noEmit + astro check
npm run check:hygiene     # knip + depcheck + jscpd
npm run check:full        # check:safety + check:hygiene + test + scan
npm run lint / npm run format
```

## Architecture

### Monorepo Build System

`scripts/build-all.mjs` orchestrates the build:

1. Builds each app independently
2. Merges static assets into a unified `dist/` directory
3. Creates a gateway worker (`dist/_worker.js/index.js`) that routes:
   - `/protected/recipes/*` → recipes app worker
   - Everything else → website app worker

A MessageChannel polyfill is injected at build time for Cloudflare Workers compatibility.

### Recipes App Architecture

**Base URL**: `/protected/recipes` (configured in `astro.config.mjs`)

**Custom SPA Router (not Astro routing)** — this is the most important structural rule in the app:

- The app behaves as a client-rendered SPA managed by `RecipeManager.tsx` and the `useRouter` hook, even though Astro does the initial SSR load.
- **Do NOT add new `src/pages/*.astro` files for app features.** `src/pages/[...path].astro` is a catch-all fallback that always renders the SPA entry point.
- To add a feature, add a new `ViewMode` to `RecipeManager.tsx` and render a conditional component instead. This preserves app-like feel, in-memory state (e.g. scroll position), and offline capability.

**AI Integration** — split across two providers by task, do not conflate them:

- **OpenRouter** (`createOpenRouterClient` in `src/lib/api-helpers.ts`, OpenAI-compatible client, `OPENROUTER_API_KEY`): used **only** for the initial photo-scan flow (`pages/api/parse-recipe.ts`), which OCRs a recipe-card photo in three phases (ingredients, instructions, then structuring). All three phases use a single model, `qwen/qwen3.5-9b` — do not split vision/text models here again without updating this doc.
- **Gemini** (`initGeminiClient` in `src/lib/api-helpers.ts`, `@google/genai`, `GEMINI_API_KEY`): used for everything else — `executeAiParse()` in `src/lib/services/ai-parser.ts` (AI Refresh and background Enhancement), grocery list generation, and grocery cost estimation. Model: `gemini-2.5-flash`. The dependency is pinned to `1.34.0` in `apps/recipes/package.json` because `@google/genai` v1.52.0 breaks the Cloudflare Workers runtime — do not bump it without verifying Workers compatibility.
  - `style='strict'`: initial import (transcription only, fast path so the user can save immediately).
  - `style='enhanced'`: background "Kenji-style" restructuring (scientific step grouping, descriptive paragraphs, standardized units). Triggered automatically after save via a **Total Reparse** from the original `sourceUrl`/`sourceImage` when available, not a text-to-text touch-up.
  - Never force enhancement on initial import — both styles must keep working when touching `ai-parser.ts`.
- Always request structured output (`responseMimeType`/`response_format: json_object`, plus an explicit schema where the provider supports it) — `ai-parser.ts` includes JSON-repair handling (`tryRepairJson`) for malformed model output from either provider.

**Storage Proxy**: Never use the Firebase Client SDK (`firebase/storage`) in the browser. All uploads go through `POST /api/uploads`, which uses a server-side `FirebaseRestService` authenticated with the Service Account — this avoids CORS/auth complexity on the client.

**Data Schema constraints**:

- Firestore does not support nested arrays (e.g. `number[][]`). Use an array of objects instead: `Array<{ indices: number[] }>`.
- `Ingredient` (display): `{ name, amount, prep? }`. `StructuredIngredient` (grocery generation): `{ original, name, amount, unit, category }`.
- Grocery categories, fixed order: Produce → Meat → Dairy → Bakery → Frozen → Pantry → Spices → Other.
- When mapping complex relationships (e.g. ingredients to steps), prefer AI-powered contextual matching over regex/heuristics — needed to correctly handle plurals, shorthand, and pronouns.

**Other key patterns**:

- **Authentication**: Cookie-based middleware (`src/middleware.ts`) checks `site_auth` and `site_user` cookies.
- **Request Context Pattern**: Middleware calls `setRequestContext(context)` (`lib/request-context.ts`) so modules outside the request pipeline (e.g. `firebase-server.ts` reading `FIREBASE_SERVICE_ACCOUNT`) can access Cloudflare runtime env.
- **State Management**: Nanostores with `@nanostores/persistent` — `cookingSession.ts`, `recipeStore.ts`, `familyStore.ts`, `burgerMenuStore.ts`, `dialogStore.ts`, `feedbackStore.ts`.
- **Real-time sync**: `useFirestoreDocument` hook (`src/lib/firestoreHooks.ts`) manages Firestore subscription lifecycle, gated on `authStore.ts` having a valid user.
- **Image extraction from URLs** (`src/lib/services/extract-images.ts`): tiered strategy — JSON-LD → Open Graph → Twitter Cards → Microdata — filtering out icons/avatars/UI chrome.
- **Full-screen nested views** (Week View, Recipe Detail): use `flex flex-1 flex-col min-h-0` for the root, not `absolute inset-0` — the parent `<main>` in `RecipeManager` is `flex-1`, and absolutely-positioned children don't contribute to its height (causes a collapsed-container bug).
- **Scrollspy**: `RecipeLibrary.tsx` manually syncs sticky category headers to scroll position (`onScroll`, `scrollCache`) — check this when refactoring the list view.
- **Cloudflare KV**: session storage binding named `SESSION`.
- **API Routes**: organized under `src/pages/api/` by domain (auth, admin, recipes, cooking, uploads, etc.).

**Directory Structure**:

- `src/lib/` - stores, Firebase clients, AI/service helpers, utilities
- `src/components/` - React components (feature components + `components/ui` shadcn/Radix primitives)
- `src/pages/api/` - API endpoints
- `src/pages/` - Astro pages; `[...path].astro` is the SPA fallback (see above)
- `src/services/` - service layer (ai-parser, extract-images, etc.)
- `src/utils/` - utilities (e.g. ingredient parsing)
- `src/mocks/` - MSW mocks for testing
- `scripts/` - maintenance scripts (migrations, feedback sync, env check)
- `tests/` - E2E Playwright tests + `tests/msw-setup.ts` mocks

### Website App Architecture

- Keystatic CMS integration for content management; content collections for posts, categories, and tags live in `src/content/`.
- Markdoc integration exists but is currently unused (no content collections defined for it).
- Simpler architecture than the recipes app — `src/components/`, `src/pages/`, `src/lib/` only.

### Shared Patterns Across Apps

- **UI Components**: Radix UI primitives with Tailwind styling (shadcn/ui conventions)
- **Styling**: Tailwind CSS with a custom brutal/neobrutalist design system
- **Fonts**: Archivo Black, DM Sans, Space Grotesk (`@fontsource` packages)
- **Testing**: Vitest (unit), Playwright (E2E), Testing Library (React)
- **Linting**: ESLint with strict config, Prettier with Astro/Tailwind plugins
- **Bundler**: Vite (via Astro)

## UI Conventions (Recipes App)

### Layout Primitives

Prefer the semantic layout components in `src/components/ui/layout.tsx` over manual Tailwind spacing:

```tsx
// Prefer:
<Stack spacing="lg"><h2>Title</h2><p>Content</p></Stack>
<Inline spacing="sm" align="center">...</Inline>
<Cluster spacing="xs">...</Cluster>

// Over:
<div className="space-y-6">...</div>
```

Spacing scale: `xs` (2px), `sm` (8px), `md` (16px), `lg` (24px), `xl` (32px), `2xl` (48px).

### CSS Variables Layout System

Sticky element positioning (header, search bar, content offsets) is driven entirely by CSS custom properties, not hardcoded pixel values, so stacking stays correct as shell elements are added/removed.

Defined in `src/styles/global.css`:

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

Tailwind utilities (`tailwind.config.js`): `top-header`/`pt-header` (uses `--header-height`), `top-content-top`/`pt-content-top` (uses `--content-top`), `pt-safe-top` (uses `--safe-area-top`).

How to modify layout:

1. **New shell element** (e.g. toolbar below search): add a new variable (e.g. `--toolbar-height`) and fold it into `--content-top`.
2. **Change element heights**: edit the single variable in `global.css`.
3. **State-based layouts**: use `data-*` attributes on containers with CSS selector overrides (see `[data-search-mode='true']` above).

Key files: `src/styles/global.css`, `tailwind.config.js`, `RecipeManager.tsx` (sets `data-search-mode`), `RecipeControlBar.tsx` / `AccordionGroup.tsx` (consume `top-header` / `top-content-top` for sticky positioning).

### Responsive Modals

Always give modals mobile-safe margins instead of hard-coded centering:

```tsx
// Mobile-first: full-width with margins, centered only from sm: up
className = "fixed left-4 right-4 mx-auto ... sm:left-1/2 sm:-translate-x-1/2";
```

### iOS / WebKit Compatibility

Every iOS browser (Safari, Chrome, Firefox, Edge) runs on WebKit — an Android pass does not validate iOS. Full rules in `.agent/rules/04-ios-webkit.md`; the recurring failure modes:

1. Any `div`/`span` with `onClick` needs `cursor-pointer` (backdrops, custom overlays, Radix `DropdownMenuItem`-style `div[role=menuitem]`) — iOS Safari won't fire taps otherwise.
2. Don't add an extra `onClick` toggle on a controlled Radix trigger (`open` + `onOpenChange` already handles it) — the redundant handler causes open-then-immediately-close on iOS.
3. `body { position: fixed }` for scroll locking must save/restore `scrollY` (`top: -${scrollY}px`) or the page jumps to the top. Don't write `document.body.style.overflow` directly in component effects — use the ref-counted `src/lib/scroll-lock.ts` utility so independent lockers don't race.
4. Minimum touch target `h-11 w-11` (44px per Apple HIG); use an invisible `-inset-[10px]` hit-area extension if the visual size must stay smaller.
5. Swipe containers using `onTouchMove` + `preventDefault()` need `touch-action` set (Tailwind `touch-pan-y`) or iOS absorbs the gesture before React sees it.
6. Never set `user-scalable=no` / `maximum-scale` in the viewport meta tag — breaks WCAG and interferes with portal tap timing.
7. `pointer-events-none` on elements hidden via `translate-y-full` — the hit area can persist on iOS after a transform hides it visually.

Reference implementations: `src/components/ui/ResponsiveModal.tsx` and `src/components/layout/GlobalBurgerMenu.tsx` (backdrop pattern), `RecipeManager.tsx` (scroll lock), `week-planner/WeekPlanView.tsx` (`touch-pan-y`).

## Testing

### Unit Tests (Vitest)

- `npm run test:unit`, co-located with source (`*.test.ts`/`*.test.tsx`)
- Coverage thresholds in `vitest.config.js`; some files (e.g. `date-helpers.ts`) require 100% coverage

### E2E Tests (Playwright)

- `tests/*.spec.ts`, runs against the built app via `preview:wrangler` on port 8788
- `build:test` sets `PUBLIC_TEST_MODE=true` for test-only behaviors
- Projects: chromium, firefox, webkit, mobile safari — use `test:e2e:fast` (chromium only) while iterating
- Use `127.0.0.1`, not `localhost`, when testing auth-cookie flows
- If you ship a new UI feature, add or update a Playwright test for it

### Mutation Tests (Stryker)

- `stryker.config.json` scopes mutation testing to critical files only (`api-utils.js`, `grocery-utils.js`) — run with `npm run test:stryker`

## Deployment

Cloudflare Pages, both apps behind one gateway worker:

- KV namespace binding `SESSION`
- Node.js compatibility flag enabled
- Both apps SSR (`output: 'server'`)

## Agent Ecosystem (this repo also drives GitHub Copilot / custom agent workflows)

This repo has its own agent-instruction layers beyond this file — read them when working in `apps/recipes`, since they encode Emilio's actual workflow preferences:

- `.github/copilot-instructions.md` — Copilot's equivalent of this file; five named workflows (Explore, Iterate, Build, Review, Improve) map to custom agents in `.github/agents/` and prompt shortcuts in `.github/prompts/` (`/explore-feature`, `/iterate-feature`, `/build-feature`, `/improve-feature`, `/quality-gate`, `/check-feedback`, `/add-recipe-field`). Key rule: never start implementing until a diagnosis/plan has been shown and approved.
- `.agent/rules/` — always-on constraints: `00-agent-workflow.md` (plan → implement → self-correct → verify → update README), `01-tech-stack.md`, `02-quality-gate.md` (lint/tsc/astro-check/format, then knip/depcheck/jscpd after refactors, then Playwright before finishing), `03-design-system.md`, `04-ios-webkit.md`, `persona.md` (communicate in plain UX language, not technical jargon — "the button wasn't visible" not "DOM element not found").
- `.agent/knowledge/` — domain reference: recipe schema, grocery logic, Gemini API notes, sync standards.
- `.agent/workflows/` — step-by-step procedures (run tests, run locally, check feedback, migrate mappings, etc.).
- `apps/recipes/README.md` is treated as the architectural source of truth for the recipes app in these workflows — update it when a change affects architecture, features, or setup.

## Important Notes

- npm workspaces monorepo — use `-w` or `cd` into the app directory for workspace-specific commands
- Husky git hooks run `lint-staged` (ESLint fix + related Vitest runs) — recipes app only
- The recipes app has stricter hygiene gates (knip, depcheck, jscpd) than the website app expects from human contributors, but both apps expose the same `check:hygiene` script

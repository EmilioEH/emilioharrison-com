# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a monorepo containing two Astro applications deployed to Cloudflare Pages with a custom routing gateway:

- **apps/recipes**: Feature-rich recipe management app with Firebase backend, AI recipe parsing (Google GenAI), authentication, family sharing, grocery lists, and cooking mode
- **apps/website**: Personal portfolio/blog site using Keystatic CMS for content management

Both apps use Astro SSR with React components, Tailwind CSS, and deploy to Cloudflare Workers.

## Development Commands

### Monorepo-Level

```bash
# Build both apps and merge outputs with gateway worker
npm run build

# Run dev servers for both apps concurrently
npm run dev

# Run tests across all workspaces
npm run test

# Run linting across all workspaces
npm run lint

# Preview unified build locally
npm run preview
```

### Recipes App (`apps/recipes`)

```bash
# Development
cd apps/recipes
npm run dev              # Start dev server
npm run build            # Production build
npm run build:test       # Build with PUBLIC_TEST_MODE=true for E2E tests
npm run preview:wrangler # Preview with Wrangler (port 8788)

# Testing
npm run test             # Run Vitest in watch mode
npm run test:unit        # Run unit tests once
npm run test:watch       # Run unit tests in watch mode
npm run test:e2e         # Run Playwright E2E tests (all browsers)
npm run test:e2e:fast    # Run E2E tests (chromium only)
npm run test:stryker     # Run mutation tests

# Type Checking & Linting
npm run check:ts         # TypeScript type check
npm run check:astro      # Astro check
npm run check:parallel   # Run type checks and unit tests in parallel
npm run check:quick      # Lint + TypeScript check
npm run check:safety     # Lint + format + parallel checks
npm run check:hygiene    # Run knip, depcheck, jscpd
npm run check:full       # All checks including mutation tests and E2E
npm run check:ci         # Full CI check suite

npm run lint             # ESLint
npm run lint:strict      # ESLint with strict config

# Environment
npm run check:env        # Validate .env.local has required keys

# Utilities
npm run format           # Format with Prettier
npm run sync:feedback    # Sync feedback from Firebase
npm run feedback:resolve # Mark feedback as resolved
```

### Website App (`apps/website`)

```bash
cd apps/website
npm run dev              # Start dev server
npm run build            # Production build
npm run test             # Run Vitest tests
npm run test:e2e         # Run Playwright E2E tests
npm run check:safety     # Lint + format + type checks
npm run check:hygiene    # Run knip, depcheck, jscpd
npm run check:full       # All checks including tests
npm run lint             # ESLint
npm run format           # Prettier
```

## Architecture

### Monorepo Build System

The custom build script (`scripts/build-all.mjs`) orchestrates the build:

1. Builds each app independently
2. Merges static assets into a unified `dist/` directory
3. Creates a gateway worker (`dist/_worker.js/index.js`) that routes:
   - `/protected/recipes/*` → recipes app worker
   - Everything else → website app worker

### Recipes App Architecture

**Base URL**: `/protected/recipes` (configured in `astro.config.mjs`)

**Key Patterns**:

- **Authentication**: Cookie-based auth middleware (`src/middleware.ts`) checks `site_auth` and `site_user` cookies
- **State Management**: Nanostores with persistent storage (`@nanostores/persistent`)
  - `cookingSession.ts` - cooking mode state
  - `recipeStore.ts` - recipe data
  - `familyStore.ts` - family sharing state
  - `burgerMenuStore.ts`, `dialogStore.ts`, `feedbackStore.ts`
- **Backend**: Firebase Firestore + Firebase Auth
  - Service account loaded from env var or local file (`firebase-service-account.json`)
  - Custom REST client (`lib/firebase-rest.ts`) for server-side operations
  - Client SDK (`lib/firebase-client.ts`) for browser operations
- **AI Features**: Google GenAI (Gemini) for recipe parsing and enhancement (`api/parse-recipe.ts`)
- **API Routes**: Organized in `src/pages/api/` by domain (auth, admin, recipes, cooking, etc.)
- **Cloudflare KV**: Session storage binding named "SESSION"

**Directory Structure**:

- `src/lib/` - Utility functions, Firebase clients, stores, helpers
- `src/components/` - React components and UI primitives
- `src/pages/api/` - API endpoints
- `src/pages/` - Astro pages with catch-all route `[...path].astro`
- `src/services/` - Service layer
- `src/utils/` - Utility functions (e.g., ingredient parsing)
- `src/mocks/` - MSW mocks for testing
- `scripts/` - Maintenance scripts (migrations, syncing, etc.)
- `tests/` - E2E Playwright tests

**Environment Variables** (see `scripts/env-check.ts`):

Required keys: `GEMINI_API_KEY`, `PUBLIC_FIREBASE_*`, `PUBLIC_VAPID_KEY`, `VAPID_PRIVATE_KEY`

Cloudflare env: `FIREBASE_SERVICE_ACCOUNT` (JSON string)

**Request Context Pattern**:

Middleware sets request context (`lib/request-context.ts`) to provide Cloudflare runtime env access to modules that need it (e.g., `firebase-server.ts` accessing `FIREBASE_SERVICE_ACCOUNT`).

### Website App Architecture

**Key Features**:

- Keystatic CMS integration for content management
- Content collections for posts, categories, and tags
- Simpler architecture compared to recipes app

**Directory Structure**:

- `src/content/` - Keystatic content (posts, categories, tags)
- `src/components/` - React components
- `src/pages/` - Astro pages
- `src/lib/` - Utility functions

### Shared Patterns Across Apps

- **UI Components**: Radix UI primitives with Tailwind styling
- **Styling**: Tailwind CSS with custom brutal/neobrutalist design system
- **Fonts**: Archivo Black, DM Sans, Space Grotesk (@fontsource packages)
- **Testing**: Vitest for unit tests, Playwright for E2E, Testing Library for React
- **Linting**: ESLint with strict config, Prettier with Astro plugin
- **Bundler**: Vite (via Astro)

### Layout System (Recipes App)

The recipes app uses **CSS Custom Properties** for layout dimensions to avoid hardcoded pixel values. This allows sticky elements to stack properly and makes layout changes maintainable.

**CSS Variables** (defined in `src/styles/global.css`):
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

**Tailwind Spacing Utilities** (defined in `tailwind.config.js`):
- `top-header`, `pt-header` → uses `--header-height`
- `top-content-top`, `pt-content-top` → uses `--content-top`
- `pt-safe-top` → uses `--safe-area-top`

**How to modify layout:**
1. **Add a new shell element** (e.g., toolbar below search): Add a new variable `--toolbar-height` and update `--content-top` to include it
2. **Change element heights**: Update the single CSS variable in `global.css`
3. **Add state-based layouts**: Use `data-*` attributes on containers and CSS selectors to override variables

**Key files:**
- `src/styles/global.css` - CSS variable definitions
- `tailwind.config.js` - Tailwind spacing utilities
- `RecipeManager.tsx` - Sets `data-search-mode` attribute
- `RecipeControlBar.tsx` - Uses `top-header` for sticky positioning
- `AccordionGroup.tsx` - Uses `top-content-top` for sticky headers

## Testing

### Unit Tests (Vitest)

- Run unit tests with `npm run test:unit` in the app directory
- Tests co-located with source files (`*.test.ts`, `*.test.tsx`)
- Coverage thresholds configured in `vitest.config.js`
- Some files have 100% coverage requirements (e.g., `date-helpers.ts`)

### E2E Tests (Playwright)

- Located in `tests/*.spec.ts` (recipes app)
- Runs against built app via `preview:wrangler` on port 8788
- Test mode build uses `PUBLIC_TEST_MODE=true` for specific test behaviors
- Projects: chromium, firefox, webkit, mobile safari
- Use `test:e2e:fast` for chromium-only during development

### Mutation Tests (Stryker)

- Configured in `stryker.config.json`
- Only tests specific critical files (`api-utils.js`, `grocery-utils.js`)
- Run with `npm run test:stryker`

## Deployment

Deployed to Cloudflare Pages with:
- KV namespace binding "SESSION"
- Node.js compatibility flag enabled
- Custom gateway worker routing both apps

## Important Notes

- The monorepo uses npm workspaces, so workspace-specific commands use `-w` flag or `cd` into app directory
- MessageChannel polyfill is injected at build time for Cloudflare Workers compatibility
- Both apps use SSR mode (`output: 'server'`)
- Husky git hooks run `lint-staged` which includes ESLint fixes and related test runs (recipes only)
- The recipes app has comprehensive security checks (knip for unused exports, depcheck for unused deps, jscpd for code duplication)

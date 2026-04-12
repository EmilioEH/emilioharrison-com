# Copilot Instructions

## Project Overview

Monorepo with two Astro SSR apps deployed to Cloudflare Pages via a gateway worker:

- **apps/recipes**: Recipe management PWA with Firebase, AI parsing (Gemini), family sharing
- **apps/website**: Portfolio/blog with Keystatic CMS

**Primary reference**: Always read `apps/recipes/README.md` for architectural context.

**Communication**: Focus on user experience impact. Avoid jargon—say "the button wasn't visible" not "DOM element not found".

## How Emilio Works With You

Emilio gives short, UX-focused prompts. He describes problems the way a user would. Five workflows:

| Workflow    | Emilio says something like...             | What to do                                                                                                                             |
| ----------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Explore** | "How does cooking mode work?"             | Map the feature — components, stores, APIs, data flow. Read-only. Use the `Explore` agent.                                             |
| **Iterate** | "Cooking mode has bad ux"                 | Research the feature, diagnose 2-4 specific UX problems, show Emilio, then fix after approval. Use the `Iterate` agent.                |
| **Build**   | "I want users to share grocery lists"     | Research where it fits, propose a plan, then build after approval. Use the `Build` agent.                                              |
| **Review**  | "Review what we just changed"             | Read-only analysis of recent changes against architecture rules, UX quality, and code standards. Use the `Review` agent.               |
| **Improve** | "Improve the code for grocery generation" | Refactor, harden, optimize code quality without changing behavior. Runs after Iterate→Review or Build→Review. Use the `Improve` agent. |

**Typical sequences:**

- Feature iteration: **Iterate → Review → Improve**
- New feature: **Build → Review → Improve**
- Direct cleanup: **Improve** (point at an area)

**Key rule**: Never start coding improvements or new features without showing a diagnosis/plan first. Emilio approves the direction, then you implement.

Custom agents: `.github/agents/` (explore, iterate, build, review, improve)

Prompt shortcuts: `.github/prompts/` — `/explore-feature`, `/iterate-feature`, `/improve-feature`, `/build-feature`, `/quality-gate`, `/check-feedback`, `/add-recipe-field`

## Quality Gate Protocol

Run these checks before completing any task (in `apps/recipes`):

```bash
# Safety (run frequently)
npm run lint && npx tsc --noEmit && npx astro check

# Hygiene (after refactoring/deleting)
npx knip              # Dead code - remove unused exports immediately
npx depcheck          # Unused packages
npx jscpd src/        # Code duplication

# User Journey (before finishing)
npx playwright test   # Always use 127.0.0.1 for auth cookies
```

**Self-correction rule**: If checks fail, fix them yourself. Report the _fix_, not the error.

## Critical Commands

```bash
# Monorepo
npm run build          # Build all + merge with gateway worker
npm run dev            # Concurrent dev servers

# Recipes (cd apps/recipes)
npm run check:safety   # Pre-commit: lint + format + type checks
npm run test:e2e:fast  # Quick E2E (chromium only)
npm run build:test     # E2E build with PUBLIC_TEST_MODE=true
```

## Architecture Rules

### SPA Routing (Recipes App)

**Do NOT create new Astro pages** for app features. The app is an SPA with `[...path].astro` as fallback.

- Add new features by adding a `ViewMode` in `RecipeManager.tsx`
- Navigation uses `useRouter` hook, not Astro routing

### Request Context Pattern

Middleware sets `setRequestContext(context)` for modules needing Cloudflare runtime env (like `firebase-server.ts` accessing `FIREBASE_SERVICE_ACCOUNT`).

### Storage Proxy

**Never use Firebase Client SDK** (`firebase/storage`) in browser. All uploads go through `POST /api/uploads`. Uses server-side `FirebaseRestService` with Service Account.

### Firestore Constraints

Firestore does **not** support nested arrays. Use objects instead:

```ts
// ❌ Wrong: number[][]
// ✅ Correct: Array<{ indices: number[] }>
```

## CSS Layout System

Use CSS variables for layout positioning - **never hardcode pixel values** for sticky elements.

**Key variables** (in [global.css](apps/recipes/src/styles/global.css)):

- `--header-height`, `--search-bar-height`, `--content-top`

**Tailwind utilities**: `top-header`, `top-content-top`, `pt-content-top`, `pt-safe-top`

**State-based**: Use `data-*` attributes to override variables (e.g., `[data-search-mode='true']`)

## Layout Primitives

Use semantic components from `src/components/ui/layout.tsx` instead of manual Tailwind spacing:

```tsx
// ✅ Use layout primitives
<Stack spacing="lg"><h2>Title</h2><p>Content</p></Stack>
<Inline spacing="sm" align="center">...</Inline>
<Cluster spacing="xs">...</Cluster>

// ❌ Avoid hardcoded spacing
<div className="space-y-6">...</div>
```

Spacing scale: `xs`(2px), `sm`(8px), `md`(16px), `lg`(24px), `xl`(32px), `2xl`(48px)

## Responsive Modals

Always add mobile-safe margins:

```tsx
// ✅ Mobile-first pattern
className = "fixed left-4 right-4 mx-auto ... sm:left-1/2 sm:-translate-x-1/2";
```

## iOS / WebKit Compatibility (Critical)

**All iOS browsers (Chrome, Firefox, Edge, Safari) use WebKit.** Android ≠ iOS validation.
Full rules in `.agent/rules/04-ios-webkit.md`. Key rules:

1. **`cursor-pointer` on every `div` with `onClick`** — iOS won't fire taps on `div`/`span` without it. Applies to backdrop overlays and custom sheet dismissal areas.
2. **Never `cursor-default` on Radix menu items** — `DropdownMenuItem` etc. are `<div role="menuitem">`. They need `cursor-pointer` or iOS ignores taps.
3. **No redundant `onClick` on controlled Radix triggers** — `open`+`onOpenChange` is enough. Adding an extra `onClick` toggle causes menu to open-and-immediately-close on iOS.
4. **`body { position: fixed }` requires scroll-position save** — always pair with `top: -${window.scrollY}px` and restore on unlock, or the page jumps to top on iPhone.
5. **Minimum `h-11 w-11` (44px) touch targets** — Apple HIG requirement. `h-9 w-9` (36px) misses taps.
6. **`touch-action: pan-y` (Tailwind: `touch-pan-y`) on swipe containers** — required when using `onTouchMove + e.preventDefault()`, otherwise iOS absorbs the gesture.
7. **No `user-scalable=no` or `maximum-scale` in viewport meta** — breaks WCAG and interferes with portal tap timing.
8. **`pointer-events-none` when hiding via transform** — `translate-y-full` hides visually but the hit area may persist on iOS. Add `pointer-events-none` when an element is off-screen.

## AI Integration (Gemini)

- **SDK**: `@google/genai` with `gemini-2.0-flash` model
- **Parsing**: Centralized in `src/lib/services/ai-parser.ts`
  - `style='strict'`: Initial import (transcription only)
  - `style='enhanced'`: Background enhancement (Kenji-style restructuring)
- **Schema**: Always use `response_mime_type: "application/json"` with `response_schema`
- **Never force enhancement on initial import**

## Data Schema

- **Ingredient**: Simple `{ name, amount, prep? }` for display
- **StructuredIngredient**: Parsed `{ original, name, amount, unit, category }` for grocery generation
- **Grocery categories** (in order): Produce → Meat → Dairy → Bakery → Frozen → Pantry → Spices → Other

## Testing

- **Unit**: Vitest, co-located (`*.test.ts`), run with `npm run test:unit`
- **E2E**: Playwright in `tests/`, uses MSW mocks from `tests/msw-setup.ts`
- **Mutation**: Stryker for critical files (`api-utils.js`, `grocery-utils.js`)

E2E tests run against `preview:wrangler` on port 8788. Use `build:test` for test mode.

**Rule**: If you build a new UI feature, you MUST write or update a Playwright test.

## Key Directories

```
apps/recipes/src/
├── lib/          # Stores (nanostores), Firebase clients, utilities
├── components/   # React + shadcn/ui (Radix primitives)
├── pages/api/    # API endpoints by domain
├── services/     # Service layer (ai-parser, etc.)
└── stores/       # Nanostores for state

.agent/              # Agent rules and workflows (monorepo root)
├── rules/           # Always-on constraints (quality gate, design system)
├── knowledge/       # Domain knowledge (recipe schema, grocery logic)
└── workflows/       # Step-by-step procedures
.github/
├── agents/          # Custom agents (explore, improve, build)
└── prompts/         # Reusable prompt files
```

## UI Stack

- **Components**: shadcn/ui (Radix + Tailwind)
- **Animations**: Framer Motion
- **State**: Nanostores with `@nanostores/persistent`
- **Search**: Fuse.js (fuzzy search)

## MCP Servers

Configured in `.vscode/mcp.json`. Agents call these automatically — you don't need to invoke them manually.

| Server                       | What it does                                          | Used by                  |
| ---------------------------- | ----------------------------------------------------- | ------------------------ |
| **Context7**                 | Live docs for any library (React, Astro, Radix, etc.) | All agents               |
| **Cloudflare Bindings**      | Manage Workers, KV, and build resources               | Iterate, Build, Improve  |
| **Cloudflare Observability** | Production logs, analytics, error debugging           | Iterate, Review, Improve |
| **Cloudflare Docs**          | Current Workers/Pages/KV reference                    | Explore, Build           |
| **Playwright MCP**           | Accessibility snapshots for E2E test selectors        | Iterate, Build, Improve  |
| **shadcn/ui**                | Component APIs, variants, blocks, demos               | Iterate, Build           |
| **GitHub**                   | Repo management, PRs, issues                          | All agents               |

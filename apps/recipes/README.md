# Chefboard: The AI-Powered Recipe Manager

Chefboard is an intelligent recipe management system built for speed, utility, and seamless user experiences. It leverages AI to handle the tedious parts of cooking—like parsing messy web contents into structured data and generating organized grocery lists.

> [!NOTE]
> This application is living inside the `apps/recipes` directory as part of a monorepo and is deployed to `/protected/recipes`.

## 🚀 Core Features

- **PWA Experience**: Installable on mobile with offline support.
- **Advanced Management**: Edit recipes, track version history, and rate/favorite your best dishes.
- **Rich Metadata Tagging**: Organize recipes by Meal Type (Breakfast, Dinner, etc.), Dish Type (Main, Side, etc.), Dietary restrictions (Vegan, Keto), required Equipment (Air Fryer, Slow Cooker), and Occasion (Weeknight, Party).
- **Advanced Filtering & Grouping**: Filter your library by any metadata field. Sort and group recipes into dynamic accordions by Meal Type, Dish Type, or Protein. Powered by [Fuse.js](https://fusejs.io/) for fuzzy search.
- **Data Control**: Export/Import your data and manage bulk deletions.
- **Unified Add Recipe Flow**: A single FAB (floating action button) opens the recipe editor. Use AI-powered photo/URL import, **bulk upload markdown files**, or manually enter recipe details—all from one streamlined interface.
- **Smart Shoppable Grocery Lists**: Generate categorized grocery lists that intelligently convert recipe units (e.g., "4 cloves garlic") into store-friendly purchasable units (e.g., "1 head garlic").
- **Source Attribution**: Grocery items perform "double duty"—displaying the aggregate store unit while allowing users to tap tags (e.g., `[RECIPE A]`) to see exactly how much is needed for each dish.
- **Persistent Caching**: Grocery lists are cached locally, allowing for instant 0ms reloading of previously generated lists, even after closing the app.
- **Shared Family Collection**: All recipes are stored in Firebase Firestore and shared across all authenticated users. Perfect for families or groups collaborating on a recipe collection.
- **Privacy First**: Secure dashboard protected by Google Sign-In authentication. Only authenticated users can access the recipe collection.
- **Weekly Meal Planning**: Tag recipes for "This Week" to organize your cooking schedule. The system intelligently warns you if you're selecting too many recipes with the same protein to ensure variety.
- **Hybrid AI Grocery Generator**: Combine recipes into a consolidated, categorized shopping list. Uses AI to convert chopped/diced/sliced ingredients into whole purchasable produce (e.g., "1 cup chopped onion" → "1 medium onion") and organizes them by aisle.
- **Interactive Shopping Mode**: Check off items as you shop, copy to clipboard, or share via native sheet. Optimizes your trip by grouping items (Produce, Dairy, etc.).
- **Install as App**: Add Chefboard to your home screen on iOS and Android for a native app experience with custom icon and name.
- **Unified Navigation**: An integrated app header that houses the primary menu and grocery list actions, providing a clean and focused navigation experience.
- **Modern Bottom Navigation**: A sticky, glassmorphic bottom bar that houses primary controls—tabs (Library/This Week), search, filters, and view toggles—providing an ergonomic mobile-first experience similar to modern app designs.
- **Sticky & Collapsible Group Headers**: Improved library navigation with group headers that stick to the top while scrolling and can be toggled to expand or collapse categories, optimizing vertical space.
- **Recipe Cooking Mode 2.0**: A completely redesigned cooking experience with "Smart Timers" (browser notifications), **vertical step-by-step navigation** (with previous/next previews), a dedicated **Step List** sheet for quick jumping, and a review flow to rate and capture photos of your creation.
- **Feedback System**: Directly submit bug reports and enhancement ideas from any screen via the global burger menu.
- **Feedback Dashboard**: An integrated management interface (restricted to admins via `ADMIN_EMAILS`) to review, track, and resolve user feedback reports directly in the app.

## 🛠 Tech Stack

- **Framework**: [Astro 5](https://astro.build/) (Islands Architecture for performance)
- **UI Architecture**: React + [shadcn/ui](https://ui.shadcn.com/) (based on [TailwindCSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/))
- **Animations**: [Framer Motion](https://www.framer.com/motion/) (Layout & Physics-based transitions)
- **State Management**: [Nanostores](https://github.com/nanostores/nanostores) (Lightweight & Framework-agnostic)
- **Search**: [Fuse.js](https://fusejs.io/) (Fuzzy search for recipe library)
- **Serverless**: [Cloudflare Pages](https://pages.cloudflare.com/) (Host) + [Firebase Firestore](https://firebase.google.com/docs/firestore) (Data) + [Firebase Storage](https://firebase.google.com/docs/storage) (Images)
- **Content**: [Markdoc](https://markdoc.dev/) + Markdown
- **Testing**: [Vitest](https://vitest.dev/) (Unit) + [Playwright](https://playwright.dev/) (E2E) + [Stryker](https://stryker-mutator.io/) (Mutation)

## 🧱 Architectural Patterns

### 1. Custom SPA Router (vs Astro Routing)

While Astro handles the initial load, the app functions as a **Single Page Application (SPA)** managed by `RecipeManager.tsx` and the `useRouter` hook.

- **Do NOT create new Astro pages** for core app features (e.g., `src/pages/new-feature.astro`).
- **Instead:** Add a new `ViewMode` to `RecipeManager.tsx` and render a conditional component.
- **Why:** This preserves the "App-like" feel, state (e.g. scroll position), and offline capability.

### 2. Hybrid AI Parsing Strategy

We prioritize **deterministic data** over generative AI to save costs and latency.

- The `parse-recipe.ts` endpoint attempts to extract structured `JSON-LD` from the URL _first_.
- Only if JSON-LD is missing does it construct a prompt for Gemini.
- **Agent Rule:** When modifying parsing logic, preserve this `extractJsonLd` priority. Do not blindly switch to "AI-only" parsing.

### 3. Storage Proxy & Custom Auth

- **Constraint:** Do **NOT** use the Firebase Client SDK (`firebase/storage`) in the browser.
- **Pattern:** All file uploads must go through the `POST /api/uploads` endpoint.
- **Why:** The app uses a custom `FirebaseRestService` on the server to handle authentication with a Service Account, avoiding complex CORS/Auth setup on the client.

### 4. Firestore Array Constraints

Firestore does **NOT** support nested arrays (e.g., `number[][]`).

- **Pattern**: When representing a matrix of data (like mapping ingredients to steps), use an array of objects: `Array<{ indices: number[] }>`.
- **Why**: This ensures compatibility with Firestore's document model while allowing for complex relationship mappings.

### 5. Scrollspy & Virtual Navigation

- `RecipeLibrary.tsx` implements a manual "Scrollspy" to sync the sticky category header with the scroll position.
- **Caution:** Refactoring the list view requires checking this scroll logic (`onScroll`, `scrollCache`) to ensure the "sticky header" experience breaks gracefully.

### 6. Layout Primitives (Jan 2026)

The application uses **semantic layout components** (`Stack`, `Inline`, `Cluster`) defined in `src/components/ui/layout.tsx` to ensure consistent spacing and improve maintainability.

#### Why Layout Primitives?

- **Before:** Spacing was hardcoded using Tailwind classes (`space-y-4`, `flex gap-2`), leading to inconsistency and difficulty making global design changes.
- **After:** All layout spacing is controlled through a unified design token system with semantic component names.

#### Available Primitives

- **`<Stack>`**: Vertical layout with consistent spacing between children
- **`<Inline>`**: Horizontal layout with flex properties (alignment, justify, wrapping)
- **`<Cluster>`**: Horizontal layout with wrapping support for tag-like elements
- **`<PageShell>`**: Full-page container with max-width and padding

#### Spacing Scale

All primitives use the `spacing` prop with a controlled scale:

- `xs` = 2px (0.5rem)
- `sm` = 8px (2rem)
- `md` = 16px (4rem)
- `lg` = 24px (6rem)
- `xl` = 32px (8rem)
- `2xl` = 48px (12rem)

#### Usage Guidelines

```tsx
// ✅ Good: Use semantic primitives
<Stack spacing="lg">
  <h2>Title</h2>
  <p>Content</p>
</Stack>

// ❌ Bad: Don't use hardcoded spacing
<div className="space-y-6">
  <h2>Title</h2>
  <p>Content</p>
</div>
```

**Agent Rule:** When creating or modifying UI components, use Layout Primitives for all spacing. Only fall back to manual Tailwind classes for one-off exceptions (e.g., negative margins for overlapping effects).

### Technical Documentation

- [Gemini API Guide](docs/technical/gemini-api-guide.md) – AI integration patterns
- [Deployment Guide](docs/technical/deployment.md) – Production deployment steps
- [Design System](docs/technical/design-system.md) – UI tokens and component styles (Migrated to shadcn/ui)
- [Code Quality Criteria](docs/technical/code-quality-criteria.md) – Standards and best practices

### Recent Updates (Jan 2026)

- **Layout Primitives Refactor**: Completed a comprehensive refactoring of all application components to use semantic layout primitives (`Stack`, `Inline`, `Cluster`). Replaced hardcoded Tailwind spacing classes throughout 25+ components across five phases (Core Components, Recipe Manager, Week Planner, Cooking Mode, Recipe Details). This ensures consistent spacing, improves maintainability, and enables global design changes from a single source.
- **Visual Hierarchy System**: Implemented a comprehensive monochromatic grayscale hierarchy using shadcn/ui design tokens. Added `active`, `inactive`, and `tag` variants to Badge component for clear visual distinction between primary, secondary, and tertiary elements. All interactive elements now follow consistent visual weight patterns (filled dark for high emphasis, bordered for medium, subtle for informational).
- **Sizing Consistency**: Added proper size variants (`sm`, `md`, `lg`) to Badge component, matching Button's existing size system. All badges now use semantic size props instead of manual className overrides, creating predictable touch targets and visual rhythm.
- **Icon Standardization**: Updated Button component with size-aware icon sizing (`[&_svg]:size-3.5` for sm, `size-4` for default, `size-5` for lg). Removed manual icon size overrides across all components. Icons now auto-scale with their containers for balanced, professional appearance.
- **E2E Test Hygiene**: Refactored critical integration tests to use a centralized **Network Mocking** strategy via `tests/msw-setup.ts`. This provides shared mock data (`TEST_RECIPES`) and automated API interception, preventing tests from affecting production data while ensuring high reliability.
- **Cooking Experience 2.0**: A major overhaul of the cooking flow. Features include a direct "Start Cooking" action (no more "Mise En Place" screen), persistent ingredient checkboxes, a global "Ingredient Overlay" drawer, "Smart Timers" with system notifications, **Instruction Preview Cards** (Previous/Next step previews), **Hybrid Ingredient Extraction** (using explicit mapping or heuristics), and a polished "Review & Capture" flow upon completion.
- **Enhanced Cooking Navigation (Jan 2026)**: Added vertical step previews (Previous/Next) using shadcn/ui Cards for better context. Implemented a dedicated "Step List" (Sheet component) with jumping support. Updated header buttons with clearer labels for improved usability.
- **Cooking Mode UX Polish**: Fixed a mobile responsiveness issue where the options menu was appearing off-screen. Implemented a responsive modal positioning pattern (`left-4 right-4 mx-auto ... sm:left-1/2`) that ensures full visibility and safe margins on small viewports while maintaining centered placement on desktop.
- **Week View Workspace**: Transformed the week view into a persistent, sliding workspace. Users can now toggle between a "Plan" view (daily meals) and a "Grocery" view (shoppable list) directly within the workspace contexts.
- **Full-Screen Image Viewer**: Tapping a recipe's header image now opens it in a full-screen overlay using a React Portal, ensuring proper z-index stacking. Press ESC or tap the close button to dismiss.

> [!TIP]
> **Agent Tip: Responsive Modals**
> When building custom modals (centered via `fixed`), avoid hard-coded centering like `left-1/2 -translate-x-1/2` alone. Always use responsive padding/margins (e.g., `left-4 right-4 mx-auto`) to protect against overflow on small mobile screens. Revert to desktop centering at the `sm:` breakpoint.

- **Robust Ingredient Mapping**: Transitioned from a purely heuristic text-matching approach to an **Explicit AI-Generated Mapping** system. Recipes now store a `stepIngredients` property (Firestore-compatible `Array<{ indices: number[] }>`) that explicitly links ingredients to the steps where they are used. Added a Gemini-powered migration script (`scripts/migrate-ingredient-mappings.ts`) with contextual understanding (handles pluralization, pronouns, and partial matches) to upgrade all existing recipes.

### Recent Updates (Dec 2025)

- **Mobile Navigation Overhaul**: Implemented a unified `BottomControls` component. Centralized search, week/library tabs, and grid/list view toggles into an ergonomic, floating bar at the bottom of the screen.
- **Collapsible Library Headers**: Redesigned `RecipeLibrary` with interactive group headers that stick to the top and allow users to collapse/expand specific recipe categories.
- **Admin Bulk Actions**: Administrators can now perform bulk deletions and status updates (Fixed/Open/Ignore) on the Feedback Dashboard.
- **Shadcn/UI Migration**: Fully migrated the UI stack from a custom M3 token system to shadcn/ui. This includes standardized Buttons, Tabs, Sheets, Badges, and Dropdowns, improving accessibility (Radix UI) and maintainability.
- **Recipe Library Refactor**: Removed complex virtualization in `RecipeLibrary` in favor of a clean, responsive CSS Grid with built-in list view support.
- **Clean Architecture**: Removed legacy `tokens.css` and custom `md-sys-*` Tailwind extensions, moving to standard Tailwind utility patterns and shadcn/ui primitives.
- **Recipe Bulk Editing**: Selecting multiple recipes allows for bulk updates to metadata fields like Meal Type, Cuisine, Difficulty, and Protein, now accessible from the bottom bar.
- **Staggered Animations**: Implemented physics-based staggered list animations using Framer Motion for a premium, app-like feel when searching or filtering.

- **Enhanced Search UX**: Redesigned the search experience to focus on content. The header now elegantly slides away to maximize screen real estate when searching.
- **Cooking Mode Animations**: Implemented fluid, directional slide animations for step navigation and staggered entrance animations for ingredients using Framer Motion, enhancing spatial awareness and user delight.

### Known Technical Debt

- **Theming System**: The `themeInit.ts` logic is currently active code (runs on load) but has **no UI controls**. Agents should consider this "headless" or "zombie" code and avoid expanding it unless explicitly asked to build the Theme Switcher UI.

### 🤖 Agent Quick Reference

Key entry points for common tasks:

| Task                       | Primary Files                                                                                                                     |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Fix UI bug**             | `src/components/recipe-manager/*.tsx` → find component by feature name                                                            |
| **Add new metadata field** | `src/lib/types.ts` (Recipe interface) → `RecipeEditor.tsx` → `RecipeFilters.tsx`                                                  |
| **Modify AI parsing**      | `src/pages/api/parse-recipe.ts` (prompt + response handling)                                                                      |
| **Change grocery logic**   | `src/lib/grocery-logic.ts` (deterministic) or `src/pages/api/generate-grocery-list.ts` (AI)                                       |
| **Add API endpoint**       | Create in `src/pages/api/` – Astro file-based routing                                                                             |
| **Update global UI**       | `src/components/layout/` (GlobalBurgerMenu, GlobalFeedback)                                                                       |
| **Manage Feedback**        | `src/components/recipe-manager/FeedbackDashboard.tsx` & `scripts/resolve-feedback.ts`                                             |
| **Add E2E test**           | [msw-setup.ts](file:///Users/emilioharrison/Code/emilioharrison-com/apps/recipes/tests/msw-setup.ts) (API mocking & auth cookies) |
| **Run app locally**        | Use `/run-local` slash command – starts dev server and opens browser                                                              |

**Conventions:**

- React components use `.tsx` extension (TypeScript) and PascalCase naming
- **Styling Rule**: Use `src/components/ui/` + Tailwind utility classes. **Do not** create custom CSS files or classes.
- **State Rule**: Global state (User, Grocery) use Nanostores (`src/lib/*Store.ts`). Local UI state (Modal open/close) uses `useState`.
- **UI Components**: Check `src/components/ui/` first before building new primitives.
- All API routes return JSON with `{ success, data?, error? }` pattern
- Run `npm run check:safety` before committing

## 🚦 The Quality Gate

We maintain high code health through a mandatory protocol. Before contributing or committing, ensure these checks pass:

### Safety Checks

```bash
npm run check:safety
# Runs: Linting, Type Checking (TSC + Astro), and Formatting
```

```bash
npm run check:quick
# Runs: Just Linting + Type Checking (faster for iteration)
```

### Hygiene Checks

```bash
npm run check:hygiene
# Runs: Knip (dead code), Depcheck (unused deps), and Jscpd (duplicates)
```

### Testing & Validation

```bash
npm run test:unit
# Runs: Vitest unit tests
```

```bash
npm run test:e2e
# Runs: Playwright E2E tests (all browsers)
```

```bash
npm run test:e2e:fast
# Runs: Playwright E2E tests (Chromium only, faster)
```

```bash
npm run test:stryker
# Runs: Stryker mutation testing to verify test quality
```

## 7. Recipe Data & Family Sync

Recipes are stored in Firestore, but user-specific data (ratings, notes, week plans) is now **family-scoped**.

### User-Specific vs. Family-Scoped Data

The application distinguishes between data tied to an individual user and data shared across the entire family workspace:

- **User-Specific (Private)**: Stored in `users/{userId}/...`
  - **Favorites**: Favoriting a recipe is a personal preference and does not affect other family members' views.
- **Family-Scoped (Shared)**: Stored in `families/{familyId}/recipeData/{recipeId}`
  - **Notes**: All notes are shared and visible to the family.
  - **Ratings**: Ratings are individual but aggregated into a family average.
  - **Week Plan**: The meal plan is shared. If one member adds a recipe to "This Week," it appears for everyone.
  - **Cooking History**: Shared timeline of cooking sessions.

### Usage

- **Setup:** New users are prompted to create or join a family workspace.
- **Sync:** All actions (rating, planning, noting) automatically sync to all family members in real-time (via optimistic UI and SWR).
- **Attribution:** Changes are attributed to the specific family member who made them (e.g., "Planned by Emilio").

### Family Management (Post-Setup)

Users can manage their family workspace after the initial onboarding through a dedicated "Manage Family" interface.

- **Access Level Control**:
  - **Creator**: The user who created the family. Has full permissions and cannot be removed or demoted.
  - **Admin**: Can rename the family, invite new members, promote/demote members to/from admin status, and remove members.
  - **User**: Read-only access to the member list.
- **Member Lifecycle**:
  - **Invite**: Add new members by email. Note: Invited members must have already signed into the application at least once.
  - **Promote**: Convert a "User" to an "Admin" to delegate management duties.
  - **Remove**: Revoke a member's access to the shared family workspace. This clears their `familyId` and role, effectively moving them back to the onboarding flow.

### Usage

- **Entry Point**: Open the global burger menu (top right) and select **Manage Family**.
- **Renaming**: Click the **Rename** button next to the family name (Admins only).
- **Invitations**: Enter a member's email in the **Invite New Member** section.
- **Management**: Use the role dropdown or the trash icon (Admins only) to manage existing members.

## 8. Validation Strategy

This project enforces strict quality gates using `00-agent-workflow.md`.

### Core Checks

Run these commands locally to verify your work:

| Check             | Command                            | Purpose                                             |
| :---------------- | :--------------------------------- | :-------------------------------------------------- |
| **Lint**          | `npm run lint`                     | Catches syntax, A11y, and code style issues.        |
| **Types**         | `npx tsc --noEmit`                 | Strict TypeScript validation.                       |
| **Tests**         | `npx playwright test`              | End-to-End user journey validation.                 |
| **Week Rollover** | `npx tsx src/lib/week-rollover.ts` | (Legacy) Manual trigger for week planning rollover. |

### E2E Test Scenarios

- **Cooking Mode:** Verifies the full cook flow, timers, and session completion.
- **Family Sync:** Verifies multi-user data sharing by simulating multiple authenticated sessions.

### 🔬 Legacy Testing Context (Playwright + Browser Agent)

We use **two complementary testing approaches**:

| Tool              | Purpose                    | When to Use                                                          |
| ----------------- | -------------------------- | -------------------------------------------------------------------- |
| **Playwright**    | Automated regression tests | Runs in CI/CD; verifies existing features still work after changes   |
| **Browser Agent** | Visual verification        | During development; records proof that new UI changes work correctly |

**Playwright** is the safety net that catches regressions automatically. Agents must run `npm run test:e2e` before completing any task.

> [!NOTE]
> Major functional tests (e.g., Data Management) use **Network Interception** to mock backend responses. This ensures tests are fast, reliable, and **do not write data** to the live production database.

> [!IMPORTANT]
> **API Mocking**: Use the [msw-setup.ts](file:///Users/emilioharrison/Code/emilioharrison-com/apps/recipes/tests/msw-setup.ts) fixture for all API-related tests. It handles the `BASE_URL` logic and provides centralized mock data.
>
> **Auth Cookies**: When using custom `storageState`, always use domain `127.0.0.1` (not `localhost`) to match Playwright's default `baseURL`.

**Browser Agent** is for "show me it works" moments. When building or fixing visual features, agents should:

1. Open the app in the browser subagent
2. Perform the user action (click, type, navigate)
3. Record a short video or screenshot
4. Include the recording in walkthrough artifacts for review

This combination ensures both **automated regression protection** and **human-verifiable visual proof**.

> [!TIP]
> Mobile viewport tests are enabled (iPhone 12 via Safari). Run `npm run test:e2e` to catch mobile responsiveness issues.

### ⚠️ Common Pitfalls for Agents (Avoid Git Errors)

The project uses aggressive **pre-push hooks** that run linting and type checks. To avoid being blocked during a push:

1.  **Strict Linting**: We use a strict `no-unused-vars` rule.
    - **Always** prefix intentionally unused variables with an underscore (e.g., `_e`, `_recipe`).
    - **Never** leave incomplete functions or variables that are declared but unused.
2.  **Architecture Violation**:
    - **Do NOT** create new pages in `src/pages/` for app features. Use `RecipeManager` views.
    - **Do NOT** use `firebase/storage` client SDK. Use `api/uploads`.
3.  **Type Safety**: Always run `npm run check:ts` after modifying `src/lib/` or `src/pages/api/`.
    - The **Firebase integration** ([firebase-rest.ts](file:///Users/emilioharrison/Code/emilioharrison-com/apps/recipes/src/lib/firebase-rest.ts)) is custom. Do not assume standard `firebase-admin` methods (like `.file().save()`) work; check the class implementation.
4.  **Self-Correction Loop**: Before declaring a task finished, **you MUST run**:
    ```bash
    npm run check:quick
    ```
    If this fails, fix the errors yourself. Do not report them to the user as a blocker.

### Processing Feedback (Holodeck)

We utilize an "Agent-Ready" feedback system that captures deep technical context to help Coding Agents diagnose issues without needing to reproduce them blindly.

To sync reports from the live environment, use the slash command or run the script:

```bash
/check-feedback  # Recommended for Agents
# Or: npm run sync:feedback
```

Synced reports are saved to `docs/feedback/` as markdown files:

- `open-reports.md`: All unresolved reports.
- `all-reports.md`: Full archive of all feedback.

Reports include:

- **📸 Auto-Screenshots**: Automatically captured via `html2canvas` and saved to `docs/feedback/images/`.
- **📝 Real Console Logs**: A ring buffer of the last 100 console events (Log, Warn, Error).
- **📱 Device Metadata**: Window size, User Agent, and App State.
- **🚥 Status Tracking**: Tracks if a report is `OPEN`, `FIXED`, or `WONT-FIX`.

To resolve a report via CLI:

```bash
npm run feedback:resolve <id> fixed --remote
```

## 💻 Getting Started

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Environment Setup**:
   Copy `.env.local.example` to `.env.local` and configure the following:

   ```bash
   # Site password (legacy, can be removed)
   SITE_PASSWORD=your_password

   # Gemini API for AI features
   GEMINI_API_KEY=your_gemini_key

   # Firebase Client Config (for Google Sign-In)
   PUBLIC_FIREBASE_API_KEY=your_api_key
   PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   PUBLIC_FIREBASE_PROJECT_ID=your-project
   PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
   PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   PUBLIC_FIREBASE_APP_ID=your_app_id

   # Email Whitelists (comma-separated)
   ALLOWED_EMAILS=user1@gmail.com,user2@gmail.com
   ADMIN_EMAILS=admin@gmail.com
   ```

   > **Production Note**: These variables must also be set in **Cloudflare Pages Environment Variables**. The `PUBLIC_` prefixed variables are safe to expose as they only identify the Firebase project.

3. **Development**:
   The recommended way to run the app locally is using the **`/run-local`** workflow:

   ```bash
   /run-local  # Recommended for Agents & Humans
   # Or manually:
   npm run dev
   ```

   The app will be available at [`http://localhost:4321/protected/recipes`](http://localhost:4321/protected/recipes).

4. **Preview with Wrangler** (Production Simulation):

   > [!WARNING]
   > Use this ONLY for testing Cloudflare-specific bindings (R2/D1/KV). It requires a manual build and **does not** auto-update with code changes. For UI work, always use the **Development** steps above.

   ```bash
   npm run build && npm run preview:wrangler
   ```

   Available at `http://localhost:8788/protected/recipes`.

For a detailed breakdown of the local environment and how to manage data, see the [Local Run Workflow](file:///Users/emilioharrison/Code/emilioharrison-com/.agent/workflows/run-local.md).

## 🚀 Production Deployment

This application is deployed to Cloudflare Pages and requires proper configuration of bindings for production.

### Required Configuration

This application has been migrated to use **Firebase** for data and storage.

1.  **Firebase Project**:
    - Create a project in the [Firebase Console](https://console.firebase.google.com/).
    - Enable **Firestore** and **Storage**.

2.  **Service Account**:
    - Generate a new private key from **Project Settings > Service accounts**.
    - Save the file as `firebase-service-account.json` in `apps/recipes/`.
    - **Important**: This file is git-ignored and should not be committed.

3.  **Environment Variables**:
    - Ensure your deployment environment has access to this file or its contents via secrets.

### Cloudflare Bindings (Legacy / Reference)

The following bindings must be configured in the **Cloudflare Pages Dashboard** for production:

1. **D1 Database Binding**:
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **emilioharrison-com**
   - Navigate to **Settings** → **Functions** → **D1 database bindings**
   - Add binding:
     - **Variable name**: `DB`
     - **D1 database**: `recipes-db`

2. **R2 Bucket Binding** (for recipe images and feedback screenshots):
   - In **Settings** → **Functions** → **R2 bucket bindings**
   - Add binding:
     - **Variable name**: `BUCKET`
     - **R2 bucket**: `recipes-images`

3. **KV Namespace Binding** (for sessions):
   - In **Settings** → **Functions** → **KV namespace bindings**
   - Add binding:
     - **Variable name**: `SESSION`
     - **KV namespace**: Select your session namespace

> [!IMPORTANT]
> After adding or modifying bindings, you **must trigger a new deployment** for changes to take effect. Either:
>
> - Push a new commit to trigger automatic deployment
> - Or use the dashboard: **Deployments** → **Retry deployment**

> [!NOTE]
> The `wrangler.toml` file configures bindings for **local development only**. Production bindings must be configured through the Cloudflare dashboard.

## 📂 Project Structure

src/
├── components/
│ ├── recipe-manager/ # Core recipe management
│ │ ├── RecipeManager.tsx # Main orchestrator component
│ │ ├── RecipeLibrary.tsx # Recipe grid/list with grouping
│ │ ├── RecipeDetail.tsx # Individual recipe view
│ │ ├── RecipeEditor.tsx # Edit/create recipe form with AI import
│ │ ├── AiImporter.tsx # AI recipe parsing (photo/URL)
│ │ ├── RecipeFilters.tsx # Filter panel (metadata, search)
│ │ ├── RecipeHeader.tsx # App bar with menu trigger
│ │ ├── BottomControls.tsx # Unified sticky bottom navigation
│ │ ├── GroceryList.tsx # Grocery list with shopping mode
│ │ ├── SettingsView.tsx # Settings and data management
│ │ ├── FeedbackDashboard.tsx # Integrated feedback management UI
│ │ ├── BulkEditModal.tsx # Bulk update metadata
│ │ ├── BulkRecipeImporter.tsx # Bulk markdown upload
│ │ ├── RecipeControlBar.tsx # Actions for selected recipes
│ │ ├── VarietyWarning.tsx # Protein variety alerts
│ │ └── hooks/
│ │ ├── useRecipes.ts # Recipe CRUD operations
│ │ ├── useFilteredRecipes.ts # Filtering, sorting, search
│ │ └── useGroceryListGenerator.ts # Grocery list with caching
│ ├── cooking-mode/ # Cooking Experience 2.0 Components
│ │ ├── CookingContainer.tsx # Main orchestrator for cooking flow
│ │ ├── CookingHeader.tsx # Header with progress and tools
│ │ ├── CookingStepView.tsx # Step-by-step instruction view
│ │ ├── CookingIngredientsOverlay.tsx # Slide-up ingredient checklist
│ │ ├── CookingTimeline.tsx # NEW: Interactive horizontal progress roadmap
│ │ ├── CookingReview.tsx # Post-cooking rate/note/photo flow
│ │ ├── CookingStepList.tsx # Full "Jump to Step" list (Sheet component)
│ │ ├── ActiveTimersHeader.tsx # Condensed timers view
│ │ ├── CookingOptionsMenu.tsx # Settings and tools menu
│ │ ├── CookingStatusIndicator.tsx # Visual feedback for session
│ │ ├── ExitConfirmation.tsx # End session dialog
│ │ └── TimerControl.tsx # Timer UI and management
│ ├── ui/ # shadcn/ui components (button, tabs, input, dialog, etc.)
│ │ └── layout.tsx # Layout Primitives (Stack, Inline, Cluster, PageShell)
│ └── layout/ # Global layout components
├── pages/ # Astro File-based Routing
│ ├── index.astro # Main recipe app entry
│ ├── login.astro # Authentication page
│ ├── logout.astro # Sign out handler
│ └── api/ # Backend API endpoints
│ ├── parse-recipe.ts # AI recipe extraction
│ ├── generate-grocery-list.ts # AI grocery categorization
│ ├── feedback.ts # Feedback submission
│ ├── recipes/ # Recipe CRUD endpoints
│ └── uploads/ # Image serving
├── lib/ # Shared utilities & State
│ ├── recipeStore.ts # Core recipe nanostore
│ ├── weekStore.ts # Weekly planning nanostore
│ ├── burgerMenuStore.ts # Global menu state
│ ├── feedbackStore.ts # Feedback modal state
│ ├── types.ts # TypeScript interfaces
│ ├── firebase-server.ts # Firebase Service Account (Server)
│ ├── firebase-client.ts # Firebase App (Client)
│ ├── firebase-rest.ts # Custom Firestore REST client
│ ├── grocery-logic.ts # Deterministic grocery merging
│ └── notifications.ts # Browser notification helpers
├── stores/
│ └── cookingSession.ts # Active cooking state nanostore
├── layouts/
│ ├── Layout.astro # Base HTML layout
│ └── RecipeLayout.astro # App wrapper with global menus
└── styles/ # Global CSS
tests/ # Playwright E2E tests
├── auth.spec.ts # Google Sign-In flow
├── recipe-manager.spec.ts # Core management
├── cooking-mode.spec.ts # Cooking workflow
├── grocery-list.spec.ts # List generation
├── feedback.spec.ts # Feedback submission
├── msw-setup.ts # Centralized network mocking & auth
└── ... # Additional test suites

```

---

Built with ❤️ by Emilio.
```

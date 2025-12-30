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
- **Unified Add Recipe Flow**: A single FAB (floating action button) opens the recipe editor. Use AI-powered photo/URL import or manually enter recipe details—all from one streamlined interface.
- **Smart Grocery Lists**: Generate categorized grocery lists from your saved recipes with a single click.
- **Shared Family Collection**: All recipes are stored in Firebase Firestore and shared across all authenticated users. Perfect for families or groups collaborating on a recipe collection.
- **Privacy First**: Secure dashboard protected by Google Sign-In authentication. Only authenticated users can access the recipe collection.
- **Weekly Meal Planning**: Tag recipes for "This Week" to organize your cooking schedule. The system intelligently warns you if you're selecting too many recipes with the same protein to ensure variety.
- **Hybrid AI Grocery Generator**: Combine recipes into a consolidated, categorized shopping list. Uses AI to parse messy ingredients and deterministic logic to merge quantities and organize by aisle.
- **Interactive Shopping Mode**: Check off items as you shop, copy to clipboard, or share via native sheet. Optimizes your trip by grouping items (Produce, Dairy, etc.).
- **Install as App**: Add Chefboard to your home screen on iOS and Android for a native app experience with custom icon and name.
- **Unified Navigation**: An integrated app header that houses the primary menu and grocery list actions, providing a clean and focused navigation experience.
- **Modern Bottom Navigation**: A sticky, glassmorphic bottom bar that houses primary controls—tabs (Library/This Week), search, filters, and view toggles—providing an ergonomic mobile-first experience similar to modern app designs.
- **Sticky & Collapsible Group Headers**: Improved library navigation with group headers that stick to the top while scrolling and can be toggled to expand or collapse categories, optimizing vertical space.
- **Recipe Cooking Mode**: A dedicated, focused view for cooking with pre-cooking checklists, step-by-step guidance, and post-cooking feedback (ratings and notes).
- **Feedback System**: Directly submit bug reports and enhancement ideas from any screen via the global burger menu.
- **Feedback Dashboard**: An integrated management interface (restricted to admins via `ADMIN_EMAILS`) to review, track, and resolve user feedback reports directly in the app.

## 🛠 Tech Stack

- **Framework**: [Astro 5](https://astro.build/) (Islands Architecture for performance)
- **UI Architecture**: React + [shadcn/ui](https://ui.shadcn.com/) (based on [TailwindCSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/))
- **State Management**: [Nanostores](https://github.com/nanostores/nanostores) (Lightweight & Framework-agnostic)
- **Search**: [Fuse.js](https://fusejs.io/) (Fuzzy search for recipe library)
- **Serverless**: [Cloudflare Pages](https://pages.cloudflare.com/) (Host) + [Firebase Firestore](https://firebase.google.com/docs/firestore) (Data) + [Firebase Storage](https://firebase.google.com/docs/storage) (Images)
- **Content**: [Markdoc](https://markdoc.dev/) + Markdown
- **Testing**: [Vitest](https://vitest.dev/) (Unit) + [Playwright](https://playwright.dev/) (E2E) + [Stryker](https://stryker-mutator.io/) (Mutation)

### Technical Documentation

- [Gemini API Guide](docs/technical/gemini-api-guide.md) – AI integration patterns
- [Deployment Guide](docs/technical/deployment.md) – Production deployment steps
- [Design System](docs/technical/design-system.md) – UI tokens and component styles (Migrated to shadcn/ui)
- [Code Quality Criteria](docs/technical/code-quality-criteria.md) – Standards and best practices

### Recent Updates (Dec 2025)

- **Mobile Navigation Overhaul**: Implemented a unified `BottomControls` component. Centralized search, week/library tabs, and grid/list view toggles into an ergonomic, floating bar at the bottom of the screen.
- **Collapsible Library Headers**: Redesigned `RecipeLibrary` with interactive group headers that stick to the top and allow users to collapse/expand specific recipe categories.
- **Admin Bulk Actions**: Administrators can now perform bulk deletions and status updates (Fixed/Open/Ignore) on the Feedback Dashboard.
- **Shadcn/UI Migration**: Fully migrated the UI stack from a custom M3 token system to shadcn/ui. This includes standardized Buttons, Tabs, Sheets, Badges, and Dropdowns, improving accessibility (Radix UI) and maintainability.
- **Recipe Library Refactor**: Removed complex virtualization in `RecipeLibrary` in favor of a clean, responsive CSS Grid with built-in list view support.
- **Clean Architecture**: Removed legacy `tokens.css` and custom `md-sys-*` Tailwind extensions, moving to standard Tailwind utility patterns and shadcn/ui primitives.
- **Recipe Bulk Editing**: Selecting multiple recipes allows for bulk updates to metadata fields like Meal Type, Cuisine, Difficulty, and Protein.
  , now accessible from the bottom bar.

### 🤖 Agent Quick Reference

Key entry points for common tasks:

| Task                       | Primary Files                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| **Fix UI bug**             | `src/components/recipe-manager/*.tsx` → find component by feature name                      |
| **Add new metadata field** | `src/lib/types.ts` (Recipe interface) → `RecipeEditor.tsx` → `RecipeFilters.tsx`            |
| **Modify AI parsing**      | `src/pages/api/parse-recipe.ts` (prompt + response handling)                                |
| **Change grocery logic**   | `src/lib/grocery-logic.ts` (deterministic) or `src/pages/api/generate-grocery-list.ts` (AI) |
| **Add API endpoint**       | Create in `src/pages/api/` – Astro file-based routing                                       |
| **Update global UI**       | `src/components/layout/` (GlobalBurgerMenu, GlobalFeedback)                                 |
| **Manage Feedback**        | `src/components/recipe-manager/FeedbackDashboard.tsx` & `scripts/resolve-feedback.ts`       |
| **Add E2E test**           | Create `tests/<feature>.spec.ts` – use existing tests as templates                          |
| **Run app locally**        | Use `/run-local` slash command – starts dev server and opens browser                        |

**Conventions:**

- React components use `.tsx` extension (TypeScript) and PascalCase naming
- UI components are organized in `src/components/ui/` using shadcn/ui patterns
- Nanostores in `src/lib/*Store.ts` manage global state
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

### 🔬 Testing Strategy: Playwright + Browser Agent

We use **two complementary testing approaches**:

| Tool              | Purpose                    | When to Use                                                          |
| ----------------- | -------------------------- | -------------------------------------------------------------------- |
| **Playwright**    | Automated regression tests | Runs in CI/CD; verifies existing features still work after changes   |
| **Browser Agent** | Visual verification        | During development; records proof that new UI changes work correctly |

**Playwright** is the safety net that catches regressions automatically. Agents must run `npm run test:e2e` before completing any task.

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
2.  **Type Safety**: Always run `npm run check:ts` after modifying `src/lib/` or `src/pages/api/`.
    - The **Firebase integration** ([firebase-rest.ts](file:///Users/emilioharrison/Code/emilioharrison-com/apps/recipes/src/lib/firebase-rest.ts)) is custom. Do not assume standard `firebase-admin` methods (like `.file().save()`) work; check the class implementation.
3.  **Self-Correction Loop**: Before declaring a task finished, **you MUST run**:
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

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:4321/protected/recipes`.

4. **Preview with Wrangler** (simulates production bindings):
   ```bash
   npm run build && npm run preview:wrangler
   ```
   Available at `http://localhost:8788/protected/recipes`.

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
│ ├── recipe-manager/ # Core recipe management (TypeScript)
│ │ ├── RecipeManager.tsx # Main orchestrator component
│ │ ├── RecipeLibrary.tsx # Recipe grid/list with grouping
│ │ ├── RecipeDetail.tsx # Individual recipe view
│ │ ├── RecipeEditor.tsx # Edit/create recipe form with AI import
│ │ ├── AiImporter.tsx # AI recipe parsing (photo/URL)
│ │ ├── RecipeFilters.tsx # Filter panel (metadata, search)
│ │ ├── RecipeHeader.tsx # Tightened app bar with menu trigger
│ │ ├── BottomControls.tsx # Unified sticky bottom navigation
│ │ ├── GroceryList.tsx # Grocery list with shopping mode
│ │ ├── SettingsView.tsx # Settings and data management
│ │ ├── FeedbackDashboard.jsx # Integrated feedback management UI
│ │ ├── VarietyWarning.tsx # Protein variety alerts
│ │ └── hooks/
│ │ ├── useRecipes.ts # Recipe CRUD operations
│ │ ├── useFilteredRecipes.ts # Filtering, sorting, search
│ │ └── useGroceryListGenerator.ts # Grocery list with caching
│ ├── recipe-details/ # Cooking mode sub-components (TypeScript)
│ │ ├── DetailHeader.tsx # Navigation and actions
│ │ ├── MiseEnPlace.tsx # Pre-cooking ingredient checklist
│ │ ├── CookingMode.tsx # Step-by-step instructions
│ │ ├── ReviewMode.tsx # Post-cooking rating/notes
│ │ ├── OverviewMode.tsx # Default recipe display
│ │ └── CheckableItem.tsx # Reusable checkbox item
│ ├── ui/ # shadcn/ui components (button, tabs, input, dialog, etc.)
│ └── layout/ # Global layout components
│ ├── GlobalBurgerMenu.tsx # Slide-out settings/feedback menu
│ └── GlobalFeedback.tsx # Feedback modal wrapper
├── lib/ # Shared utilities
│ ├── store.ts # Recipe list nanostore
│ ├── burgerMenuStore.ts # Burger menu open/close state
│ ├── feedbackStore.ts # Feedback modal state
│ ├── types.ts # TypeScript interfaces (Recipe, Feedback)
│ ├── firebase-server.ts # Firebase service initialization
│ ├── firebase-rest.ts # Firebase REST API client
│ ├── grocery-logic.ts # Deterministic grocery merging
│ └── api-utils.ts # API helper functions
├── pages/
│ ├── index.astro # Main recipe app page
│ └── api/
│ ├── parse-recipe.ts # AI recipe extraction
│ ├── generate-grocery-list.ts # AI grocery categorization
│ ├── feedback.ts # Feedback submission
│ ├── recipes/ # Recipe CRUD endpoints
│ └── uploads/ # R2 image serving
├── layouts/
│ ├── Layout.astro # Base HTML layout
│ └── RecipeLayout.astro # Recipe app wrapper with global menus
└── styles/ # Global CSS
tests/ # Playwright E2E tests
├── auth.spec.ts # Google Sign-In authentication flow
├── recipe-manager.spec.ts # Core recipe management
├── cooking-mode.spec.ts # Cooking workflow
├── grocery-list.spec.ts # Grocery list generation
├── feedback.spec.ts # Feedback submission
├── feedback-dashboard.spec.ts # Feedback management UI & Access Control
├── weekly-planning.spec.ts # This Week feature
├── metadata.spec.ts # Filtering and tagging
└── ... # Additional test suites

```

---

Built with ❤️ by Emilio.
```

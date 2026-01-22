# Chefboard: The AI-Powered Recipe Manager

Chefboard is an intelligent recipe management system built for speed, utility, and seamless user experiences. It leverages AI to handle the tedious parts of cooking—like parsing messy web contents into structured data and generating organized grocery lists.

> [!NOTE]
> This application is living inside the `apps/recipes` directory as part of a monorepo and is deployed to `/protected/recipes`.

## 🚀 Core Features

- **PWA Experience**: Installable on mobile with offline support.
- **Advanced Management**: Edit recipes, track version history, and rate/favorite your best dishes. Supports **multi-image upload** (including auto-converting HEIC/HEIF) and a **zoomable photo carousel**.
- **Rich Metadata Tagging**: Organize recipes by Meal Type (Breakfast, Dinner, etc.), Dish Type (Main, Side, etc.), Dietary restrictions (Vegan, Keto), required Equipment (Air Fryer, Slow Cooker), and Occasion (Weeknight, Party).
- **Advanced Filtering & Grouping**: Filter your library by any metadata field. Sort and group recipes into dynamic accordions by Meal Type, Dish Type, or Protein. Powered by [Fuse.js](https://fusejs.io/) for fuzzy search.
- **Data Control**: Export/Import your data and manage bulk deletions.
- **Share Recipes**: Share any recipe as plain text (clipboard/native share) or as a professionally styled PDF. Customizable export includes recipe photo, notes, ratings, and cooking history. Uses Web Share API on mobile for seamless sharing.
- **Unified Add Recipe Flow**: A single FAB (floating action button) opens the recipe editor with three modes:
  - **Scan**: Upload a photo of a written recipe card. **Dual-Process technology** immediately transcribes the text ("Strict Mode") so you can save right away, while AI runs in the background to structured and enhance the recipe with "Smart View" grouping.
  - **Dish (Experimental)**: Upload a photo of a finished dish. Gemini will **reverse-engineer** the recipe, inferring likely ingredients and steps based on the visual cues and optional context (Cuisine, Taste Profile) you provide.
  - **URL**: Paste a link to import from a website. Also uses **Dual-Process**: immediate parsing followed by background enhancement.
  - **Import**: Bulk upload markdown files or manually enter details from one streamlined interface.
- **Smart Notifications**: "Hybrid" reminder system for meal planning, grocery lists, and daily cooking prompts (Service Worker + In-App Fallback).
- **Offline Capable**: Full PWA support with offline view and cached recipes.
- **Smart Shoppable Grocery Lists**: Generate categorized grocery lists that intelligently convert recipe units (e.g., "4 cloves garlic") into store-friendly purchasable units (e.g., "1 head garlic").
- **Source Attribution**: Grocery items perform "double duty"—displaying the aggregate store unit while allowing users to tap tags (e.g., `[RECIPE A]`) to see exactly how much is needed for each dish.
- **Persistent Caching**: Grocery lists are cached locally, allowing for instant 0ms reloading of previously generated lists, even after closing the app.
- **Shared Family Collection**: All recipes are stored in Firebase Firestore and shared across all authenticated users. Perfect for families or groups collaborating on a recipe collection.
- **Waitlist/Access Control**:
  - "Invite Only" mode active.
  - `ALLOWED_EMAILS` env var controls whitelist.
  - Admins can manage access codes and invites.
- **Admin Impersonation**:
  - Admins can "Login As" any user from the Admin Dashboard.
  - Useful for debugging user-specific issues.
  - Persistent banner shows when impersonating, with a "Stop Impersonating" button.
- **Robust Access Control**: Secure dashboard protected by Google Sign-In. Supports **Request Access** flow with admin approval and **Invite Codes** for instant family access.
- **Invite Others**: A dedicated menu item allowing users to **invite others to their family workspace** or **generate activation codes** for new accounts. Supports native sharing and clipboard copy.
- **Native Invite Sharing**: Use the Web Share API to share family invitations and activation codes directly from the app to messaging platforms.
- **Auto-Authorization**: Invited family members are automatically approved and added to the family workspace upon their first login, bypassing the manual request flow.
- **Beta Tester Onboarding**: A dedicated flow for new users that ensures mobile-first usage (blocks desktop), guides "Add to Home Screen" installation, and provides a **welcome tutorial with interactive demos** showcasing **Multi-Mode AI Import** (URL, Scan, Dish Photo), **Smart Grocery Lists**, Cooking Mode, and Family Sync.
- **Weekly Meal Planning**: Tag recipes for "This Week" to organize your cooking schedule. The system intelligently warns you if you're selecting too many recipes with the same protein to ensure variety.
- **Hybrid AI Grocery Generator**: Combine recipes into a consolidated, categorized shopping list. Uses AI to convert chopped/diced/sliced ingredients into whole purchasable produce (e.g., "1 cup chopped onion" → "1 medium onion") and organizes them by aisle.
- **Interactive Shopping Mode**: Check off items as you shop, copy to clipboard, or share via native sheet. Optimizes your trip by grouping items (Produce, Dairy, etc.).
- **Install as App**: Add Chefboard to your home screen on iOS and Android for a native app experience with custom icon and name.
- **Unified Navigation**: An integrated app header that houses the primary menu and grocery list actions. It is **scroll-aware** (sticks to top, hides on scroll down, reveals on scroll up) to maximize content visibility while maintaining easy access to navigation.
- **Modern Bottom Navigation**: A sticky, glassmorphic bottom bar that houses primary controls—tabs (Library/This Week), search, filters, and view toggles—providing an ergonomic mobile-first experience similar to modern app designs.
- **Sticky & Collapsible Group Headers**: Improved library navigation with group headers that stick to the top while scrolling and can be toggled to expand or collapse categories, optimizing vertical space.
- **Recipe Cooking Mode 3.0**: A premium step-by-step experience with "Smart Timers", **persistent ingredients panel** (desktop/tablet), **horizontal timeline navigation**, and an integrated **review flow** with **5-star ratings**, **finished dish photo upload**, and **inline editing** of ingredients and steps.
- **Feedback System**: Directly submit bug reports and enhancement ideas from any screen via a persistent **Beta Footer Bar** fixed at the bottom of the viewport. Supports a global **keyboard shortcut** (`Cmd/Ctrl + Shift + F`) for instant reporting. The footer is **scroll-aware** (hides on scroll down, appears on scroll up) and intelligently stacked to never obscure content.
- **Admin Dashboard**: A centralized interface (restricted to admins via `ADMIN_EMAILS` check) to:
  - **Users**: View all users, manage their access status (Disable/Enable), and remove users/spam accounts.
  - **Access Codes**: Generate new codes, track redemption history, and disable unwanted codes.
  - **Family Invites**: Monitor pending family invitations and revoke them if necessary.
  - **Feedback**: Review, track, and resolve user feedback reports.
  - **Push Notifications**: Native PWA push notifications alert admins immediately when new feedback is submitted. Supported on Android, Windows, macOS, and iOS (requires "Add to Home Screen").
- **Smart Notifications**: Comprehensive notification system keeping families in sync.
  - **Cooking Timers**: Local alerts when cooking timers complete, even if the app is backgrounded.
  - **Family Sync**: Push alerts when a family member updates the weekly meal plan.
  - **Collaborative Cooking**: Notifications when someone starts a cooking session.
  - **Invites**: Instant alerts when you receive a family invitation.
  - **Granular Control**: Manage preferences for each notification type via the Settings menu.

## 🛠 Tech Stack

- **Framework**: [Astro 5](https://astro.build/) (Islands Architecture for performance)
- **UI Architecture**: React + [shadcn/ui](https://ui.shadcn.com/) (based on [TailwindCSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/))
- **Animations**: [Framer Motion](https://www.framer.com/motion/) (Layout & Physics-based transitions)
- **State Management**: [Nanostores](https://github.com/nanostores/nanostores) (Lightweight & Framework-agnostic)
- **Search**: [Fuse.js](https://fusejs.io/) (Fuzzy search for recipe library) - **Matches titles and ingredients** with support for typos and partial phrases. Results are **sorted by relevance** (best match first), overriding other sort filters when active. Includes **match highlighting** for better visibility.
- **Serverless**: [Cloudflare Pages](https://pages.cloudflare.com/) (Host) + [Firebase Firestore](https://firebase.google.com/docs/firestore) (Data) + [Firebase Storage](https://firebase.google.com/docs/storage) (Images)
- **Content**: [Markdoc](https://markdoc.dev/) + Markdown
- **Testing**: [Vitest](https://vitest.dev/) (Unit) + [Playwright](https://playwright.dev/) (E2E) + [Stryker](https://stryker-mutator.io/) (Mutation)

## 🧱 Architectural Patterns

### 1. Custom SPA Router (vs Astro Routing)

While Astro handles the initial load, the app functions as a **Single Page Application (SPA)** managed by `RecipeManager.tsx` and the `useRouter` hook.

- **Do NOT create new Astro pages** for core app features (e.g., `src/pages/new-feature.astro`).
- **SPA Fallback:** `src/pages/[...path].astro` ensures deep links (e.g. `/protected/recipes/123`) load the SPA entry point (`RecipeManager`).
- **Instead:** Add a new `ViewMode` to `RecipeManager.tsx` and render a conditional component.
- **Why:** This preserves the "App-like" feel, state (e.g. scroll position), and offline capability.

### 2. Hybrid AI Parsing & Enhancement

We prioritize **deterministic data** over generative AI to save costs and latency, but use different AI "Modes" depending on user intent.

- **Data Priority**: The `parse-recipe.ts` endpoint attempts to extract structured `JSON-LD` from the URL _first_. Only if JSON-LD is missing does it construct a prompt for Gemini.
- **Transcription Mode (Strict)**: Used during **Initial Imports**. The AI is instructed to transcribe the recipe _exactly as written_, preserving the original author's voice and structure, while providing immediate access to the data.
- **Dual-Process Enhancement**: After a new recipe is saved, a background job automatically triggers **Enhancement Mode**. The UI uses an **SWR-style revalidation pattern** and **reusable data-fetching callbacks** in `RecipeDetail.tsx` to automatically pick up and render "Smart View" data once the background job finishes, without requiring a user refresh.
- **Improved Parsing Resilience**: The `parse-recipe.ts` implementation includes robust handling for varying Gemini SDK response structures, ensuring stable text extraction even when the AI response format shifts.
- **Enhancement Mode (Kenji-Style)**: Used during background enhancement, **AI Refresh**, and **Dish Photo Scan**. The AI applies "Kenji Lopez-Alt" style best practices:
  - **Scientific Grouping**: Group steps chronologically by component (e.g., "Prepare the Marina", "Cook the Pasta").
  - **Descriptive Paragraphs**: Combine atomic steps into readable, narrative paragraphs.
  - **Logical Formatting**: Standardizes units and ingredient names.
- **Agent Rule**: When modifying `parse-recipe.ts`, ensure both `style='strict'` (default) and `style='enhanced'` flows are maintained. Do not force enhancement on initial import.

### 3. Storage Proxy & Custom Auth

- **Constraint:** Do **NOT** use the Firebase Client SDK (`firebase/storage`) in the browser.
- **Pattern:** All file uploads must go through the `POST /api/uploads` endpoint.
- **Why:** The app uses a custom `FirebaseRestService` on the server to handle authentication with a Service Account, avoiding complex CORS/Auth setup on the client.

### 4. Firestore Array Constraints

Firestore does **NOT** support nested arrays (e.g., `number[][]`).

- **Pattern**: When representing a matrix of data (like mapping ingredients to- **Pattern:** Use an array of objects: `Array<{ indices: number[] }>`.

### 6. Full-Screen Workspace Layout

When creating "modal-like" fullscreen views (e.g., Week View, Recipe Detail) that are nested inside the main app's flex container:

- **Constraint:** Do **NOT** use `absolute inset-0` for the root component.
- **Why:** The parent `<main>` container in `RecipeManager` uses `flex-1`. Absolute children do not contribute to the parent's height, which can cause the parent to collapse (squashed container bug) on some browsers or during animations.
- **Pattern:** Use `flex flex-1 flex-col min-h-0` for the root of these views. This ensures they correctly fill the available vertical space and maintain scroll integrity for their children.
- **Why**: This ensures compatibility with Firestore's document model while allowing for complex relationship mappings.

### 5. Scrollspy Navigation

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
- **[Design System](./docs/technical/design-system.md)** – UI tokens and component styles (Migrated to shadcn/ui)
- **[Testing Strategy](./docs/technical/TESTING.md)**
- [Code Quality Criteria](docs/technical/code-quality-criteria.md) – Standards and best practices

### Recent Updates (Jan 2026)

- **Comprehensive Review System**: Completely revamped recipe reviews with an **inline expansion pattern** on the recipe overview page. Users can now leave detailed reviews including a 5-star rating (required), optional comment (up to 500 characters), and optional finished dish photo. The review form uses **progressive disclosure**—selecting a star rating automatically expands to show comment and photo fields, creating a lightweight yet powerful review experience without modals or page navigation.
- **Review Photo Integration**: Photos uploaded with reviews are automatically added to the recipe's image gallery, with the latest review photo becoming the recipe's main image. This provides visual social proof and helps families see how dishes turn out over time.
- **Edit History Tracking**: All review edits are preserved in an `editHistory` array, showing an "edited" indicator with timestamp on modified reviews. Users can only edit their own reviews, with ownership verified server-side.
- **Multiple Reviews per User**: Users can submit multiple reviews for the same recipe over time (e.g., after cooking it again), creating a richer history of experiences. Each review is a separate entry with its own timestamp.
- **Backward Compatibility**: The new `reviews` array coexists with the legacy `ratings` array in `FamilyRecipeData`. Legacy ratings are automatically converted to review format for display, ensuring a smooth transition.

- **Interactive Recipe Ratings**: Implemented a comprehensive 5-star rating system. Users can now rate recipes during the post-cooking review flow. The library view and recipe cards now display these ratings.
- **Finished Dish Photos**: Added the ability to capture or upload a photo of the finished dish at the end of a cooking session. These photos are automatically added to the recipe's image gallery.
- **Family Rating Breakdowns**: Enhanced the cooking history view to show an average rating and allow users to tap to see a detailed breakdown of individual family members' ratings, with the ability for users to update their own ratings. Now features **standard star highlighting** (fills all lead-up stars) and **seamless UI updates** without page refreshes.
- **Quick Rating Component**: Added a "Rate this recipe" component directly to the recipe overview for users who haven't rated yet. Supports standard hover/tap highlighting and instant UI updates.
- **Recipe Detail Stability**: Optimized the `RecipeDetail` rendering by removing the timestamp-based key, preventing unnecessary component remounts and improving reliability for automated tests.
- **Post-Cooking UX**: Refined the navigation after a cooking review. Users now stay on the **Recipe Overview** screen instead of returning to the library, allowing them to instantly see their new rating and notes.
- **AI Infrastructure Hardening**: Resolved stability issues in recipe parsing by improving how the system handles streaming chunks from the Gemini SDK. Added strict JSON validation to internal refresh APIs to prevent "Unexpected token" errors.

- **Week View Stabilization**: Resolved an issue where the Week View workspace sometimes failed to render planned recipes due to non-persistent store state during navigation. Improved store robustness and ensured reliable synchronization between the meal planner and the recipe library.
- **E2E Test Infrastructure Hardening**: Broadened the MSW (Mock Service Worker) API interception strategy to catch nested routes (like `/week-plan`) and updated element locators using more stable `getByRole` and `filter` patterns. This significantly increases test reliability in CI-like environments.
- **Feedback Screenshot Fix**: Resolved an issue where feedback screenshots failed to capture on long pages. Constrained `html2canvas` to the visible viewport to prevent illegally large canvases (30k+ pixels) from producing empty data URLs.
- **Testing Infrastructure Hardening**: Expanded the automated testing strategy with a new **Integration Testing Layer** (`tests/integration/`) to verify complex server-side logic (like grocery list merging) that is mocked in E2E tests. Increased unit test coverage for core utilities (`date-helpers`, `type-guards`).

- **Login API & Manager Cleanup**: Refactored the authentication flow and consolidated `RecipeManager` logic. This fix improved E2E test stability and resolved issues with the burger menu visibility and state.
- **Performance Optimization**: Removed `@tanstack/react-virtual` from the recipe library in favor of a clean, responsive native CSS Grid. This simplifies the component tree and improves scroll performance by utilizing native browser rendering.

- **Layout Primitives Refactor**: Completed a comprehensive refactoring of all application components to use semantic layout primitives (`Stack`, `Inline`, `Cluster`). Replaced hardcoded Tailwind spacing classes throughout 25+ components across five phases (Core Components, Recipe Manager, Week Planner, Cooking Mode, Recipe Details). This ensures consistent spacing, improves maintainability, and enables global design changes from a single source.
- **Visual Hierarchy System**: Implemented a comprehensive monochromatic grayscale hierarchy using shadcn/ui design tokens. Added `active`, `inactive`, and `tag` variants to Badge component for clear visual distinction between primary, secondary, and tertiary elements. All interactive elements now follow consistent visual weight patterns (filled dark for high emphasis, bordered for medium, subtle for informational).
- **Sizing Consistency**: Added proper size variants (`sm`, `md`, `lg`) to Badge component, matching Button's existing size system. All badges now use semantic size props instead of manual className overrides, creating predictable touch targets and visual rhythm.
- **Icon Standardization**: Updated Button component with size-aware icon sizing (`[&_svg]:size-3.5` for sm, `size-4` for default, `size-5` for lg). Removed manual icon size overrides across all components. Icons now auto-scale with their containers for balanced, professional appearance.
- **E2E Test Hygiene**: Refactored critical integration tests to use a centralized **Network Mocking** strategy via `tests/msw-setup.ts`. This provides shared mock data (`TEST_RECIPES`) and automated API interception, preventing tests from affecting production data while ensuring high reliability.
- **Cooking Experience 2.0**: A major overhaul of the cooking flow. Features include a direct "Start Cooking" action (no more "Mise En Place" screen), persistent ingredient checkboxes, a global "Ingredient Overlay" drawer, "Smart Timers" with system notifications, **Instruction Preview Cards** (Previous/Next step previews), **Hybrid Ingredient Extraction** (using explicit mapping or heuristics), and a detailed **Review & Annotate** flow (Difficulty Rating + Ingredient/Step Notes).
- **Enhanced Cooking Navigation (Jan 2026)**: Implemented a **vertical carousel animation** for step transitions, providing real-time previews of previous and next steps. Added a dedicated "Step List" (Sheet component) with jumping support. Updated header buttons with clearer labels for improved usability.
- **Cooking Mode UX Polish**: Fixed a mobile responsiveness issue where the options menu was appearing off-screen. Implemented a responsive modal positioning pattern (`left-4 right-4 mx-auto ... sm:left-1/2`) that ensures full visibility and safe margins on small viewports while maintaining centered placement on desktop. Refined the post-cooking review flow with a **Skip button** for quick exits and collapsible ingredient and step note sections for a cleaner interface.
- **Cooking Review Enhancements**: Added support for **inline editing** of ingredients and steps directly from the review screen. Changes are automatically persisted to the shared recipe, and the system handles amount/name parsing for ingredients.
- **Week View Workspace**: Transformed the week view into a persistent, sliding workspace. Users can now toggle between a "Plan" view (daily meals) and a "Grocery" view (shoppable list) directly within the workspace contexts.
- **Full-Screen Image Viewer**: Tapping a recipe's header image now opens it in a full-screen overlay using a React Portal, ensuring proper z-index stacking. Press ESC or tap the close button to dismiss.
- **Recipe Edit Mode & Version History**: Introduced a comprehensive Edit Mode allowing users to modify ingredients, steps, metadata, and photos directly. Includes a **Version History** system that archives previous states of the recipe on every save (both manual edits and **AI Refreshes**), allowing users to view and restore past versions with a built-in safety net.
- **Invite Sharing & Auto-Auth (Jan 2026)**: Implemented native sharing for activation codes and family invites using the Web Share API. Added an "Invite Friends" section in Settings for authorized users to generate codes. Enhanced the login flow to automatically authorize and enroll users if they have a pending family invitation.
- **Deterministic Invitation IDs**: Migrated to base64-encoded email IDs for pending invitations, enabling O(1) lookups during the login process for a seamless "invite-to-approve" experience.

> [!TIP]
> **Agent Tip: Responsive Modals**
> When building custom modals (centered via `fixed`), avoid hard-coded centering like `left-1/2 -translate-x-1/2` alone. Always use responsive padding/margins (e.g., `left-4 right-4 mx-auto`) to protect against overflow on small mobile screens. Revert to desktop centering at the `sm:` breakpoint.

- **Quick Feedback Entry Points**: Implemented a persistent "Feedback" bar and a global keyboard shortcut (`Cmd/Ctrl + Shift + F`) to streamline user reporting during beta testing. Integrated into the global layout as a document-flow element at the bottom of the page, ensuring it never obscures navigation or page content.
- **Robust Ingredient Mapping**: Transitioned from a purely heuristic text-matching approach to an **Explicit AI-Generated Mapping** system. Recipes now store a `stepIngredients` property (Firestore-compatible `Array<{ indices: number[] }>`) that explicitly links ingredients to the steps where they are used. Added a Gemini-powered migration script (`scripts/migrate-ingredient-mappings.ts`) with contextual understanding (handles pluralization, pronouns, and partial matches) to upgrade all existing recipes.
- **Onboarding UX Polish (Jan 2026)**: Refactored the interactive onboarding tutorial with a **vertically centered** content layout (using `min-h-[100dvh]`) and refined bottom-pinned navigation. Added a "Previous" button for better step traversal and improved the visual hierarchy of the step indicators.
- **SSR Stability Fix**: Converted browser-only libraries (like `heic2any`) and image processing utilities to dynamic imports. This prevents critical server-side rendering crashes in preview/production environments while maintaining full image optimization capabilities on the client.
- **Login Access Restore (Jan 2026)**: Fixed an issue where unauthenticated users were unable to use "Request Access" or "Access Code" features because the API endpoints were blocked by the authentication middleware. Added `/api/auth/request-access` and `/api/auth/redeem-code` to permitted public routes, ensuring new users can always submit requests or join via invite.
- **Pending User Activation (Jan 2026)**: Enabled the "Redeem Invite" flow for users in the `pending_approval` state, allowing them to enter an activation code and bypass the waitlist immediately without needing admin intervention.
- **Pull-to-Refresh Restoration**: Restored native browser pull-to-refresh functionality by moving the main scroll container back to the `body` tag. Updated all scroll-aware components (Header, Footer) to track window scroll events.
- **Scroll-Aware Week Bar**: The **Week Context Bar** (bottom navigation) now intelligently slides out of view when scrolling down and reappears when scrolling up, coordinating perfectly with the Beta Feedback Footer to maximize screen real estate.
- **UI Polishing & Alignment (Jan 2026)**: Relocated the burger menu to the top-right of the black User Bar. Expanded the App Header to the full browser width (consistent with the footer) while maintaining centered content spacing. Standardized internal padding across the User Bar, Header, and Footer to ensure perfectly straight vertical left-alignment for the "Welcome", "CHEFBOARD", and "Beta Preview" elements.
- **Robust Mobile Login Resiliency (Jan 2026)**: Implemented an improved authentication flow for mobile devices that prioritizes stable `signInWithPopup` over redirects. Added specific detection and user-friendly guidance for the "Missing Initial State" error common in iOS in-app browsers (e.g., opening links from SMS/WhatsApp), ensuring users are never left with a blank white screen and are guided to Safari when necessary.
- **Service Worker Stability (Jan 2026)**: Fixed a critical bug where push notification subscriptions failed because the Service Worker attempted to precache a redirected dynamic route (`/protected/recipes/`). Removed the dynamic route from `urlsToCache` to ensure reliable installation and activation.
- **Service Worker Immediate Activation (Jan 2026)**: Fixed persistent "Service Worker not ready" errors on mobile devices by adding `skipWaiting()` and `clients.claim()` lifecycle calls. The SW now activates instantly instead of waiting 10+ seconds, ensuring push notification subscriptions succeed immediately.
- **Robust Notification Subscription (Jan 2026)**: Implemented a resilient **Self-Healing** mechanism for push notifications in `PushNotificationManager`. The system now robustly handles race conditions, ensures **Mobile API Compliance**, guarantees **State Persistence** (via explicit scope verification), uses **Server-Side Upserts** to prevent conflict errors, and includes a user-facing **Test Notification** feature for instant verification.
- **Scroll to Top Button (Jan 2026)**: Added a floating "Scroll to Top" button that appears when scrolling past the viewport height. It provides a smooth return to the top of the page and is positioned to avoid overlapping with the Beta Feedback Footer, ensuring a clean and accessible user experience.
- **Notification System Stabilization (Jan 2026)**: Resolved critical "Illegal Constructor" errors affecting Android and certain desktop browsers by replacing raw `new Notification()` calls with the robust `ServiceWorkerRegistration.showNotification()` API. Added a new E2E test suite (`notification-settings.spec.ts`) to prevent regressions in preference persistence.
- **Accessibility Fix (Jan 2026)**: Fixed an issue where toggle switches in Notification Settings were unclickable by replacing the custom `div`-based implementation with a proper `<label>` wrapper and adding `aria-label` support, ensuring full accessibility and interaction reliability.
- **Cooking Timer & Layout Polish**: Refined the cooking timer experience by consolidating duplicate displays, restoring the minimized/expanded toggle, and enabling step navigation from the timer. Improved mobile layout with better footer padding and higher contrast for next-step previews.
- **Hybrid Instruction Display**: Implemented a smart numbering system for recipe instructions. "Strict" recipes (transcribed) display traditional step numbers (e.g., "(1) Step text"). "Enhanced" recipes (AI-structured) feature numbered **Group Headers** (e.g., "(1) PREP THE BEEF") with unnumbered, checklist-style steps below, improving readability for complex workflows.

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
| **Add new metadata field** | Use slash command: `/add-metadata` (Covers Types, UI, AI, and Filtering)                                                          |
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

### Testing & Validation

For a comprehensive guide on which test to run and how to debug, see the **[/run-tests](file:///Users/emilioharrison/Code/emilioharrison-com/.agent/workflows/run-tests.md)** workflow.

```bash
/run-tests # Auto-runs Unit and E2E checks
```

**Quick Reference:**

- **Unit**: `npm run test:unit` (Logic/Utils)
- **E2E**: `npm run test:e2e` (User Features)
- **Fast E2E**: `npm run test:e2e:fast` (Chromium only)

```bash
npm run test:stryker
# Runs: Stryker mutation testing to verify test quality
```

#### Test Strategy (Tiers)

1. **Unit**: Isolated tests for utility functions (e.g. `src/lib/date-helpers.test.ts`).
2. **Integration**: Service-layer tests for business logic not covered by E2E mocks (e.g. `tests/integration/`).
3. **E2E**: Full user journey tests with mocked backend for stability.

## 7. Recipe Data & Family Sync

Recipes are stored in Firestore, but user-specific data (ratings, notes, week plans) is now **family-scoped**.

### User-Specific vs. Family-Scoped Data

The application distinguishes between data tied to an individual user and data shared across the entire family workspace:

### User-Specific vs. Family-Scoped Data

The application distinguishes between data tied to an individual user and data shared across the entire family workspace:

- **Visibility (Creator-Centric):**
  - **Shared Solitude**: You see recipes created by **you** and your **family members**.
  - **Strict Isolation**: Recipes created by users _outside_ your family are strictly invisible.
  - **Legacy Compatibility**: Recipes created before Jan 2026 (without an owner) are visible to everyone.
- **User-Specific (Private)**: Stored in `users/{userId}/...`
  - **Favorites**: Favoriting a recipe is a personal preference and does not affect other family members' views.
- **Family-Scoped (Shared)**: Stored in `families/{familyId}/recipeData/{recipeId}`
  - **Reviews**: Users can leave multiple reviews per recipe, each with a star rating (1-5), optional comment, and optional photo. Reviews are individual (attributed to specific users) but displayed together for the family. Each user can submit multiple reviews over time. Edit history is preserved.
  - **Notes** _(Deprecated - use Reviews)_: All notes are shared and visible to the family. These are legacy cooking annotations, distinct from reviews.
  - **Ratings** _(Deprecated - use Reviews)_: Legacy ratings are individual but aggregated into a family average. New implementations should use the `reviews` array instead.
  - **Week Plan**: The meal plan is shared. If one member adds a recipe to "This Week," it appears for everyone.
  - **Cooking History**: Shared timeline of cooking sessions.

### Usage

- **Setup:** New users are prompted to create a new family workspace or **Join an Existing Family** using an activation code.
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

### Admin Access

Designated site administrators (configured via `ADMIN_EMAILS`) possess "Super Admin" capabilities across all family workspaces.

- **Global Visibility**: Admins can view a list of all active families and their metadata (ID, Member Count, Creator) via the **Admin Dashboard**.
- **Management Overrides**: Admins can:
  - Drill down into _any_ family's details.
  - Manage members (update roles, remove users) for _any_ family, bypassing standard membership restrictions.

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
- **Admin Features:** Verifies admin dashboard and family management using `PUBLIC_TEST_MODE` to bypass database checks.

### Environment Configuration

To run E2E tests with full Admin capabilities without a production database:

```bash
PUBLIC_TEST_MODE=true npm run build:test
```

This bypasses server-side Firestore checks for the `TestUser`, allowing them to impersonate admins and access protected API endpoints.

**Test Helpers:**

- `?skip_onboarding=true`: Appended to the URL to bypass the interactive onboarding flow (e.g., `/protected/recipes?skip_onboarding=true`). Essential for testing internal views like Family Settings or Modals.

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
   # Users in ALLOWED_EMAILS are automatically approved and considered admins upon login (Bootstrapping).
   ALLOWED_EMAILS=user1@gmail.com,user2@gmail.com

   # PWA Push Notifications (VAPID)
   # Generated via `npx web-push generate-vapid-keys`
   PUBLIC_VAPID_KEY=your_public_key
   VAPID_PRIVATE_KEY=your_private_key
   VAPID_SUBJECT=mailto:your_email@example.com
   ```

   > **Production Note**: These variables must also be set in **Cloudflare Pages Environment Variables**.

3. **Development**:
   The recommended way to run the app locally is using the **`/run-local`** workflow:

   ```bash
   /run-local  # Recommended for Agents & Humans
   # Or manually:
   npm run dev
   ```

   The app will be available at [`http://localhost:4321/protected/recipes`](http://localhost:4321/protected/recipes).

### 🛠 Troubleshooting Common Local Issues

- **Missing Login Button**: If the Google Sign-In button is missing, run `npm run check:env` to verify your `.env.local` configuration. The app requires valid Firebase keys to render authentication components.
- **Vite Restart Required**: After adding or changing values in `.env.local`, you **must restart** the dev server (`Ctrl+C` then `npm run dev`) for the changes to take effect.
- **Port Conflict**: If port 4321 is already in use, find the process using `lsof -i :4321` and kill it, or use `npm run dev -- --port XXXX`.

> [!IMPORTANT]
> **Always run `npm run check:env`** before starting development to ensure your local environment is correctly configured with the necessary secrets.

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
│ │ ├── FamilyManagementView.tsx # Family member management and invites
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
│ ├── [...path].astro # Catch-all handler for SPA deep links
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

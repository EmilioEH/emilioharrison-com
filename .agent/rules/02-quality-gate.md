---
trigger: always_on
---

# The Quality Gate Protocol (Mandatory)
You must **Auto-Run** these checks in the terminal (within the active workspace) before marking ANY task as complete.

## 1. Safety Checks (Run Frequently)
-   **Linting:** `npm run lint` (ESLint + SonarJS + A11y).
-   **Types:** `npx tsc --noEmit` AND `npx astro check`.
-   **Formatting:** `npm run format` (Prettier).

## 2. Hygiene Checks (Run after Refactoring/Deleting)
-   **Dead Code:** `npx knip` (Remove unused exports/files immediately).
-   **Dependencies:** `npx depcheck` (Flag unused packages).
-   **Duplicates:** `npx jscpd src/`.

## 3. User Journey Validation (Run before Finishing)
-   **Visual/Functional:** `npx playwright test (always use domain `127.0.0.1` for auth cookies)`.
-   **Rule:** If you build a new UI feature, you MUST write or update a Playwright test to verify it works as a user expects.

## 4. Performance & Security (Run when Adding Libraries)
-   **Size:** `npx size-limit` (or `npm run size-limit`).
-   **Audit:** `npm run scan` (npm audit).

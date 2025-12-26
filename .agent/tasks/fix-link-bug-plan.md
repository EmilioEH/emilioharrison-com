# Implementation Plan - Fixing "Everything is a Link" Redirect Bug

## User Story
**As Emilio**, I want to use the Chefboard app without being constantly redirected to the login screen and seeing the entire page as a massive clickable link, **so that** I can actually manage my recipes and prepare my meals efficiently.

## Proposed Changes

### 1. Fix Layout Bug
- **File:** `src/layouts/RecipeLayout.astro`
- **Change:** Add the missing `</a>` closing tag for the "Log Out" link in the header.
- **Rationale:** An unclosed `<a>` tag wraps the entire `<slot />` (the whole page content) in a link to `/logout`. This causes every interaction to trigger the logout flow, which redirects the user to the login screen. It also makes all text appear as part of a link.

## Quality Gate Checklist
- [ ] **Linting:** `npm run lint` - Should catch unclosed tags or structural issues.
- [ ] **Types:** `npx tsc --noEmit` & `npx astro check`.
- [ ] **Formatting:** `npm run format`.
- [ ] **Verification:** `npx playwright test`. I should add a specific test case that checks for the existence of this logout link and ensures it doesn't wrap the entire page.

## Verification Plan
1.  **Automated Tests:**
    - Run existing Playwright tests.
    - Add a new smoke test to verify that the main dashboard content is NOT inside an anchor tag.
2.  **Manual Verification:**
    - I will check the HTML structure (if possible via logs or by running a script that checks for the `<a>` tag boundaries).

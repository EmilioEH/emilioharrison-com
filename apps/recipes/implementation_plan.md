# Implementation Plan - Commit and Sync Staged Changes

## User Story

As a user, I want a more robust cooking experience with an integrated ingredients panel and smarter timers, and I want to be able to view and manage multiple photos for each recipe so that I can better document and follow my cooking process.

## Proposed Changes

### Cooking Mode Enhancements

- Added `IngredientsPanel.tsx` for a persistent view of required items.
- Refactored `CookingContainer.tsx`, `CookingHeader.tsx`, `CookingStepView.tsx`, and `CookingTimeline.tsx` to integrate the new ingredients panel and improve vertical navigation.
- Updated `timerManager.ts` for more reliable active timer tracking.
- Added comprehensive E2E tests in `cooking-mode.spec.ts`.

### Multi-Image Support

- Introduced `Carousel.tsx` for navigating multiple recipe images.
- Updated `ImageViewer.tsx` to support swiping and zooming across multiple photos.
- Updated `RecipeLibrary.tsx` to display the primary user-uploaded photo if available.
- Added `recipe-images.spec.ts` to verify multi-image functionality and upload flows.

### UI & Architecture

- Updated `CheckableItem.tsx` and `OverviewMode.tsx` for consistent styling.
- Extended `types.ts` to support multiple image metadata.

## Quality Gate Checklist

- [ ] **Linting:** `npm run lint`
- [ ] **Types:** `npx tsc --noEmit` & `npx astro check`
- [ ] **Formatting:** `npm run format`
- [ ] **User Journey:** `npx playwright test`

## Verification Plan

1. Run safety checks (lint, types, format).
2. Run Playwright E2E tests to ensure no regressions in Cooking Mode and to verify new Multi-Image features.
3. Confirm "I have verified the User Journey with Playwright and the Code Health with the Quality Gate."

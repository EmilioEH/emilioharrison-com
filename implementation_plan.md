# Implementation Plan - Commit and Sync Changes

This task involves finalizing, verifying, and committing several fixes and improvements made to the Recipe App.

## User Story

As a Developer, I want to ensure my recent fixes for photo uploads, feedback submissions, and image viewing are clean, verified, and synchronized with the remote repository so that the application remains stable and up-to-date.

## Proposed Changes

### Core

- **Photo Upload Fix**: Updated `OverviewMode.tsx` to use correct `BASE_URL` for API calls and improved error reporting.
- **Feedback Fix**: Removed `domSnapshot` from `FeedbackModal.jsx` to stay within Firestore's 1MB document limit.
- **Touchscreen Zoom**: Implemented pinch-to-zoom in `ImageViewer.tsx` for better mobile usability.

## Quality Gate Checklist

- [ ] **Linting**: `npm run lint`
- [ ] **Types**: `npx tsc --noEmit` and `npx astro check`
- [ ] **Formatting**: `npm run format`
- [ ] **Tests**: `npx playwright test` (if applicable/vibe check)

## Verification Plan

1. Run lint and type checks to ensure no regressions.
2. Run local tests to verify the fixes.
3. Commit with a descriptive message.
4. Push to origin.

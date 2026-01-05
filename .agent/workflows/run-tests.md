---
description: Run automated Playwright E2E tests to verify features and prevent regressions
---

# Run Playwright Tests

Use this workflow to run automated end-to-end tests. This is the **primary way to verify** that code changes didn't break existing functionality.

## When to use

- After refactoring code
- Before submitting changes
- When you need to verify "User Journeys" (e.g. Auth, feedback, cooking mode)

## Steps

// turbo

1. Run all tests (Headless):

   ```bash
   cd /Users/emilioharrison/Code/emilioharrison-com/apps/recipes && npm run test:e2e
   ```

2. (Optional) Run specific test file:
   If you only changed one feature (e.g. feedback), run only that spec to save time:

   ```bash
   cd /Users/emilioharrison/Code/emilioharrison-com/apps/recipes && npx playwright test tests/feedback.spec.ts
   ```

3. (Optional) Debug mode:
   If tests fail, you can run them with the UI to see what's happening (requires browser subagent, but usually `test:e2e` is sufficient for agents):
   ```bash
   npx playwright test --ui
   ```

## Interpreting Results

- **Pass**: All green ticks. Proceed.
- **Fail**: Read the error message. It usually tells you exactly what element was not found or what assertion failed. Fix the code, not the test (unless the feature changed correctly).

## API Mocking & Auth

If you are writing or debugging tests that fetch data:

- Use the centralized mock data in [msw-setup.ts](file:///Users/emilioharrison/Code/emilioharrison-com/apps/recipes/tests/msw-setup.ts).
- Ensure auth cookies in `test.use({ storageState: ... })` use domain `127.0.0.1` instead of `localhost`.
- If a route is not being intercepted, check if the app is redirecting to `/login` because of a cookie domain mismatch.

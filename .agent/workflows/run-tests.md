---
description: Run Unit, Integration, and E2E tests to verify code quality and features.
---

This workflow defines the standard verification process. You must match the test type to the scope of your changes.

# Test Strategy Selector

| Scope of Change   | Component Example                     | Recommended Test Command                |
| :---------------- | :------------------------------------ | :-------------------------------------- |
| **Utility Logic** | `date-helpers.ts`, `grocery-logic.ts` | `npm run test:unit`                     |
| **Backend Logic** | `src/pages/api/`, Database Queries    | `npm run test:unit` (server-only tests) |
| **UI Components** | `Button.tsx`, `RecipeCard.tsx`        | Browser Agent (Manual) or E2E           |
| **User Flow**     | "Cooking Mode", "Auth", "Feedback"    | `npm run test:e2e`                      |

# Steps

## 1. Quick Verification (Unit & Integration)

// turbo
Run this for _every_ change to ensure you haven't broken core logic.

```bash
cd /Users/emilioharrison/Code/emilioharrison-com/apps/recipes && npm run test:unit
```

## 2. Deep Verification (E2E)

// turbo
Run this before asking for review on feature work.

```bash
cd /Users/emilioharrison/Code/emilioharrison-com/apps/recipes && npm run test:e2e
```

### Optimizing E2E

If checking a specific feature, run only that spec:

```bash
# Example: Testing only the feedback flow
force_color_prompt=true npx playwright test tests/feedback.spec.ts
```

## 3. Debugging Failures

### Unit Test Failures

- **Watch Mode**: `npx vitest` to run tests instantly on save.
- **Trace**: Check the stack trace. Valid logic changes often require updating the test expectation.

### E2E Failures

- **UI Mode**: Use `npx playwright test --ui` to see the browser.
- **Common Issues**:
  - **Timeouts**: The element wasn't visible within 10s.
  - **Auth**: Ensure `domain: 127.0.0.1` is used for cookies.
  - **Mocks**: Check `tests/msw-setup.ts` if your API call isn't returning mock data.

# Quality Gate

Before calling `notify_user` to finish a task, you should be able to say:

> "I have verified all logic with `npm run test:unit` and preserved the User Journey with `npm run test:e2e`."

---
description: Start the local dev server and open the recipe app in the browser for the user to test
---

# Run Recipe App Locally

Use this workflow when the user wants to **visually interact** with the app in a browser to verifying UI changes or test user flows.

> [!IMPORTANT]
> **Data is LIVE**: This app connects to the **REAL Production Firebase**.
> Any recipes you add or delete will be visible to all users.
> **Clean up after yourself** if you create test data.

## Prerequisites

1. Check that `.env.local` exists:
   ```bash
   ls /Users/emilioharrison/Code/emilioharrison-com/apps/recipes/.env.local
   ```
   If missing, ask the user to copy `.env.local.example` and configure it.

## Steps

// turbo

1. Start the development server:

   ```bash
   cd /Users/emilioharrison/Code/emilioharrison-com/apps/recipes && npm run dev
   ```

   Wait for "http://localhost:4321" to appear.

2. Open the app in the browser subagent:
   - **URL**: `http://localhost:4321/protected/recipes`
   - **Login**: If redirected to login, use the Google Sign-In button (requires `.env.local` config).
   - **Interact**: Use the browser tools to click, type, and navigate.

## Testing Strategy

- **Visual / Exploratory**: Use THIS workflow (`/run-local`).
- **Regression / Automated**: Use `/run-tests` (Playwright). Do not use this workflow for pure regression testing.

## Example Browser Task

```
Task: Navigate to http://localhost:4321/protected/recipes.
If prompted, log in.
Then, click the "Add Recipe" FAB and verify the new AI import modal appears.
Take a screenshot.
```

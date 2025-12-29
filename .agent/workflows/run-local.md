---
description: Start the local dev server and open the recipe app in the browser for the user to test
---

# Run Recipe App Locally

Use this workflow when the user wants to see or interact with the app in a browser.

## Steps

// turbo

1. Start the development server in the background:

   ```bash
   cd /Users/emilioharrison/Code/emilioharrison-com/apps/recipes && npm run dev
   ```

   Wait a few seconds for the server to start (look for "http://localhost:4321" in output).

2. Open the app in the browser subagent:
   - Navigate to: `http://localhost:4321/protected/recipes`
   - If the user is not logged in, you'll see the login screen
   - Use the browser_subagent tool to interact with the app

## Notes

- **Data is LIVE**: All recipes and feedback submitted go to the real Firebase database
- The dev server supports hot-reload — code changes appear instantly
- To stop the server, terminate the background command or use Ctrl+C

## Example Browser Task

To open and verify the app is running:

```
Task: Navigate to http://localhost:4321/protected/recipes and confirm the page loads.
If you see a login screen, that's expected. Take a screenshot and return.
```

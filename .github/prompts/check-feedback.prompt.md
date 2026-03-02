---
name: Check Feedback
description: Sync and review user feedback — find bugs and issues reported by real users
---

Check for new user feedback and bug reports in the recipes app.

## Steps

1. Sync the latest feedback from Firebase:

   ```bash
   cd apps/recipes && npm run sync:feedback
   ```

2. Read the open reports:

   ```bash
   cat apps/recipes/docs/feedback/open-reports.md
   ```

3. For each open report, summarize:
   - **What the user experienced** (in plain English)
   - **How serious it is** (blocks them from cooking, cosmetic annoyance, etc.)
   - **Which feature area it affects** (cooking mode, recipe import, grocery list, etc.)

4. Prioritize by severity — anything that blocks a core user journey (viewing, cooking, importing recipes) comes first.

5. If asked to fix a bug, reference the Report ID in your work.

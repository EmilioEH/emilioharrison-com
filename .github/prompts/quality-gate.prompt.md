---
name: Quality Gate
description: Run the full quality gate — safety checks, hygiene, and E2E tests
argument-hint: Optional scope (e.g., "just safety", "full", "hygiene only")
---

Run the quality gate for the recipes app. Work in `apps/recipes/`.

## What to run

### Safety (always run these)

```bash
cd apps/recipes && npm run lint && npx tsc --noEmit && npx astro check
```

### Hygiene (run if files were added/removed/refactored)

```bash
cd apps/recipes && npx knip && npx depcheck && npx jscpd src/
```

### E2E (run before finishing any feature work)

```bash
cd apps/recipes && npx playwright test
```

## Rules

- If anything fails, **fix it yourself** — don't just report the error
- For knip findings: remove unused exports/files immediately
- For depcheck findings: flag which packages to remove but ask before uninstalling
- For lint errors: auto-fix what you can, manually fix the rest
- Summarize what passed and what you fixed

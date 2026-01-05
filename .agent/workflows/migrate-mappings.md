---
description: How to migrate existing recipes to use AI-powered ingredient-to-step mappings.
---

# Ingredient Mapping Migration

This workflow describes how to run the AI-powered migration script to retroactively add explicit `stepIngredients` mappings to existing recipes.

## Prerequisites

- `GEMINI_API_KEY` must be set in your `.dev.vars` or environment.
- Firestore access via service account (`firebase-service-account.json`).

## Steps

### 1. Perform a Dry Run

// turbo

1. Run the migration script in dry-run mode to preview the mappings:
   ```bash
   GEMINI_API_KEY=$(grep GEMINI_API_KEY .dev.vars | cut -d= -f2) npx tsx scripts/migrate-ingredient-mappings.ts
   ```

### 2. Verify AI Logic

Review the console output to ensure the AI is correctly matching ingredients to steps (e.g., handling "lime" vs "limes").

### 3. Execute Migration

// turbo

1. Run the script with the `--execute` flag to update Firestore:
   ```bash
   GEMINI_API_KEY=$(grep GEMINI_API_KEY .dev.vars | cut -d= -f2) npx tsx scripts/migrate-ingredient-mappings.ts --execute
   ```

### 4. Optional: Targeted Migration

// turbo

1. To test or migrate a specific number of recipes, use the `--limit` flag:
   ```bash
   GEMINI_API_KEY=$(grep GEMINI_API_KEY .dev.vars | cut -d= -f2) npx tsx scripts/migrate-ingredient-mappings.ts --execute --limit 5
   ```

## Why run this?

- When the AI model improves.
- When you detect missing mappings in legacy data.
- After bulk importing recipes that might lack explicit mappings.

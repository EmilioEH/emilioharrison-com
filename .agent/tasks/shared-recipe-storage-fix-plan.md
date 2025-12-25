---
artifact_type: implementation_plan
summary: |
  Implementation plan to restore shared recipe storage across all users while fixing test isolation issues.
  The app is designed for families/groups to share recipes, so all users should see the same recipe collection.
---

# Shared Recipe Storage Implementation Plan

## User Story
**As a** family member using Chefboard  
**I want to** see all recipes added by any family member  
**So that** we can build a shared family recipe collection together

## Context
The app was incorrectly reverted to per-user storage. The intended behavior is:
- **All users share the same recipe collection** (stored in `recipes:shared` KV key)
- **Any user can add, edit, or delete recipes**
- **Changes are visible to all users immediately**

The previous test failures were caused by:
1. Tests not cleaning up after themselves (recipes accumulated)
2. Tests using hardcoded recipe names causing duplicates
3. Tests not accounting for shared storage model

## Implementation Steps

### 1. Restore Shared Storage
- Change `user-data.ts` back to use `recipes:shared` key for both GET and POST
- Remove per-user isolation

### 2. Fix Test Isolation Issues
- **persistence.spec.ts**: Use unique recipe names with timestamps
- **recipe-input.spec.ts**: Clear shared storage before each test OR use unique names
- **shared-sync.spec.ts**: Rename to verify shared behavior (not isolation)

### 3. Add Test Cleanup
- Implement a test helper to clear the shared KV storage between tests
- OR ensure all tests use unique identifiers to avoid collisions

### 4. Update Documentation
- Update README.md to clarify the shared storage model
- Document that this is a family/group recipe app, not per-user

## Quality Gate Checks
- ✅ **Linting**: `npm run lint`
- ✅ **Type Checking**: `npx tsc --noEmit` and `npx astro check`
- ✅ **Unit Tests**: `vitest --run`
- ✅ **E2E Tests**: `npx playwright test` (all must pass with shared storage)

## Success Criteria
1. All users see the same recipe collection
2. Recipes added by one user appear for all users
3. All E2E tests pass without duplicates or race conditions
4. Documentation clearly states the shared storage model

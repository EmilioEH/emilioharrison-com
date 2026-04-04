# Grocery List Enhancement — Implementation Plan

> **PRD:** [grocery-list-enhancement-prd.md](./grocery-list-enhancement-prd.md)  
> **Created:** 2026-04-04  
> **Last Updated:** 2026-04-04  

This plan is designed for execution across multiple Claude Code sessions. Each phase is self-contained with clear inputs, outputs, and verification steps.

---

## How to Use This Plan

- **Status values:** `not started` | `in progress` | `done` | `blocked` | `skipped`
- **Each task** has acceptance criteria — mark `done` only when all criteria pass
- **Session notes** go in the Notes column or the session log at the bottom
- **If a task changes scope**, update the task description here before proceeding

---

## Phase 1: Data Foundation

**Goal:** Build the static product database and aisle mapping that everything else depends on.  
**Dependencies:** None — this phase can start immediately.  
**Estimated scope:** Pure data + one dev script, no UI changes, no breaking changes.

### Tasks

| # | Task | Status | Files | Notes |
|---|------|--------|-------|-------|
| 1.1 | Create H-E-B Manor aisle map as TypeScript data | not started | `src/data/heb-manor-aisle-map.ts` | Transcribe the store directory image into structured data. Include: (a) `STORE_CATEGORY_ORDER` — the 19-category ordered array, (b) `AISLE_CONTENTS` — aisle number → product keywords, (c) `CATEGORY_AISLE_RANGES` — category → aisle number(s), (d) `assignAisle(productName, category)` — function that looks up aisle from product name keywords. See PRD Feature 3 for full aisle contents. |
| 1.2 | Write the H-E-B product scrape script | not started | `scripts/scrape-heb-products.ts` | Dev-time Node script. Hits H-E-B GraphQL (`https://www.heb.com/graphql`) per department for store 811. Paginates results. Maps each product to our 19-category taxonomy using `heb-manor-aisle-map.ts`. Writes output to `src/data/heb-manor-products.json`. Reference: `heb-sdk-unofficial` npm package / `heb-scraper` GitHub repos for GraphQL query format. This is disposable tooling — don't over-engineer. |
| 1.3 | Run the scrape and generate static DB | not started | `src/data/heb-manor-products.json` | Execute the script from 1.2. Validate output: reasonable number of products (expect 500–2000+), no nulls in required fields, categories match our taxonomy. If the scrape fails or gets blocked, fall back to manually curating ~200 common items (see PRD static fallback list). Document which approach was used. |
| 1.4 | Wire up `grocery-suggestions.ts` to use the static DB | not started | `src/lib/grocery-suggestions.ts` | Import from `heb-manor-products.json`. Export the `GROCERY_SUGGESTIONS` array (currently empty placeholder). Add a `searchSuggestions(query: string)` function with simple word-overlap fuzzy matching. |
| 1.5 | Add `matchProductToSuggestion(ingredientName)` | not started | `src/lib/grocery-suggestions.ts` | Fuzzy match an arbitrary ingredient name (from AI or manual) against the static DB. Returns best match (or null). Used later by grocery generation to attach price + aisle to AI-generated items. |
| 1.6 | Unit tests for aisle map + suggestion matching | not started | `src/lib/grocery-suggestions.test.ts`, `src/data/heb-manor-aisle-map.test.ts` | Test: `assignAisle('peanut butter', 'Pantry & Condiments')` → 4. Test: `searchSuggestions('avoc')` returns avocado products. Test: `matchProductToSuggestion('chicken breast')` returns a match. |

### Phase 1 Acceptance Criteria
- [ ] `heb-manor-aisle-map.ts` exports the 19-category order and aisle→product mapping
- [ ] `heb-manor-products.json` exists with product data (or curated fallback)
- [ ] `grocery-suggestions.ts` exports non-empty `GROCERY_SUGGESTIONS` and working search/match functions
- [ ] All unit tests pass
- [ ] No existing tests broken
- [ ] No UI changes — app works exactly as before

---

## Phase 2: 19-Category Store-Order Sorting

**Goal:** Replace the current 8-category sort with the H-E-B Manor 19-category walking path.  
**Dependencies:** Phase 1 (needs `STORE_CATEGORY_ORDER` from aisle map).  
**Impact:** Changes grocery list display order. Non-breaking — existing data just sorts differently.

### Tasks

| # | Task | Status | Files | Notes |
|---|------|--------|-------|-------|
| 2.1 | Extend `ShoppableIngredient` type | not started | `src/lib/types.ts` | Add: `aisle?: number`, `isManual?: boolean`, `isRecurring?: boolean`, `recurringFrequency?: 'weekly' \| 'biweekly' \| 'monthly'`, `hebPrice?: number`, `hebPriceUnit?: string`. All optional — fully backwards compatible. |
| 2.2 | Update `grocery-logic.ts` category ordering | not started | `src/lib/grocery-logic.ts` | Replace `DESIRED_ORDER` (8 categories) with the 19-category array from `heb-manor-aisle-map.ts`. Import from the data module. Need category name mapping: old "Meat" → new "Meat", old "Dairy" → "Dairy & Eggs", old "Bakery" → "Bakery & Bread", old "Spices" → "Baking & Spices", old "Pantry" → "Pantry & Condiments". Add backwards-compat mapping so existing saved data with old category names still sorts correctly. |
| 2.3 | Add intra-category aisle sort | not started | `src/lib/grocery-logic.ts` | Add `sortWithinCategories()` function. Within each category group, sort by `aisle` ascending, then alphabetical. Apply after categorization in `categorizeShoppableIngredients()`. |
| 2.4 | Update AI system prompt — category taxonomy | not started | `src/pages/api/grocery/generate.ts`, `src/pages/api/generate-grocery-list.ts` | Replace the current category instructions with the 19-category taxonomy. Include aisle→product mapping in the prompt so AI assigns `aisle` field. Update the JSON schema to include `aisle?: number`. **Critical:** Old category names in existing Firestore data must still work (handled by 2.2 mapping). |
| 2.5 | Enrich AI output with static DB prices | not started | `src/pages/api/grocery/generate.ts` | After AI generates the ingredient list, run each item through `matchProductToSuggestion()` from Phase 1. If match found, attach `hebPrice`, `hebPriceUnit`, and verified `aisle`. This enriches AI output without changing the AI prompt. |
| 2.6 | Update existing tests + add new ones | not started | `tests/integration/grocery-logic-integration.test.ts`, `src/lib/grocery-logic.test.ts` | Test: 19 categories sort in correct order. Test: old category names map to new names. Test: intra-category aisle sort works. Test: items without aisle sort alphabetically. Verify all existing grocery tests still pass. |

### Phase 2 Acceptance Criteria
- [ ] Grocery list renders in H-E-B Manor walking path order (Produce → Frozen)
- [ ] Old saved grocery lists with 8-category names still display correctly
- [ ] Items within categories are sorted by aisle, then alphabetically
- [ ] AI-generated items include aisle numbers and prices (when matched)
- [ ] All tests pass (old + new)

### Notes for Future Sessions
- The category rename is the riskiest part — existing Firestore data has old names. The mapping in 2.2 must handle this gracefully.
- The AI prompt update (2.4) will change how new grocery lists are generated but won't affect existing saved lists.
- Consider whether the `GroceryList.tsx` component needs any visual changes for the new category names — it should just work since it reads category names dynamically.

---

## Phase 3: Manual Item Addition

**Goal:** Let users add items to the grocery list that aren't from recipes.  
**Dependencies:** Phase 1 (autocomplete needs static DB), Phase 2 (needs 19-category taxonomy).  
**Impact:** New UI component + new API endpoints. First user-visible feature.

### Tasks

| # | Task | Status | Files | Notes |
|---|------|--------|-------|-------|
| 3.1 | Create `AddItemInput.tsx` component | not started | `src/components/recipe-manager/grocery/AddItemInput.tsx` | Persistent search/add bar at top of grocery list. Input with autocomplete dropdown. On submit → inline form with: name (pre-filled from suggestion), quantity + unit (optional, default "1 item"), category dropdown (19 categories, pre-filled from suggestion). Selecting a suggestion pre-fills price + category + aisle. Follow the app's existing UI patterns (Radix primitives, Tailwind, neobrutalist design). See `recipe-ui` skill for design system guidance. |
| 3.2 | Create manual item API endpoint | not started | `src/pages/api/grocery/items.ts` | POST: Add manual item to current week's `grocery_lists/{userId}_{weekStartDate}`. PATCH: Edit quantity/unit. DELETE: Remove. Manual items have `isManual: true`, `sources: []`. Follow existing API patterns in `src/pages/api/grocery/`. Needs auth middleware check. |
| 3.3 | Integrate `AddItemInput` into `GroceryList.tsx` | not started | `src/components/recipe-manager/grocery/GroceryList.tsx` | Add the search/add bar above the category sections. Wire up to the manual item API. On successful add → optimistic UI update (add to local state immediately, API call in background). Handle dedup: if item name matches existing item, prompt to merge or add separately. |
| 3.4 | Visual distinction for manual items | not started | `src/components/recipe-manager/grocery/GroceryList.tsx` | Manual items don't have source tags (no recipe attribution). Show a subtle "manual" badge or different styling. Price badge if `hebPrice` is available. |
| 3.5 | Price display on items | not started | `src/components/recipe-manager/grocery/GroceryList.tsx` | For any item with `hebPrice`, show a small price badge (e.g., "$1.49/each"). Optional: show estimated total at bottom of list (sum of all priced items × quantities). |
| 3.6 | Tests for manual item flow | not started | `src/components/recipe-manager/grocery/AddItemInput.test.tsx`, `src/pages/api/grocery/items.test.ts` | Unit test: AddItemInput renders, autocomplete filters correctly, form submission works. API test: POST creates item with correct structure, DELETE removes, PATCH updates. Integration: manual item appears in correct category position. |

### Phase 3 Acceptance Criteria
- [ ] User can type an item name and see autocomplete suggestions from static DB
- [ ] Selecting a suggestion pre-fills category, aisle, price
- [ ] User can submit to add item to grocery list
- [ ] Manual items appear in correct category/aisle position
- [ ] Manual items saved to Firestore with `isManual: true`
- [ ] Price badges display on items with price data
- [ ] API endpoints work with auth

### Notes for Future Sessions
- Design the `AddItemInput` to be reusable — it'll also serve as the search bar if we add search-within-list later.
- Optimistic UI is important — the add should feel instant even though Firestore write is async.
- The dedup logic when adding a manual item that matches an AI-generated item needs careful thought. Suggest: if same name exists, increase quantity rather than creating a duplicate.

---

## Phase 4: Recurring Items

**Goal:** Let users flag items as recurring so they auto-populate into future grocery lists.  
**Dependencies:** Phase 3 (manual item UI provides the base for recurring toggle).  
**Impact:** New Firestore collection, new API endpoints, auto-population logic.

### Tasks

| # | Task | Status | Files | Notes |
|---|------|--------|-------|-------|
| 4.1 | Create Firestore collection structure | not started | N/A (Firestore, no code file) | Collection: `recurring_grocery_items/{userId}/items/{itemId}`. Document shape: `{ name, purchaseAmount, purchaseUnit, category, aisle?, frequency, createdAt, lastAddedWeek }`. No migration needed — new collection. |
| 4.2 | Create recurring items API | not started | `src/pages/api/grocery/recurring.ts` | GET: List all recurring items for authenticated user. POST: Create a recurring item (from any grocery list item). DELETE: Remove by itemId. Follow existing API patterns, auth middleware. |
| 4.3 | Create `RecurringItemToggle.tsx` | not started | `src/components/recipe-manager/grocery/RecurringItemToggle.tsx` | Small icon button (repeat/loop icon) on each grocery list item. Tapping opens popover with frequency options: Weekly / Every 2 weeks / Monthly. On select → POST to recurring API. If item is already recurring, show as active with option to remove. |
| 4.4 | Integrate recurring toggle into `GroceryList.tsx` | not started | `src/components/recipe-manager/grocery/GroceryList.tsx` | Add `RecurringItemToggle` to each item row. Recurring items show a small repeat icon badge. Both AI-generated and manual items can be made recurring. |
| 4.5 | Auto-population logic | not started | `src/lib/grocery-utils.ts`, `src/pages/api/grocery/generate.ts` | When generating a new grocery list: (1) Fetch `recurring_grocery_items` for user, (2) Filter by frequency + `lastAddedWeek` to find items due this week, (3) Merge into ingredient list using `mergeShoppableIngredients()`, (4) Update `lastAddedWeek` for injected items. Weekly: always due. Biweekly: due if ≥14 days since `lastAddedWeek`. Monthly: due if ≥28 days. |
| 4.6 | Recurring items management UI | not started | TBD — could be a section in settings or a dedicated page | List all recurring items with ability to edit frequency or delete. Lower priority — can be a simple list initially. |
| 4.7 | Tests for recurring flow | not started | `src/lib/grocery-utils.test.ts`, `src/pages/api/grocery/recurring.test.ts` | Test: item flagged as weekly → appears in next week's list. Test: biweekly item → doesn't appear after 1 week, does appear after 2. Test: recurring item deduplicates with AI-generated same item. Test: API CRUD operations. |

### Phase 4 Acceptance Criteria
- [ ] User can tap recurring toggle on any item and set frequency
- [ ] Recurring items show visual badge in list
- [ ] Next grocery list auto-includes due recurring items
- [ ] Recurring items merge/dedup with AI-generated items correctly
- [ ] User can manage (view/delete) recurring items
- [ ] All tests pass

### Notes for Future Sessions
- The auto-population timing is important: recurring items should inject *before* the AI generates the list, so the AI can potentially merge them with recipe ingredients. Alternatively, inject *after* AI and use the existing merge logic. After is simpler and safer — start there.
- `lastAddedWeek` update must be atomic with the grocery list save to avoid double-injection if the generation fails partway.

---

## Phase 5: Polish & Integration Testing

**Goal:** End-to-end validation, edge cases, performance, and UX polish.  
**Dependencies:** Phases 1–4 complete.

### Tasks

| # | Task | Status | Files | Notes |
|---|------|--------|-------|-------|
| 5.1 | E2E test: full grocery flow | not started | `tests/grocery-enhanced.spec.ts` | Generate list → verify 19-category order → add manual item → verify sort → set recurring → generate next week → verify recurring item present. |
| 5.2 | Performance check: static DB loading | not started | N/A | Verify the static JSON doesn't bloat the client bundle. If >200KB, consider lazy-loading or server-side filtering. |
| 5.3 | Edge cases: empty list, all items checked, no recipes selected | not started | N/A | Verify the add bar works even with no AI-generated items (pure manual list). |
| 5.4 | Mobile responsiveness | not started | N/A | Test the add bar, autocomplete dropdown, and recurring popover on mobile viewports. The app is used as a PWA while shopping. |
| 5.5 | Existing test suite passes | not started | N/A | Run full `npm run check:ci` in recipes app. All existing E2E, unit, and integration tests must pass. |
| 5.6 | Update AI prompt for edge cases | not started | `src/pages/api/grocery/generate.ts` | Verify the AI correctly categorizes items across all 19 categories. Test with diverse recipes (Mexican, Asian, Italian, BBQ). Adjust prompt if categories are misassigned. |

### Phase 5 Acceptance Criteria
- [ ] Full E2E flow passes
- [ ] No performance regressions
- [ ] Mobile UX works for in-store shopping
- [ ] All existing tests pass
- [ ] AI categorization accurate across recipe types

---

## Cross-Phase Considerations

### Backwards Compatibility
- Existing `grocery_lists` Firestore documents have 8-category names. The category mapping in Phase 2 must handle these forever (or until a migration is run).
- The `ShoppableIngredient` type extensions are all optional fields — no breaking changes.
- The `sources` field is required in current type but manual items have `sources: []`. Ensure all code handles empty sources arrays.

### Static DB Refresh Strategy
- Quarterly: re-run `scripts/scrape-heb-products.ts` and commit updated JSON
- Aisle numbers change only on store remodel (rare) — the store directory image is the source of truth
- Prices are approximate — used for budgeting, not exact cost tracking

### Bundle Size
- `heb-manor-products.json` should be reasonable (<200KB). If the scrape returns thousands of products, consider trimming to most common items or lazy-loading.
- The aisle map TypeScript is tiny (<5KB).

### Design System
- All new UI components should follow the app's existing neobrutalist design system
- Use Radix UI primitives (already in the project) for popover, dropdown, etc.
- Reference the `recipe-ui` skill for design system tokens and patterns

---

## Session Log

Track work done across Claude Code sessions here.

| Date | Session | Phase | Tasks Completed | Notes |
|------|---------|-------|-----------------|-------|
| 2026-04-04 | Initial | — | Plan created | PRD updated with static DB approach. Codebase explored. `grocery-suggestions.ts` placeholder already exists with `GrocerySuggestion` interface. |
| | | | | |

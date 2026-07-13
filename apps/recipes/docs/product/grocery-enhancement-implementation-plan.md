# Grocery Enhancement Implementation Plan

## Phase 1: Data Foundation

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1.1 | Create H-E-B scrape script (`scripts/scrape-heb-items.ts`) | done | Generates ~350 items via Gemini |
| 1.2 | Create `grocery-suggestions.ts` stub with types | done | Empty array, needs population |
| 1.3 | Populate `grocery-suggestions.ts` with realistic H-E-B data | done | ~200 items across all 19 categories with prices and aisles |
| 1.4 | Create fuzzy matching utility for item-to-suggestion lookup | done | `grocery-matcher.ts` with find, search, price lookup |

## Phase 2: Category & Aisle System

| # | Task | Status | Notes |
|---|------|--------|-------|
| 2.1 | Expand `grocery-logic.ts` categories from 8 to 19 H-E-B sections | done | Backward-compatible mapping from old categories |
| 2.2 | Add aisle metadata to category display | done | `ShoppableCategory.aisleInfo` field, MapPin icon in headers |
| 2.3 | Sort categories in H-E-B walking order | done | Uses `GROCERY_CATEGORY_ORDER` from suggestions |

## Phase 3: Price Display

| # | Task | Status | Notes |
|---|------|--------|-------|
| 3.1 | Match grocery items to suggestions for price lookup | done | Uses fuzzy matching from `grocery-matcher.ts` |
| 3.2 | Show per-item price in GroceryList UI | done | `$X.XX/unit` badge next to each item |
| 3.3 | Show category subtotals and grand total | done | Category subtotals in headers, H-E-B estimate banner |

## Phase 4: Manual Item Entry

| # | Task | Status | Notes |
|---|------|--------|-------|
| 4.1 | Build `AddItemInput` component with typeahead | done | Inline in GroceryList with suggestion dropdown |
| 4.2 | Add manual items state management (localStorage) | done | Keyed by week, merged with recipe items |
| 4.3 | Integrate manual items into GroceryList display | done | Same category/aisle treatment as recipe items |
| 4.4 | Add ability to remove manual items | done | X button on manual items |

## Phase 5: Testing & Polish

| # | Task | Status | Notes |
|---|------|--------|-------|
| 5.1 | Unit tests for fuzzy matching utility | done | 27 tests covering all exports |
| 5.2 | Verify existing grocery integration tests pass | done | All 3 integration + 3 component tests pass |
| 5.3 | TypeScript type check passes | done | No new type errors |
| 5.4 | Verify E2E tests still pass | pending | Requires build + wrangler preview |

---

## Session Log

| Date | Session | Work Done |
|------|---------|-----------|
| 2026-04-04 | 1 | Created `scrape-heb-items.ts` script and `grocery-suggestions.ts` stub (tasks 1.1, 1.2) |
| 2026-07-13 | 2 | Created PRD and implementation plan. Populated H-E-B data (~200 items). Built fuzzy matcher with tests. Expanded to 19-category system. Added aisle/price display. Built manual item entry with typeahead. All phases 1-4 + 5.1-5.3 complete. |

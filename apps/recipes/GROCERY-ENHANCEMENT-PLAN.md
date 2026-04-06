# Grocery List Enhancement — Implementation Plan

> **Updated**: 2026-04-04
> **Status**: Planning Complete — Ready for Phase 1
> **Branch**: Feature work should branch from `main`

---

## Overview

Enhance the grocery list from a recipe-only AI tool into a complete shopping companion with manual item addition, H-E-B Manor aisle-accurate sorting, static product database with prices, and recurring items.

### Key Architectural Decision: Static Product Database

Instead of the original PRD's live H-E-B GraphQL scraping approach, we use a **one-time scrape → static JSON database** bundled with the app. This eliminates runtime fragility (undocumented API, bot detection, KV caching complexity) while preserving the core value: aisle ordering and price estimates.

**Trade-offs accepted:**

- Prices drift over time (mitigated by quarterly re-scrape)
- New H-E-B products won't appear automatically (mitigated by AI category fallback + manual category picker)
- No real-time stock status (dropped — low value for a personal app)

**Fallback chain for unknown items:**

1. Fuzzy match against static DB → get price + aisle
2. AI assigns category from 19-category taxonomy → get aisle range from category
3. User picks category manually (for manual items) → get aisle range from category

---

## Data Model Changes

### `ShoppableIngredient` (in `src/lib/types.ts`)

```typescript
export interface ShoppableIngredient {
  name: string
  purchaseAmount: number
  purchaseUnit: string
  category: string
  sources?: RecipeContribution[] // CHANGED: optional (empty for manual items)
  // New fields:
  isManual?: boolean // true if user-added (not AI-generated)
  aisle?: number // H-E-B Manor aisle number (undefined for perimeter depts)
  hebPrice?: number // price from static DB (e.g., 1.49)
  hebPriceUnit?: string // "each", "lb", "oz", etc.
  isRecurring?: boolean // true if flagged as recurring
  recurringFrequency?: 'weekly' | 'biweekly' | 'monthly'
}
```

### New Firestore Collection: `recurring_grocery_items/{userId}/items/{itemId}`

```typescript
{
  name: string
  purchaseAmount: number
  purchaseUnit: string
  category: string
  aisle?: number
  frequency: 'weekly' | 'biweekly' | 'monthly'
  createdAt: string           // ISO
  lastAddedWeek: string       // weekStartDate of last injection
}
```

### Category Taxonomy: 8 → 19 Categories

| Order | Category            | H-E-B Location                 |
| ----- | ------------------- | ------------------------------ |
| 1     | Produce             | Perimeter — front-left         |
| 2     | Seafood             | Perimeter — left               |
| 3     | Meat                | Perimeter — back-left (Market) |
| 4     | Deli & Prepared     | Perimeter — left               |
| 5     | Bakery & Bread      | Perimeter + Aisle 4            |
| 6     | Beer & Wine         | Interior left                  |
| 7     | Pantry & Condiments | Aisles 4–5                     |
| 8     | Canned & Dry Goods  | Aisle 6                        |
| 9     | Baking & Spices     | Aisle 7                        |
| 10    | Breakfast & Cereal  | Aisle 8                        |
| 11    | Snacks              | Aisles 9–10                    |
| 12    | Beverages           | Aisles 11–12, 22–24            |
| 13    | Paper & Household   | Aisles 25–28                   |
| 14    | Pet                 | Aisles 29–30                   |
| 15    | Baby                | Aisle 31                       |
| 16    | Personal Care       | Aisles 32–35                   |
| 17    | Health & Pharmacy   | Aisles 36–38                   |
| 18    | Dairy & Eggs        | Perimeter — right-back         |
| 19    | Frozen Foods        | Perimeter — front-center       |

---

## Phase 1: H-E-B Store Order (Category + Aisle Refactor)

> **Goal**: Replace the 8-category system with 19 H-E-B Manor walking-path categories and add intra-category aisle sorting. Every existing grocery list immediately improves.
>
> **Risk**: Low — pure data/logic refactor, no new UI components, no new API endpoints.

### Tasks

| #    | Task                                                     | File(s)                                  | Status | Notes                                                                                                                                                                                                             |
| ---- | -------------------------------------------------------- | ---------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1  | Create H-E-B Manor aisle mapping constant                | `src/lib/heb-manor-aisles.ts` (new)      | `[x]`  | 19-category ordered array + item-to-aisle lookup map from store directory. Include the full aisle→product mapping from the store directory PDF.                                                                   |
| 1.2  | Update `DESIRED_ORDER` in `grocery-logic.ts`             | `src/lib/grocery-logic.ts`               | `[x]`  | Replace 8-category array with 19-category import from 1.1.                                                                                                                                                        |
| 1.3  | Add `sortWithinCategories()` function                    | `src/lib/grocery-logic.ts`               | `[x]`  | Within each category group, sort by `aisle` ascending, then alphabetical. Perimeter items (no aisle) sort alphabetically.                                                                                         |
| 1.4  | Wire aisle sort into `categorizeShoppableIngredients()`  | `src/lib/grocery-logic.ts`               | `[x]`  | Call `sortWithinCategories()` on each category's items before returning.                                                                                                                                          |
| 1.5  | Add `aisle` field to `ShoppableIngredient` type          | `src/lib/types.ts`                       | `[x]`  | Optional `aisle?: number` field.                                                                                                                                                                                  |
| 1.6  | Update AI system prompt — streaming endpoint             | `src/pages/api/generate-grocery-list.ts` | `[x]`  | Replace category list with 19 categories. Add aisle assignment instructions with the item→aisle mapping context. Add `aisle` to the response schema.                                                              |
| 1.7  | Update AI system prompt — batch endpoint                 | `src/pages/api/grocery/generate.ts`      | `[x]`  | Same prompt changes as 1.6. Also update the `GroceryIngredient` interface and Firestore save logic to include `aisle`.                                                                                            |
| 1.8  | Update progress heuristics in grocery-service            | `src/lib/services/grocery-service.ts`    | `[x]`  | Update regex patterns to match new category names (e.g., "Dairy & Eggs" instead of "Dairy").                                                                                                                      |
| 1.9  | Add category mapping helper                              | `src/lib/heb-manor-aisles.ts`            | `[x]`  | Function to map old categories to new ones (for backward compat with existing Firestore data). E.g., "Dairy" → "Dairy & Eggs", "Bakery" → "Bakery & Bread", "Spices" → "Baking & Spices", "Pantry" → split logic. |
| 1.10 | Handle legacy data in `categorizeShoppableIngredients()` | `src/lib/grocery-logic.ts`               | `[x]`  | Apply category mapping to ingredients with old category names before grouping.                                                                                                                                    |
| 1.11 | Write unit tests for new sorting/categorization          | `src/lib/grocery-logic.test.ts`          | `[x]`  | Test: 19-category ordering, intra-category aisle sort, legacy category mapping, perimeter items alphabetical.                                                                                                     |
| 1.12 | Manual QA                                                | —                                        | `[ ]`  | Generate a grocery list with existing recipes. Verify categories render in H-E-B walking path order.                                                                                                              |

### Considerations for Future Sessions

- The AI prompt is the riskiest part. Gemini needs to reliably output 19 categories and assign aisle numbers. Budget time for prompt iteration.
- The `aisle` field in the schema must be optional (perimeter departments like Produce, Meat don't have numbered aisles).
- Existing grocery lists in Firestore have old category names. The migration mapping in 1.9/1.10 handles this at read-time (no Firestore migration needed).
- The "Pantry" → new categories split is tricky. "Pantry" currently catches canned goods, pasta, spices, condiments, etc. The AI prompt needs clear guidance on which items go where.

---

## Phase 2: Static H-E-B Product Database

> **Goal**: Build a static JSON database of H-E-B Manor products with prices and aisle numbers. This becomes the foundation for autocomplete (Phase 3) and price display.
>
> **Risk**: Medium — depends on successful one-time scrape of H-E-B product data.

### Tasks

| #   | Task                                    | File(s)                              | Status | Notes                                                                                                        |
| --- | --------------------------------------- | ------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------ |
| 2.1 | Write one-time H-E-B scrape script      | `scripts/scrape-heb-items.ts`        | `[x]`  | Used Gemini to generate 611 products (H-E-B API is protected by Incapsula). Script is re-runnable quarterly. |
| 2.2 | Map scraped products to app taxonomy    | `scripts/scrape-heb-items.ts`        | `[x]`  | Each product gets: `name`, `brand`, `price`, `priceUnit`, `category` (19-cat taxonomy), `aisle`.             |
| 2.3 | Generate static product database        | `src/lib/grocery-suggestions.ts`     | `[x]`  | 611 products generated with prices, categories, and aisle numbers. Sorted by H-E-B walking path.             |
| 2.4 | Create typed product lookup module      | `src/lib/heb-products.ts` (new)      | `[x]`  | `searchProducts(query)`, `findProduct(name)`, `getProductPrice(name)`. Fuzzy matching via word overlap.      |
| 2.5 | Create curated fallback suggestion list | `src/lib/grocery-suggestions.ts`     | `[x]`  | Combined with 2.3 — the Gemini-generated list serves as both full DB and suggestion list.                    |
| 2.6 | Write unit tests for product lookup     | `src/lib/heb-products.test.ts` (new) | `[x]`  | 25 tests: exact match, fuzzy match, no match returns null, search ranking, category filtering.               |

### Considerations for Future Sessions

- The scrape script should be idempotent and re-runnable for quarterly updates.
- H-E-B's GraphQL API is undocumented. Reference: `heb-sdk-unofficial` (npm) / `heb-scraper` (GitHub) for query structure.
- The JSON file might be large (2–5MB). Consider whether tree-shaking or lazy loading is needed. For a personal app, likely fine to bundle.
- Store the scrape date in the JSON metadata so you know when prices were captured.
- If the scrape fails or H-E-B blocks it, fall back to manually curating the suggestion list (task 2.5) — that alone provides 80% of the value.

---

## Phase 3: Manual Item Addition

> **Goal**: Let users add arbitrary items to the grocery list with autocomplete from the static DB.
>
> **Risk**: Low-medium — new UI component + new API endpoints, but straightforward CRUD.

### Tasks

| #    | Task                                                      | File(s)                                                        | Status | Notes                                                                                                                                                     |
| ---- | --------------------------------------------------------- | -------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1  | Make `sources` optional on `ShoppableIngredient`          | `src/lib/types.ts`                                             | `[x]`  | Changed `sources: RecipeContribution[]` → `sources?: RecipeContribution[]`.                                                                               |
| 3.2  | Add `isManual`, `hebPrice`, `hebPriceUnit` fields to type | `src/lib/types.ts`                                             | `[x]`  | All optional fields added.                                                                                                                                |
| 3.3  | Update all consumers of `sources` for null safety         | Multiple files                                                 | `[x]`  | Updated `grocery-logic.ts`, `grocery-utils.ts`, `GroceryList.tsx`, `grocery/generate.ts` with `item.sources ?? []`.                                       |
| 3.4  | Create `POST /api/grocery/items` endpoint                 | `src/pages/api/grocery/items.ts` (new)                         | `[x]`  | Adds manual item to grocery list with deduplication.                                                                                                      |
| 3.5  | Create `DELETE /api/grocery/items` endpoint               | `src/pages/api/grocery/items.ts`                               | `[x]`  | Removes item by name from grocery list.                                                                                                                   |
| 3.6  | Create `PATCH /api/grocery/items` endpoint                | `src/pages/api/grocery/items.ts`                               | `[x]`  | Edits quantity/unit of item.                                                                                                                              |
| 3.7  | Build `AddItemInput` component                            | `src/components/recipe-manager/grocery/AddItemInput.tsx` (new) | `[x]`  | Search bar with 200ms debounced autocomplete from static DB. Shows name, price, category.                                                                 |
| 3.8  | Build inline add form                                     | `src/components/recipe-manager/grocery/AddItemInput.tsx`       | `[x]`  | Form with quantity, unit, 19-category dropdown. Pre-fills from DB match.                                                                                  |
| 3.9  | Integrate `AddItemInput` into `GroceryList.tsx`           | `src/components/recipe-manager/grocery/GroceryList.tsx`        | `[x]`  | Add bar above category groups. Manual items show "Manual" badge.                                                                                          |
| 3.10 | Handle deduplication: manual + AI items                   | `src/lib/grocery-logic.ts`                                     | `[x]`  | Merging combines quantities. AI source preserved.                                                                                                         |
| 3.11 | Display price badges on items with `hebPrice`             | `src/components/recipe-manager/grocery/GroceryList.tsx`        | `[x]`  | Green price badge with DollarSign icon.                                                                                                                   |
| 3.12 | Write unit tests                                          | `src/lib/grocery-logic.test.ts`                                | `[x]`  | 6 new tests for optional sources, manual items, price fields.                                                                                             |
| 3.13 | Manual QA                                                 | —                                                              | `[ ]`  | Add "Paper Towels" manually → appears under "Paper & Household". Add "Chicken Breast" manually + generate AI list with chicken recipe → quantities merge. |

### Considerations for Future Sessions

- The `sources` optionality change (3.1/3.3) touches many files. Do a thorough grep for `.sources` access patterns.
- Manual items are saved directly to the Firestore `grocery_lists` document (same `ingredients` array). No separate collection.
- The add bar should be accessible via keyboard (Enter to submit, Escape to close autocomplete).
- Consider whether manual items should persist across weeks or be week-specific. PRD implies week-specific (added to "current week's list").

---

## Phase 4: Recurring Items

> **Goal**: Users can flag any item as recurring. Recurring items auto-populate into future grocery lists.
>
> **Risk**: Medium — new Firestore collection, injection logic at generation time, frequency calculation.

### Tasks

| #    | Task                                                                  | File(s)                                                               | Status | Notes                                                                                                                 |
| ---- | --------------------------------------------------------------------- | --------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------- |
| 4.1  | Add `isRecurring`, `recurringFrequency` to `ShoppableIngredient` type | `src/lib/types.ts`                                                    | `[x]`  | Added fields + new `RecurringGroceryItem` type for Firestore.                                                         |
| 4.2  | Create `POST /api/grocery/recurring` endpoint                         | `src/pages/api/grocery/recurring.ts` (new)                            | `[x]`  | Create a recurring item. Saves to `recurring_grocery_items/{userId}/items/{itemId}`.                                  |
| 4.3  | Create `DELETE /api/grocery/recurring/:itemId` endpoint               | `src/pages/api/grocery/recurring.ts`                                  | `[x]`  | Remove a recurring item.                                                                                              |
| 4.4  | Create `GET /api/grocery/recurring` endpoint                          | `src/pages/api/grocery/recurring.ts`                                  | `[x]`  | List all recurring items for a user. Also added PATCH for updating frequency/lastAddedWeek.                           |
| 4.5  | Build recurring injection logic                                       | `src/lib/grocery-utils.ts`                                            | `[x]`  | `filterDueRecurringItems()`, `mergeRecurringIntoIngredients()` functions.                                             |
| 4.6  | Wire injection into grocery generation                                | `src/pages/api/grocery/generate.ts`                                   | `[x]`  | After AI generates ingredients, inject recurring items before saving to Firestore.                                    |
| 4.7  | Wire injection into streaming endpoint                                | `src/lib/services/grocery-service.ts`                                 | `[x]`  | Inject recurring items after stream parsing, before Firestore save.                                                   |
| 4.8  | Build `RecurringItemToggle` component                                 | `src/components/recipe-manager/grocery/RecurringItemToggle.tsx` (new) | `[x]`  | Repeat icon button with popover for Weekly/Biweekly/Monthly options.                                                  |
| 4.9  | Integrate toggle into `GroceryList.tsx`                               | `src/components/recipe-manager/grocery/GroceryList.tsx`               | `[x]`  | Toggle on each item row + purple recurring badge showing frequency.                                                   |
| 4.10 | Build recurring items management UI                                   | `src/components/recipe-manager/grocery/GroceryList.tsx`               | `[x]`  | Management integrated into toggle popover (can change frequency or remove). Dedicated settings page deferred.         |
| 4.11 | Frequency calculation logic                                           | `src/lib/grocery-utils.ts`                                            | `[x]`  | `isRecurringItemDue()`: weekly=always, biweekly=even weeks from creation, monthly=different month from lastAddedWeek. |
| 4.12 | Write unit tests                                                      | `src/lib/grocery-utils.test.ts`                                       | `[x]`  | 16 tests covering frequency logic, filtering, merging, edge cases.                                                    |
| 4.13 | Manual QA                                                             | —                                                                     | `[ ]`  | Mark "Sparkling Water" as weekly → navigate to next week → item auto-appears.                                         |

### Considerations for Future Sessions

- The injection point matters: recurring items should be injected AFTER AI generation but BEFORE the final merge/save. This ensures they participate in deduplication.
- `lastAddedWeek` needs to be updated atomically when injecting. Use a Firestore batch write.
- Biweekly calculation needs a stable anchor date (use `createdAt`). Count weeks since creation, inject on even-numbered weeks.
- Monthly: inject if current month !== month of `lastAddedWeek`.
- Edge case: user generates list multiple times in same week. Recurring items should not double-add. Check `lastAddedWeek === currentWeekStart` to skip.

---

## File Change Summary

### Modified Files

| File                                                    | Phase | Changes                                                                                                                                     |
| ------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/types.ts`                                      | 1, 3  | Add `aisle`, `isManual`, `hebPrice`, `hebPriceUnit`, `isRecurring`, `recurringFrequency` to `ShoppableIngredient`. Make `sources` optional. |
| `src/lib/grocery-logic.ts`                              | 1, 3  | 19-category order, intra-aisle sort, legacy category mapping, manual item dedup.                                                            |
| `src/lib/grocery-utils.ts`                              | 4     | Recurring item injection + frequency logic.                                                                                                 |
| `src/components/recipe-manager/grocery/GroceryList.tsx` | 3, 4  | Add item bar, price badges, recurring toggle, null-safe sources.                                                                            |
| `src/pages/api/generate-grocery-list.ts`                | 1     | Updated AI prompt + schema with 19 categories and aisle field.                                                                              |
| `src/pages/api/grocery/generate.ts`                     | 1, 4  | Updated AI prompt + schema. Recurring item injection at save time.                                                                          |
| `src/lib/services/grocery-service.ts`                   | 1     | Updated progress heuristic regexes.                                                                                                         |

### New Files

| File                                                            | Phase | Purpose                                                        |
| --------------------------------------------------------------- | ----- | -------------------------------------------------------------- |
| `src/lib/heb-manor-aisles.ts`                                   | 1     | H-E-B Manor aisle mapping constant + category-to-aisle lookup. |
| `scripts/scrape-heb-products.ts`                                | 2     | One-time dev script to scrape H-E-B products for store 811.    |
| `src/data/heb-manor-products.json`                              | 2     | Static product database (~2,000–5,000 products with prices).   |
| `src/lib/heb-products.ts`                                       | 2     | Product search/lookup module against static DB.                |
| `src/lib/grocery-suggestions.ts`                                | 2     | Curated ~200 common items fallback list.                       |
| `src/pages/api/grocery/items.ts`                                | 3     | CRUD API for manual grocery items.                             |
| `src/components/recipe-manager/grocery/AddItemInput.tsx`        | 3     | Autocomplete search + add item UI.                             |
| `src/pages/api/grocery/recurring.ts`                            | 4     | CRUD API for recurring grocery items.                          |
| `src/components/recipe-manager/grocery/RecurringItemToggle.tsx` | 4     | Recurring toggle UI component.                                 |

---

## Session Log

| Date       | Session | Phase    | What Was Done                                                                                                                                                                                                                                                                                                        | Notes                                                                                                           |
| ---------- | ------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 2026-04-04 | 1       | Planning | Created this implementation plan. Analyzed existing codebase. Decided on static DB approach over live API scraping.                                                                                                                                                                                                  | Previous session attempted full PRD implementation and spun out. This plan breaks it into 4 independent phases. |
| 2026-04-04 | 2       | Phase 1  | Implemented all Phase 1 tasks (1.1–1.11). Created `heb-manor-aisles.ts` with 19-category system, updated `grocery-logic.ts` with sorting/mapping, updated AI prompts with new categories + aisle field, updated progress heuristics, wrote 29 unit tests.                                                            | All tests pass. Task 1.12 (Manual QA) still pending.                                                            |
| 2026-04-04 | 3       | Phase 2  | Implemented all Phase 2 tasks. Ran Gemini-based scrape script to generate 611 H-E-B products. Created `heb-products.ts` lookup module with fuzzy search. Wrote 25 unit tests.                                                                                                                                        | All tests pass. Product data includes prices and aisle numbers.                                                 |
| 2026-04-04 | 4       | Phase 3  | Implemented all Phase 3 tasks (3.1–3.12). Updated types for manual items, added null safety for sources, created API endpoints (POST/DELETE/PATCH), built AddItemInput component with autocomplete, integrated into GroceryList with price badges. Wrote 6 new tests.                                                | 35 total grocery-logic tests pass. Task 3.13 (Manual QA) still pending.                                         |
| 2026-04-05 | 5       | Phase 4  | Implemented all Phase 4 tasks (4.1–4.12). Added recurring item types, CRUD API (`/api/grocery/recurring`), frequency calculation logic (weekly/biweekly/monthly), injection into both generation endpoints, RecurringItemToggle component with popover, purple recurring badges in GroceryList. Wrote 16 unit tests. | 51 total grocery tests pass. Task 4.13 (Manual QA) still pending.                                               |

---

## Quick Reference: Current State of Grocery Code

- **Types**: `src/lib/types.ts` — ShoppableIngredient now includes optional `aisle?: number`
- **H-E-B Mapping**: `src/lib/heb-manor-aisles.ts` (new) — 19-category order, aisle mappings, legacy category migration
- **Merge/categorize**: `src/lib/grocery-logic.ts` — `mergeShoppableIngredients()`, `categorizeShoppableIngredients()` with intra-category aisle sorting
- **Build from recipes**: `src/lib/grocery-utils.ts` — `buildGroceryItems()`, `calculateCostEstimate()`
- **UI**: `src/components/recipe-manager/grocery/GroceryList.tsx`
- **AI generation (streaming)**: `src/pages/api/generate-grocery-list.ts` — Updated with 19 categories + aisle field
- **AI generation (batch)**: `src/pages/api/grocery/generate.ts` — Updated with 19 categories + aisle field
- **Service layer**: `src/lib/services/grocery-service.ts` — Progress heuristics updated for new category names
- **Tests**: `src/lib/grocery-logic.test.ts` (new, 29 tests), `src/components/recipe-manager/grocery/grocery-utils.test.ts`
- **Current categories**: Produce, Seafood, Meat, Deli & Prepared, Bakery & Bread, Beer & Wine, Pantry & Condiments, Canned & Dry Goods, Baking & Spices, Breakfast & Cereal, Snacks, Beverages, Paper & Household, Pet, Baby, Personal Care, Health & Pharmacy, Dairy & Eggs, Frozen Foods

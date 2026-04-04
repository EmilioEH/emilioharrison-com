# PRD: Grocery List Enhancement

> **Status:** Planning  
> **Last Updated:** 2026-04-04  
> **Store:** H-E-B Manor #811 — 13100 N FM 973, Building 1, Manor, TX 78653  
> **Store URL:** https://www.heb.com/

---

## Context

The grocery list currently only supports AI-generated items from selected recipes. Users have no way to add one-off items (household supplies, personal care, impulse buys), items don't follow the actual H-E-B Manor store layout, and there's no way to flag staples that should appear every week automatically.

This PRD defines four features to make the grocery list a complete shopping tool.

---

## Architecture Decision: Static Product Database

**Original approach (rejected):** Live scraping of H-E-B's undocumented GraphQL API at runtime with Cloudflare KV caching.

**Chosen approach:** One-time scrape → static JSON file shipped with the app.

### Why Static Wins

| Concern | Live API | Static DB |
|---------|----------|-----------|
| Runtime fragility | High — undocumented API, Incapsula bot detection | Zero — no runtime dependency |
| Code complexity | Proxy endpoint, KV caching, fallback logic | Simple array filter |
| Aisle accuracy | API doesn't return aisle numbers | Manually mapped from store directory |
| Price accuracy | Real-time but fragile | "Close enough" — quarterly re-scrape |
| Autocomplete speed | Network-dependent (~500ms) | Instant (client-side filter) |

### Handling Items Not in the Static DB

Three graceful degradation layers:

1. **Fuzzy matching** — "avocados" matches "Hass Avocados" in the static DB via word-overlap matching. Covers ~80% of cases, provides price + aisle.
2. **AI category assignment** — Gemini already assigns categories. Updated with the 19-category taxonomy, it slots unknown items into the correct store section. Provides aisle (via category→aisle mapping), no price.
3. **User-selected category** — For manual items, user picks category from dropdown. Provides aisle, no price.

**Result:** Price info degrades gracefully; aisle ordering (the higher-value feature) is always preserved.

### Static DB Details

- **File:** `src/data/heb-manor-products.json`
- **Source script:** `scripts/scrape-heb-products.ts` (dev-time only, not production code)
- **Refresh cadence:** Quarterly (prices drift slowly, aisles almost never change)
- **Per-product fields:** name, brand, price, priceUnit, category (our taxonomy), aisle, imageUrl

---

## Feature 1: Manual Item Addition

### Goal
Let users add arbitrary items to the grocery list independent of AI-generated recipe ingredients.

### User Story
> As a user, I want to type in an item and add it to my grocery list so I can include things not tied to any recipe (e.g., paper towels, sparkling water, pet food).

### Data Model Changes

Extend `ShoppableIngredient` in `src/lib/types.ts`:

```typescript
export interface ShoppableIngredient {
  name: string
  purchaseAmount: number
  purchaseUnit: string
  category: string
  sources: RecipeContribution[]
  // New fields
  isManual?: boolean        // true if user-added (not AI-generated)
  isRecurring?: boolean     // true if auto-populated (see Feature 4)
  recurringFrequency?: 'weekly' | 'biweekly' | 'monthly'
  aisle?: number            // H-E-B Manor aisle number (undefined for perimeter depts)
  hebPrice?: number         // price from static DB or scrape
  hebPriceUnit?: string     // "each", "lb", "oz", etc.
}
```

### UI Changes

- Persistent search/add bar pinned to top of `GroceryList.tsx`
- Doubles as autocomplete search (Feature 2) and manual item entry
- Submitting opens inline form: item name, quantity + unit (optional, defaults to "1 item"), category dropdown (19 H-E-B categories)
- On submit: item saved to Firestore grocery list, appears immediately

### API Changes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/grocery/items` | POST | Add a manual item to current week's list |
| `/api/grocery/items/:itemName` | DELETE | Remove a manual item |
| `/api/grocery/items/:itemName` | PATCH | Edit quantity/unit |

---

## Feature 2: Autocomplete with Static H-E-B Product Data

### Goal
As the user types an item name, show suggestions from the static product database with price and category info pre-filled.

### Suggestion Sources (priority order)

1. **User's item history** — items added manually in past weeks (from Firestore `recurring_grocery_items` + past `grocery_lists`)
2. **Static H-E-B product DB** — filtered from `src/data/heb-manor-products.json`, includes name, brand, price, aisle, category
3. **Fuzzy match on current list** — prevents duplicates by surfacing already-added items

### Autocomplete Behavior

- Client types "avoc" → debounced 200ms → filters static DB → shows matches with price + category
- No network call needed — entire DB is loaded client-side (~200-500 items, <100KB gzipped)
- Results show: product name, brand, price badge, category tag

### Data Stored on Item

When user selects an H-E-B product from suggestions:

```typescript
{
  name: "Hass Avocados",
  category: "Produce",
  aisle: undefined,  // perimeter dept
  hebPrice: 1.49,
  hebPriceUnit: "each",
  isManual: true,
  sources: []
}
```

### Static Product DB

**File:** `src/data/heb-manor-products.json`  
**Interface:** Uses `GrocerySuggestion` from `src/lib/grocery-suggestions.ts` (already exists as placeholder)

Generated by `scripts/scrape-heb-products.ts`:
- Hits H-E-B GraphQL endpoint per department for store 811
- Paginates through results
- Maps each product to our 19-category taxonomy
- Assigns aisle numbers from store directory
- Writes JSON to `src/data/`

---

## Feature 3: H-E-B Manor Store-Order Sorting (Aisle-Accurate)

### Goal
Sort the grocery list by the actual walking path through H-E-B Manor #811 — Produce → Frozen, with intra-category aisle ordering.

### H-E-B Manor #811 Layout

**Perimeter path (left → back → right):**

| Stop | Department | Notes |
|------|-----------|-------|
| 1 | Produce | Left entrance, front-left perimeter |
| 2 | Seafood | Left perimeter |
| 3 | Meat (Market) | Back-left perimeter |
| 4 | Deli | Left perimeter |
| 5 | Bakery | Left perimeter |
| 6 | Beer & Wine | Interior left, adjacent to Bakery/Deli |

**Interior aisles (left → right, 1–12):**

| Aisle | Contents |
|-------|---------|
| 1–3 | Nutritional Bars (near entrance/perimeter) |
| 4 | Bread, Tortillas, PB, Jam, Salsa, Pickles, Olives, Vinegar, Honey |
| 5 | Asian Foods, BBQ Sauce, Condiments, Ketchup, Mayo, Mustard, Salad Dressing, Rice, Dry Beans |
| 6 | Soup, Box Dinners, Potatoes/Stuffing, Gravy, Canned Beans/Veggies/Tomatoes/Chili/Fish/Meat, Pasta, Mac & Cheese |
| 7 | Flour, Sugar, Oil/Shortening, Cake Mix, Biscuit Mix, Spices, Salt, Marshmallows, Baking Nuts, Pie Filling, Jell-O, Canned/Powdered Milk |
| 8 | Cereal, Hot Cereal, Pancake Mix, Syrup, Dried Fruit, Canned Fruit, Pudding, Fruit Snacks, Pop Tarts |
| 9 | Chips, Microwaveable Food, Pimentos |
| 10 | Crackers, Cookies, Snacking Nuts, Pastries, Popcorn, Rice Cakes, Snacks |
| 11 | Sodas, Instant Breakfast |
| 12 | Water |

**Right wall aisles (22–38):**

| Aisle | Contents |
|-------|---------|
| 22 | Powdered Drink Mix, Sports Drinks, Energy Drinks, RTD Coffee/Tea |
| 23 | Coffee, Creamers, Hot Cocoa, Tea |
| 24 | Juice, Kids Drinks, Candy |
| 25 | Aluminum Foil, Bags/Wrap, Napkins, Plates/Cups, Trash Bags, Toothpicks |
| 26 | Paper Towels, Bath Tissue, Facial Tissue |
| 27 | Air Freshener, Dish Soap, Cleaners, Floor Wax, Brooms/Mops, Candles |
| 28 | Laundry Detergent, Bleach, Fabric Softener, Closet Items |
| 29 | Dog Food (dry), Dog Treats |
| 30 | Cat Food, Cat Litter, Birdseed, Pet Accessories |
| 31 | Baby Food/Formula/Wipes/Accessories/Medication |
| 32 | Hair Care, Hair Accessories, Hair Color |
| 33 | Cosmetics, Facial Care, Skin Care, Lotion |
| 34 | Deodorant, Bath Soap, Shampoo, Shaving, Men's/Women's Grooming |
| 35 | Feminine Hygiene, Foot Care, Incontinence |
| 36 | First Aid, Eye Care, Dental/Oral Care |
| 37 | Vitamins, Diet Aids, Nutritional Aids/Bars, Q-Tips |
| 38 | Cough & Cold, Laxatives |

**Perimeter (right side, end):**

| Stop | Department |
|------|-----------|
| After 38 | Dairy (right-back perimeter) |
| Last | Frozen Foods (front-center) |

### 19-Category Taxonomy (replaces current 8-category)

| # | App Category | H-E-B Aisles | Shopping Order |
|---|-------------|-------------|----------------|
| 1 | Produce | Produce dept | 1 |
| 2 | Seafood | Seafood dept | 2 |
| 3 | Meat | Market dept | 3 |
| 4 | Deli & Prepared | Deli dept | 4 |
| 5 | Bakery & Bread | Bakery dept + Aisle 4 (bread/tortillas) | 5 |
| 6 | Beer & Wine | Beer & Wine dept | 6 |
| 7 | Pantry & Condiments | Aisles 4–5 | 7 |
| 8 | Canned & Dry Goods | Aisle 6 | 8 |
| 9 | Baking & Spices | Aisle 7 | 9 |
| 10 | Breakfast & Cereal | Aisle 8 | 10 |
| 11 | Snacks | Aisles 9–10 | 11 |
| 12 | Beverages | Aisles 11–12, 22–24 | 12 |
| 13 | Paper & Household | Aisles 25–28 | 13 |
| 14 | Pet | Aisles 29–30 | 14 |
| 15 | Baby | Aisle 31 | 15 |
| 16 | Personal Care | Aisles 32–35 | 16 |
| 17 | Health & Pharmacy | Aisles 36–38 | 17 |
| 18 | Dairy & Eggs | Dairy dept (right perimeter) | 18 |
| 19 | Frozen Foods | Frozen dept (front center) | 19 |

### Intra-Category Aisle Sort

Within each category, items sort by aisle number ascending, then alphabetically:

```typescript
items.sort((a, b) => {
  if (a.aisle !== undefined && b.aisle !== undefined) {
    return a.aisle !== b.aisle ? a.aisle - b.aisle : a.name.localeCompare(b.name)
  }
  return a.name.localeCompare(b.name)
})
```

### Implementation Changes

| File | Change |
|------|--------|
| `src/lib/grocery-logic.ts` | Replace 8-category `DESIRED_ORDER` with 19-category ordered list; add `sortWithinCategories()` |
| `src/pages/api/grocery/generate.ts` | Update AI system prompt with new 19-category taxonomy + aisle mapping |
| `src/pages/api/generate-grocery-list.ts` | Same prompt update |
| `src/lib/types.ts` | Add `aisle?: number` to `ShoppableIngredient` |

---

## Feature 4: Recurring Items

### Goal
Users can flag any item as recurring so it auto-populates into every future grocery list.

### User Story
> As a user, I want to mark "sparkling water" as a weekly recurring item so it always shows up without re-adding it.

### Data Model

**Firestore:** `recurring_grocery_items/{userId}/items/{itemId}`

```typescript
{
  name: string
  purchaseAmount: number
  purchaseUnit: string
  category: string
  aisle?: number
  frequency: 'weekly' | 'biweekly' | 'monthly'
  createdAt: string        // ISO
  lastAddedWeek: string    // weekStartDate
}
```

### UI Changes

- Each grocery list item gets a recurring toggle (repeat/loop icon)
- Tapping opens popover: "Repeat this item?" with frequency options
- Recurring items show a repeat icon badge
- "Recurring Items" management section in settings/profile

### Auto-Population Logic

When generating/viewing a grocery list for a new week:
1. Fetch user's `recurring_grocery_items`
2. Filter items due for current week based on frequency + `lastAddedWeek`
3. Merge into ingredient list (same dedup logic as `mergeShoppableIngredients()`)
4. Update `lastAddedWeek` for each injected item

### API Changes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/grocery/recurring` | GET | List all recurring items |
| `/api/grocery/recurring` | POST | Create a recurring item |
| `/api/grocery/recurring/:itemId` | DELETE | Remove recurring item |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/types.ts` | Extend `ShoppableIngredient` with `isManual`, `isRecurring`, `recurringFrequency`, `aisle`, `hebPrice`, `hebPriceUnit` |
| `src/lib/grocery-logic.ts` | Replace 8-category with 19-category order; add intra-category aisle sort |
| `src/lib/grocery-utils.ts` | Add recurring item injection logic |
| `src/lib/grocery-suggestions.ts` | Update to import from static DB; add fuzzy matching |
| `src/components/recipe-manager/grocery/GroceryList.tsx` | Add search/add bar; recurring toggle per item |
| `src/pages/api/grocery/generate.ts` | Update AI prompt with 19 categories + aisle mapping |
| `src/pages/api/generate-grocery-list.ts` | Same prompt update |

## New Files to Create

| File | Purpose |
|------|---------|
| `src/data/heb-manor-products.json` | Static H-E-B product database |
| `src/data/heb-manor-aisle-map.ts` | Category→aisle mapping + aisle→product lookup |
| `scripts/scrape-heb-products.ts` | Dev-time scrape script (not production) |
| `src/pages/api/grocery/items.ts` | CRUD for manual grocery items |
| `src/pages/api/grocery/recurring.ts` | CRUD for recurring grocery items |
| `src/components/recipe-manager/grocery/AddItemInput.tsx` | Autocomplete input component |
| `src/components/recipe-manager/grocery/RecurringItemToggle.tsx` | Recurring toggle UI |

---

## Verification / Testing

| Test | Expected |
|------|----------|
| Manual add "Paper Towels" | Appears under "Paper & Household", aisle 26 |
| Autocomplete "avocado" | Static DB results with price, instant response |
| Category order | Produce first → Frozen last, 19 categories |
| Intra-category sort | PB (aisle 4) above Rice (aisle 5) in "Pantry & Condiments" |
| Recurring weekly | Mark item → next week's list auto-includes it |
| Dedup | Manual "Chicken Breast" + AI chicken recipe → merged single entry |
| Unknown item | AI assigns category → correct store section, no price shown |

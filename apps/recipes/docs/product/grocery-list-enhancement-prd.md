# Grocery List Enhancement PRD

## Problem Statement

The grocery list currently shows items grouped by 8 generic categories (Produce, Meat, Dairy, etc.) with no store-specific information. Users shopping at H-E-B Manor #811 must mentally map items to aisles and have no price visibility. There's also no way to add manual items (e.g., paper towels, dog food) that aren't tied to a recipe.

## Goals

1. **Aisle-aware shopping**: Show H-E-B Manor aisle numbers so users can shop efficiently in store order
2. **Price visibility**: Display approximate H-E-B prices for budgeting
3. **Manual item entry**: Let users add non-recipe items with typeahead suggestions from H-E-B catalog
4. **Richer categories**: Expand from 8 generic categories to 19 H-E-B-specific store sections

## Non-Goals

- Real-time price scraping (H-E-B blocks automated access)
- Barcode scanning
- Multi-store support (H-E-B Manor only for now)
- Online ordering integration

## User Stories

1. **As a shopper**, I want to see aisle numbers next to each category so I can navigate the store efficiently
2. **As a budget-conscious user**, I want to see estimated prices so I know roughly what my trip will cost
3. **As a meal planner**, I want to add items like "paper towels" or "dog food" that aren't in any recipe
4. **As a shopper**, I want typeahead suggestions when adding manual items so I can quickly find common products

## Design

### Category Expansion
- Map existing 8 categories to H-E-B's 19 store sections
- Display aisle numbers in category headers (e.g., "Pantry & Condiments — Aisles 4-5")
- Sort categories in store walking order (left entrance -> perimeter -> interior -> frozen)

### Price Display
- Show per-item H-E-B price from static suggestion data
- Match grocery list items to suggestions by fuzzy name matching
- Show estimated subtotal per category and grand total

### Manual Item Entry
- Floating "+" button at bottom of grocery list
- Typeahead dropdown filtering from ~200 H-E-B product suggestions
- Added items appear in correct category with aisle/price info
- Manual items persist in localStorage keyed by week

## Success Metrics

- Users can see aisle info for >80% of grocery items
- Price estimates within 20% of actual H-E-B receipt
- Manual items can be added in <3 taps

## Technical Approach

- Static data in `grocery-suggestions.ts` (generated via Gemini script)
- Fuzzy matching via normalized string comparison (no external deps)
- Manual items stored in localStorage keyed by week
- No new API endpoints needed -- all client-side

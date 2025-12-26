# Knowledge Item: Grocery Logic & Categorization Standards

**Summary**: Standards for merging and categorizing grocery items. Defines the preferred display order and normalization rules for ingredient deduplication.

---

## 1. Categorization Order

The UI expects grocery categories in a specific order for optimal user scanning. Refer to [grocery-logic.ts](file:///Users/emilioharrison/Desktop/emilioharrison-com/apps/recipes/src/lib/grocery-logic.ts).

### Standard Order:

Produce → Meat → Dairy → Bakery → Frozen → Pantry → Spices → Other.

## 2. Merging Logic (Deduplication)

Ingredients should be merged when both the **normalized name** and **normalized unit** match.

- **Key Formula**: `${name.toLowerCase().trim()}|${unit.toLowerCase().trim()}`
- **Aggregation**: Total amounts are summed. The category of the first item processed is generally preserved.

## 3. AI Generation Requirement

When the AI generates a grocery list, it MUST provide `StructuredIngredient` objects that include a `category` field from the standard set above to minimize "Other" items.

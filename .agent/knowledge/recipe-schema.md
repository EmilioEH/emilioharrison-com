# Knowledge Item: Recipe Data Schema

**Summary**: Definitive schema for the `Recipe` and `Ingredient` interfaces. Includes metadata for folders, difficulty, cuisine, and structured data for AI-driven grocery generation.

---

## 1. Core Recipe Interface

Any data manipulation or persistence of recipes MUST adhere to the [types.ts](file:///Users/emilioharrison/Desktop/emilioharrison-com/apps/recipes/src/lib/types.ts) definition.

### Key Fields:

- `id`: Unique identifier (string).
- `thisWeek`: Boolean. Used to filter recipes into the "This Week" folder.
- `structuredIngredients`: Array of `StructuredIngredient`. This is the **Source of Truth** for grocery list generation.
- `notes`: Optional string, shown on the recipe overview and editable with the recipe.

## 2. Ingredient vs StructuredIngredient

- **Ingredient**: A simple representation: `{ name, amount, prep? }`. Used for display in the recipe view.
- **StructuredIngredient**: A parsed representation: `{ original, name, amount, unit, category }`. Used for programmatic merging and categorization.

## 3. Data Integrity

When editing a recipe, ensure that `updatedAt` is refreshed.

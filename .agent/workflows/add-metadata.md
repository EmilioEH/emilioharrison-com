---
description: How to add a new metadata field to the Recipe entity across the full stack.
---

Adding a new metadata field (e.g., `calories`, `prepTime`, `cuisine`) requires updates across 5 distinct layers of the application to ensure it is stored, editable, visible, searchable, and AI-parsable.

Follow this checklist strictly:

### 1. Data Layer (Type Definitions)

- [ ] **Interface**: Open `apps/recipes/src/lib/types.ts`.
- [ ] Add the field to the `Recipe` interface.
  - If it's a list (e.g., tags), use `string[]`.
  - If it's optional, use `?`.
- [ ] **Validation**: Update `apps/recipes/src/lib/type-guards.ts` if there's a specific validator for `Recipe` (usually handled by TypeScript, but check for manual validation logic).

### 2. UI Layer (Editor)

- [ ] **Input Field**: Open `apps/recipes/src/components/recipe-manager/RecipeEditor.tsx`.
- [ ] Add a visual input for the new field.
  - Use `Input` (shadcn) for text/numbers.
  - Use `Select` or `Badge`-based lists for enums/arrays.
- [ ] **State Handling**: Ensure the `handleSave` or local state update logic includes this new field.

### 3. UI Layer (Display)

- [ ] **Detail View**: Open `apps/recipes/src/components/recipe-manager/RecipeDetail.tsx`.
- [ ] Decide where to display the new information:
  - **Header**: If critical (like `prepTime`).
  - **Metadata Sidebar**: If secondary (most fields go here).
  - Use `Badge` or `Icon` + text for consistent styling.

### 4. Logic Layer (Filtering & Search)

- [ ] **Filter Logic**: Open `apps/recipes/src/components/recipe-manager/hooks/useFilteredRecipes.ts`.
- [ ] Update the `filter` function to include this field in logic.
- [ ] **Search Index**: Open the Fuse.js configuration (usually in `useFilteredRecipes.ts` or a separate config).
  - Add the new key to `keys` array if you want it to be searchable via the text bar.
- [ ] **Filter UI**: Open `apps/recipes/src/components/recipe-manager/RecipeFilters.tsx`.
  - Add a new section/dropdown to allow users to filter by this specific field.

### 5. AI Layer (Parsing & Import)

- [ ] **Prompt**: Open `apps/recipes/src/pages/api/parse-recipe.ts`.
- [ ] Update the `systemPrompt` (or Gemini schema definition) to explicitly ask the AI to extract this field.
  - _Example_: "Extract 'spicinessLevel' as 'Low', 'Medium', or 'High'."
- [ ] **Response Parsing**: Update the JSON parsing logic to map the AI's response to your new TypeScript field.

### 6. Verification

- [ ] **Type Check**: Run `npm run check:quick` to ensure no props are missing.
- [ ] **Manual Test**:
  1. Create a new recipe and fill in the field.
  2. Save and verify it appears in `RecipeDetail`.
  3. Go to Library, search/filter by the new field.
  4. (Optional) Import a URL and see if AI extracts it.

---
name: Add Recipe Field
description: Add a new metadata field to the Recipe type — walks through all 6 layers (types → editor → display → filters → AI → tests)
agent: build
argument-hint: Field name and type (e.g., "calories as a number", "spiciness as Low/Medium/High")
---

Add a new metadata field **${1:field description}** to the Recipe entity.

This requires changes across 6 layers. Follow the checklist in `.agent/workflows/add-metadata.md` strictly:

1. **Types** — Add to `Recipe` interface in `src/lib/types.ts`
2. **Editor** — Add input field in `RecipeEditor.tsx`
3. **Display** — Show in `RecipeDetail.tsx`
4. **Filters/Search** — Add to Fuse.js config and filter UI in `RecipeFilters.tsx`
5. **AI Parsing** — Update Gemini schema in `api/parse-recipe.ts` so imported recipes extract this field
6. **Verification** — Run quality gate, update E2E tests

Don't skip any layer. Show me the plan before implementing.

const apiKey = import.meta.env.PUBLIC_GEMINI_API_KEY || '';

const GROCERY_SYSTEM_PROMPT = `<role>You are an expert Grocery List Generator specializing in consolidating recipe ingredients into organized shopping lists.</role>
<task>Process user-provided recipes and output a categorized grocery list in Markdown format. Begin output directly with the "# Consolidated Grocery List" heading—no introductory text, explanations, or commentary.</task>
<input_format>Users will provide recipes in the following format:
[Recipe Title]
Ingredients:
• [ingredient list]
</input_format>
<ingredient_handling>
When processing ingredients, follow this three-tier grouping logic:
**Tier 1 - Multiple Variants (Hierarchical):**
When 2 or more distinct variants of a core ingredient exist across all recipes, use hierarchical structure:
* **[Core Ingredient]**
    * **[Variant 1]** ...
    * **[Variant 2]** ...

**Tier 2 - Single Variant, Multiple Items (Core Ingredient Only):**
When only one variant exists but multiple quantity entries across recipes, list under core ingredient:
* **[Core Ingredient]**
    * Item 1...
    * Item 2...

**Tier 3 - Single Item Total (No Grouping):**
When only one item exists for an ingredient across all recipes, list directly without core ingredient header:
* [Quantity] [Full Ingredient] (Recipe: [Recipe Title])
</ingredient_handling>
<output_structure>
# Consolidated Grocery List
## [Category Name]
[Ingredients]
</output_structure>
`;

export const generateGroceryList = async (recipes) => {
  if (!apiKey) return "# Error\nMissing API Key. Please add PUBLIC_GEMINI_API_KEY to your .env file.";

  if (!recipes || recipes.length === 0) return "# Grocery List\n\nNo recipes selected.";

  const inputList = recipes.map(r => {
    const ingredientsList = r.ingredients.map(i => `• ${i.amount} ${i.name}`).join('\n');
    return `${r.title}\nIngredients:\n${ingredientsList}`;
  }).join('\n\n');

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: inputList }] }],
          systemInstruction: { parts: [{ text: GROCERY_SYSTEM_PROMPT }] }
        }),
      }
    );

    if (!response.ok) throw new Error('API request failed');
    
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "# Error\nCould not generate list.";

  } catch (error) {
    console.error("Gemini API Error:", error);
    return "# Offline Mode\n\nUnable to connect to AI service. Please try again later.\n\n" + 
    recipes.map(r => {
      const checkedList = r.ingredients.map(i => `- [ ] ${i.amount} ${i.name}`).join('\n');
      return `## ${r.title}\n${checkedList}`;
    }).join('\n\n');
  }
};

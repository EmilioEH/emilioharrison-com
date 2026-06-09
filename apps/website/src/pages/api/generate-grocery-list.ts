import OpenAI from 'openai'

export const POST = async ({ request }: { request: Request }) => {
  const apiKey = import.meta.env.OPENROUTER_API_KEY

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing API Key' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { recipes } = await request.json()

  if (!recipes || recipes.length === 0) {
    return new Response(JSON.stringify({ text: '# Grocery List\n\nNo recipes selected.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
  })

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
`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputList = recipes.map((r: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ingredientsList = r.ingredients.map((i: any) => `• ${i.amount} ${i.name}`).join('\n')
    return `${r.title}\nIngredients:\n${ingredientsList}`
  }).join('\n\n')

  try {
    const response = await client.chat.completions.create({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      messages: [
        { role: 'system', content: GROCERY_SYSTEM_PROMPT },
        { role: 'user', content: inputList },
      ],
    })

    const text = response.choices?.[0]?.message?.content || '# Error\nCould not generate list.'

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('OpenRouter API Error:', error)
    return new Response(JSON.stringify({ error: 'Failed to generate list' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

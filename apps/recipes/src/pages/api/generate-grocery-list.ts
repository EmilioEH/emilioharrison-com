import type { APIRoute } from 'astro'
import { formatRecipesForPrompt } from '../../lib/api-utils'
import { GoogleGenAI, Type as SchemaType } from '@google/genai'

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime?.env || import.meta.env
  const apiKey = env.GEMINI_API_KEY

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing API Key' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { recipes } = await request.json()

  if (!recipes || recipes.length === 0) {
    return new Response(JSON.stringify({ ingredients: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const SYSTEM_PROMPT = `
You are an expert Data Engineer specializing in culinary ingredients.
Your task is to take a list of raw ingredient strings from multiple recipes and parse them into structured data.

Input Format:
[Recipe Title]
Ingredients:
- 1 cup flour
- 2 eggs

Rules:
1. Normalize names: "clove of garlic" -> "garlic", "minced garlic" -> "garlic".
2. Normalize units: "tablespoon" -> "tbsp", "cups" -> "cup".
3. Category must be one of: Produce, Meat, Dairy, Bakery, Frozen, Pantry, Spices, Other.
4. If an ingredient appears multiple times, return them as SEPARATE items in the array.
`

  const inputList = formatRecipesForPrompt(recipes)

  const schema = {
    type: SchemaType.OBJECT,
    properties: {
      ingredients: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            original: { type: SchemaType.STRING },
            name: { type: SchemaType.STRING },
            amount: { type: SchemaType.NUMBER },
            unit: { type: SchemaType.STRING },
            category: { type: SchemaType.STRING },
          },
          required: ['original', 'name', 'amount', 'unit', 'category'],
        },
      },
    },
    required: ['ingredients'],
  }

  try {
    const client = new GoogleGenAI({ apiKey })
    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: SYSTEM_PROMPT }, { text: `Recipes to Process:\n${inputList}` }],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    })

    const resultText = response.text
    if (!resultText) throw new Error('No content generated')

    const structuredIngredients = JSON.parse(resultText)

    return new Response(JSON.stringify(structuredIngredients), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Gemini API Error:', error)
    return new Response(JSON.stringify({ error: 'Failed to generate list' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

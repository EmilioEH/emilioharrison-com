import type { APIRoute } from 'astro'
import { formatRecipesForPrompt, cleanGeminiResponse } from '../../lib/api-utils'
import { GoogleGenAI } from '@google/genai'

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

Output Format: A single JSON array of objects. NO markdown.
Schema:
[
  {
    "original": "string (the exact input line)",
    "name": "string (normalized name, e.g. 'flour', 'egg')",
    "amount": number (parsed quantity, e.g. 1, 2.5. If unknown/to-taste, use 0)",
    "unit": "string (normalized unit, e.g. 'cup', 'tbsp', 'piece', 'g'. If none, use 'unit')",
    "category": "string (Produce, Meat, Dairy, Bakery, Frozen, Pantry, Spices, Other)"
  }
]

Rules:
1. Normalize names: "clove of garlic" -> "garlic", "minced garlic" -> "garlic".
2. Normalize units: "tablespoon" -> "tbsp", "cups" -> "cup".
3. Category must be one of the predefined list.
4. If an ingredient appears multiple times, return them as SEPARATE items in the array (do not merge them yet, the client will do that).
`

  const inputList = formatRecipesForPrompt(recipes)

  try {
    const client = new GoogleGenAI({ apiKey })

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        responseMimeType: 'application/json',
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: SYSTEM_PROMPT }, { text: `Recipes to Process:\n${inputList}` }],
        },
      ],
    })

    const resultText = response.text
    if (!resultText) throw new Error('No content generated')

    const cleanedText = cleanGeminiResponse(resultText)
    const structuredIngredients = JSON.parse(cleanedText)

    return new Response(JSON.stringify({ ingredients: structuredIngredients }), {
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

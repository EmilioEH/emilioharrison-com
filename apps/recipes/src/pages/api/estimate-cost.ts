import type { APIRoute } from 'astro'
import { Type as SchemaType } from '@google/genai'
import { initGeminiClient, serverErrorResponse } from '../../lib/api-helpers'

const COST_SYSTEM_PROMPT = `
You are an expert Grocery Cost Estimator for Austin, Texas. Your task is to estimate the current grocery store cost for the provided list of ingredients in Austin, TX.

Rules:
1. Estimate the price for the specific amount requested (e.g. "1 tsp salt" is pennies, not the price of a full container).
2. If the ingredient is a pantry staple (salt, pepper, oil, spices), estimate a small fractional cost per usage.
3. For main ingredients (meat, produce, dairy), estimate based on current Austin, TX prices (HEB is the primary benchmark, followed by Central Market or Whole Foods).
4. Return a strict JSON object with:
   - 'totalCost': the sum of all item costs.
   - 'items': array of objects { name, price, estimated: true, note }.
5. Be realistic but conservative.
`

export const POST: APIRoute = async ({ request, locals }) => {
  let client
  try {
    client = initGeminiClient(locals)
  } catch {
    return serverErrorResponse('Missing API Key')
  }

  try {
    const { ingredients } = await request.json()

    if (!ingredients || !Array.isArray(ingredients)) {
      return new Response(JSON.stringify({ error: 'Invalid input' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Client initialized above

    const schema = {
      type: SchemaType.OBJECT,
      properties: {
        totalCost: { type: SchemaType.NUMBER, description: 'Total estimated cost in USD' },
        items: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              name: { type: SchemaType.STRING },
              price: {
                type: SchemaType.NUMBER,
                description: 'Estimated price for this specific amount',
              },
              estimated: { type: SchemaType.BOOLEAN },
              note: {
                type: SchemaType.STRING,
                description: "Brief explanation of calculation, e.g. '$3.00/lb avg'",
              },
            },
            required: ['name', 'price', 'estimated'],
          },
        },
      },
      required: ['totalCost', 'items'],
    }

    // Format ingredients for the prompt
    const ingredientsList = ingredients
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((i: any) => {
        if (i.original) return `- ${i.original}`
        if (i.unit) return `- ${i.amount} ${i.unit} ${i.name}`
        return `- ${i.amount} ${i.name}`
      })
      .join('\n')

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
      contents: [
        {
          role: 'user',
          parts: [
            { text: COST_SYSTEM_PROMPT },
            { text: `Estimate the cost for these ingredients:\n${ingredientsList}` },
          ],
        },
      ],
    })

    const resultText = response.text
    if (!resultText) throw new Error('No content from Gemini')

    const data = JSON.parse(resultText)

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Estimate Cost Error:', message, error)
    return new Response(JSON.stringify({ error: 'Failed to estimate cost', details: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

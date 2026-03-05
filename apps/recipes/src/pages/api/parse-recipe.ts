import type { APIRoute } from 'astro'
import { initGeminiClient, serverErrorResponse } from '../../lib/api-helpers'
import {
  createRecipeSchema,
  resolveInput,
  buildInferencePrompt,
  INGREDIENT_PARSING_RULES,
  INGREDIENT_GROUPING_RULES,
  STRUCTURED_STEPS_RULES,
  STEP_GROUPING_RULES,
  STRICT_INGREDIENT_RULES,
  STRICT_STEP_RULES,
} from '../../lib/services/ai-parser'

/**
 * Maps raw errors to user-friendly messages.
 * Internal details are logged server-side only.
 */
function getSafeErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : ''

  if (msg.includes('Base64 decoding failed') || msg.includes('inline_data.data')) {
    return 'We couldn\u2019t process that photo. Please try uploading a different image.'
  }
  if (msg.includes('BLOCKED:') || msg.includes('Failed to fetch URL')) {
    return msg // These are already user-facing messages
  }
  if (msg.includes('Rate Limit') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
    return 'Our recipe parser is busy right now. Please try again in a moment.'
  }
  if (msg.includes('Invalid image') || msg.includes('Image too large')) {
    return msg // Already user-friendly
  }
  if (msg.includes('No input provided')) {
    return msg
  }
  return 'Something went wrong while processing your recipe. Please try again.'
}

function getSystemPrompts(style: 'strict' | 'enhanced' = 'strict') {
  if (style === 'enhanced') {
    return `
${INGREDIENT_PARSING_RULES}
${INGREDIENT_GROUPING_RULES}
${STRUCTURED_STEPS_RULES}
${STEP_GROUPING_RULES}
    `
  }
  return `
${STRICT_INGREDIENT_RULES}
${STRICT_STEP_RULES}
  `
}

export const POST: APIRoute = async ({ request, locals }) => {
  let client
  try {
    client = await initGeminiClient(locals)
  } catch {
    return serverErrorResponse('Missing API Key configuration')
  }

  try {
    const body = await request.json()
    const { mode = 'parse', style = 'strict' } = body

    if (!body.url && !body.image && !body.text) {
      return new Response(JSON.stringify({ error: 'No input provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Process input and get content for AI
    const processedInput = await resolveInput(body)
    const { contentPart, sourceInfo } = processedInput
    let { prompt } = processedInput

    // Inject dynamic rules based on style
    const dynamicRules = getSystemPrompts(style)
    prompt = prompt + '\n' + dynamicRules

    if (mode === 'infer' && body.image) {
      prompt = buildInferencePrompt(body)
    }

    const parts = [{ text: prompt }, contentPart]

    const stream = await generateRecipeStream(client, parts)

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Source-Url': sourceInfo.url || '',
        'X-Source-Image': sourceInfo.image || '',
        'X-Candidate-Images': JSON.stringify(sourceInfo.candidateImages || []),
      },
    })
  } catch (error) {
    console.error('API Error:', error)
    // Never expose raw provider errors to the client
    const userMessage = getSafeErrorMessage(error)
    return serverErrorResponse(userMessage)
  }
}

async function generateRecipeStream(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parts: any[],
): Promise<ReadableStream> {
  const schema = createRecipeSchema()
  const encoder = new TextEncoder()

  const result = await client.models.generateContentStream({
    model: 'gemini-2.5-flash',
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
    contents: [{ role: 'user', parts }],
  })

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result) {
          let text = ''

          if (typeof chunk.text === 'function') {
            text = chunk.text()
          } else if (chunk.candidates?.[0]?.content?.parts?.[0]?.text) {
            text = chunk.candidates[0].content.parts[0].text
          } else if ('text' in chunk && typeof chunk.text === 'string') {
            text = chunk.text
          } else if (typeof chunk === 'string') {
            text = chunk
          }

          if (text) {
            controller.enqueue(encoder.encode(text))
          }
        }
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })
}

import type { APIRoute } from 'astro'
import { initGeminiClient, serverErrorResponse } from '../../lib/api-helpers'
import {
  createBaseRecipeSchema,
  createRecipeSchema,
  isRecipeComplete,
  tryRepairJson,
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

function extractChunkText(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chunk: any,
): string {
  if (typeof chunk.text === 'function') return chunk.text()
  if (chunk.candidates?.[0]?.content?.parts?.[0]?.text) return chunk.candidates[0].content.parts[0].text
  if ('text' in chunk && typeof chunk.text === 'string') return chunk.text
  if (typeof chunk === 'string') return chunk
  return ''
}

async function generateRecipeStream(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parts: any[],
): Promise<ReadableStream> {
  const baseSchema = createBaseRecipeSchema()
  const fullSchema = createRecipeSchema()
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        // ── Phase 1: Extract base recipe with simpler schema ──
        let phase1Text = ''
        const result1 = await client.models.generateContentStream({
          model: 'gemini-2.5-flash',
          config: {
            responseMimeType: 'application/json',
            responseSchema: baseSchema,
            maxOutputTokens: 65536,
          },
          contents: [{ role: 'user', parts }],
        })

        for await (const chunk of result1) {
          const text = extractChunkText(chunk)
          if (text) phase1Text += text
        }

        // Parse Phase 1 result
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let merged: Record<string, any> | null = null
        try {
          const parsed = tryRepairJson(phase1Text)
          if (parsed && typeof parsed === 'object') {
            merged = parsed as Record<string, unknown>
          }
        } catch {
          // Phase 1 failed entirely — fall through to Phase 2
        }

        // ── Phase 2: Enhance with full schema if incomplete ──
        if (!merged || !isRecipeComplete(merged)) {
          const contextPrompt = merged
            ? `I have a partial recipe extracted from an image. Create a complete enhanced version filling in all missing details and adding structured data.\n\nPartial recipe:\n${JSON.stringify(merged, null, 2)}\n\nUse the original image below to fill in any gaps.`
            : `Parse this recipe completely with all structured fields. Refer to the image below.`

          const result2 = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            config: {
              responseMimeType: 'application/json',
              responseSchema: fullSchema,
              maxOutputTokens: 65536,
            },
            contents: [
              {
                role: 'user',
                parts: [
                  { text: contextPrompt },
                  ...parts.slice(1),
                ],
              },
            ],
          })

          const text = result2.text
          if (text) {
            try {
              const enhanced = tryRepairJson(text)
              if (enhanced && typeof enhanced === 'object') {
                merged = {
                  ...(merged || {}),
                  ...(enhanced as Record<string, unknown>),
                }
              }
            } catch {
              // Phase 2 failed — keep Phase 1 result
            }
          }
        }

        if (!merged) {
          controller.error(new Error('Failed to parse recipe from image'))
          return
        }

        controller.enqueue(encoder.encode(JSON.stringify(merged)))
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })
}

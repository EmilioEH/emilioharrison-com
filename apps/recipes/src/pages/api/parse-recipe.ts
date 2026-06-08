import type { APIRoute } from 'astro'
import { initGeminiClient, serverErrorResponse } from '../../lib/api-helpers'
import {
  createPhase1Schema,
  createPhase2Schema,
  createPhase3Schema,
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

/**
 * Runs a single Gemini phase: streams the response, buffers it, and returns the parsed JSON.
 * Uses generateContentStream for all phases so we get content as soon as it's ready.
 */
async function runPhase(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any,
  prompt: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  imageParts: any[],
): Promise<Record<string, unknown> | null> {
  try {
    const result = await client.models.generateContentStream({
      model: 'gemini-2.5-flash',
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        maxOutputTokens: 65536,
      },
      contents: [{ role: 'user', parts: [{ text: prompt }, ...imageParts] }],
    })

    let buffer = ''
    for await (const chunk of result) {
      let text = ''
      if (typeof chunk.text === 'function') text = chunk.text()
      else if (chunk.candidates?.[0]?.content?.parts?.[0]?.text) text = chunk.candidates[0].content.parts[0].text
      else if ('text' in chunk && typeof chunk.text === 'string') text = chunk.text
      else if (typeof chunk === 'string') text = chunk
      if (text) buffer += text
    }

    const parsed = tryRepairJson(buffer)
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
    return null
  } catch {
    return null
  }
}

async function generateRecipeStream(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parts: any[],
): Promise<ReadableStream> {
  const encoder = new TextEncoder()
  const imageParts = parts.slice(1)

  return new ReadableStream({
    async start(controller) {
      try {
        // ── Phase 1: OCR ingredients (raw text) ──
        const phase1 = await runPhase(
          client,
          createPhase1Schema(),
          'Extract ALL ingredient lines from this image. Return each ingredient as a separate string in the array. Include amounts, units, and preparation notes. Do not combine or skip any ingredients.',
          imageParts,
        )

        if (!phase1) {
          controller.error(new Error('Failed to parse recipe from image'))
          return
        }

        controller.enqueue(encoder.encode(JSON.stringify({ _p: 1, ...phase1 }) + '\n'))

        // ── Phase 2: OCR instructions (raw text) ──
        const phase2 = await runPhase(
          client,
          createPhase2Schema(),
          'Extract ALL cooking instruction paragraphs from this image. Return each paragraph as a separate string in the steps array. Do NOT combine paragraphs. Do NOT skip any text. Each paragraph is one step.',
          imageParts,
        )

        if (phase2) {
          controller.enqueue(encoder.encode(JSON.stringify({ _p: 2, ...phase2 }) + '\n'))
        }

        // ── Phase 3: Structure everything from OCR'd text + image ──
        const ingredientList = Array.isArray(phase1.ingredients) ? phase1.ingredients.join('\n') : ''
        const stepList = phase2 && Array.isArray(phase2.steps) ? phase2.steps.join('\n') : ''

        const phase3 = await runPhase(
          client,
          createPhase3Schema(),
          `Structure this recipe. Use the OCR'd text below as the source of truth — do not re-read the image for ingredients or instructions.\n\nOCR'd ingredients:\n${ingredientList}\n\nOCR'd instructions:\n${stepList}\n\nProduce:\n- title, description, servings, prepTime, cookTime\n- ingredients (parsed into name/amount/prep objects)\n- structuredIngredients (with normalized amounts/units/categories)\n- structuredSteps (with text and highlightedText)\n- metadata: dietary, cuisine, difficulty, protein, mealType, dishType, equipment, occasion`,
          imageParts,
        )

        if (phase3) {
          controller.enqueue(encoder.encode(JSON.stringify({ _p: 3, ...phase3 }) + '\n'))
        }

        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })
}

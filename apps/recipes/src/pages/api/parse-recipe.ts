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

/**
 * Ingredient names helper for context prompts.
 */
function ingredientNames(phase1: Record<string, unknown> | null): string {
  if (!phase1) return ''
  const ings = phase1.ingredients
  if (!Array.isArray(ings)) return ''
  return ings.map((i: Record<string, unknown>) => i.name || '').filter(Boolean).join(', ')
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
        // ── Phase 1: Title + Ingredients ──
        const phase1 = await runPhase(
          client,
          createPhase1Schema(),
          'Extract the recipe title, description, servings, prep time, cook time, and ALL ingredients with amounts from this image. Include EVERY ingredient visible.',
          imageParts,
        )

        if (!phase1) {
          controller.error(new Error('Failed to parse recipe from image'))
          return
        }

        controller.enqueue(encoder.encode(JSON.stringify({ _p: 1, ...phase1 }) + '\n'))

        // ── Phase 2: Instructions ──
        const names = ingredientNames(phase1)
        const phase2 = await runPhase(
          client,
          createPhase2Schema(),
          `Extract ALL cooking instructions from this image, step by step.\n\nThe recipe title is: ${phase1.title || 'Unknown'}\nIts ingredients are: ${names || 'Unknown'}\n\nFor each step, include BOTH a plain-text entry in "steps" AND a detailed entry in "structuredSteps" with full text, highlighted text, and optional substeps. Extract every single step — do not combine, skip, or truncate any step. List each step as a separate array element. Be thorough and detailed for each instruction.\n\nAlso map each step to the ingredient indices it uses (stepIngredients) and group steps into logical sections if applicable (stepGroups).`,
          imageParts,
        )

        if (phase2) {
          controller.enqueue(encoder.encode(JSON.stringify({ _p: 2, ...phase2 }) + '\n'))
        }

        // ── Phase 3: Metadata ──
        const phase3 = await runPhase(
          client,
          createPhase3Schema(),
          `Extract all remaining metadata for this recipe.\n\nTitle: ${phase1.title || 'Unknown'}\nIngredients: ${names || 'Unknown'}\n\nInclude: structured ingredient data (normalized amounts/units/categories), ingredient groupings, dietary info, cuisine, difficulty, equipment, occasion, protein type, meal type, dish type, and any other metadata visible in the image.`,
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

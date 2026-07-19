import type { APIRoute } from 'astro'
import OpenAI from 'openai'
import { createOpenRouterClient, serverErrorResponse } from '../../lib/api-helpers'
import { tryRepairJson, resolveInput, getSystemPrompts } from '../../lib/services/ai-parser'

const MODEL = 'qwen/qwen3.5-9b'

/**
 * Maps raw errors to user-friendly messages.
 */
function getSafeErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : ''

  if (msg.includes('Base64 decoding failed') || msg.includes('inline_data.data')) {
    return 'We couldn\u2019t process that photo. Please try uploading a different image.'
  }
  if (msg.includes('BLOCKED:') || msg.includes('Failed to fetch URL')) {
    return msg
  }
  if (msg.includes('Rate Limit') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
    return 'Our recipe parser is busy right now. Please try again in a moment.'
  }
  if (msg.includes('Invalid image') || msg.includes('Image too large')) {
    return msg
  }
  if (msg.includes('No input provided')) {
    return msg
  }
  return 'Something went wrong while processing your recipe. Please try again.'
}

export const POST: APIRoute = async ({ request, locals }) => {
  let client
  try {
    client = createOpenRouterClient(locals)
  } catch {
    return serverErrorResponse('Missing API Key configuration')
  }

  try {
    const body = await request.json()

    if (!body.url && !body.image && !body.text) {
      return new Response(JSON.stringify({ error: 'No input provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const processedInput = await resolveInput(body)
    const { contentPart, sourceInfo, prompt } = processedInput

    const stream = await generateRecipeStream(client, contentPart, prompt, body.style)

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
    const userMessage = getSafeErrorMessage(error)
    return serverErrorResponse(userMessage)
  }
}

/**
 * Converts a Gemini-style contentPart to an OpenAI message content array.
 */
export function buildMessageContent(
  prompt: string,
  contentPart: Record<string, unknown> | undefined,
): Array<Record<string, unknown>> {
  const content: Array<Record<string, unknown>> = [{ type: 'text', text: prompt }]

  if (!contentPart) return content

  if ('inlineData' in contentPart && contentPart.inlineData) {
    const { mimeType, data } = contentPart.inlineData as { mimeType: string; data: string }
    content.push({
      type: 'image_url',
      image_url: { url: `data:${mimeType};base64,${data}` },
    })
  } else if ('text' in contentPart && contentPart.text) {
    // CRITICAL: for URL/JSON-LD/pasted-text sources, this IS the recipe content (page HTML,
    // JSON-LD, or pasted text). Omitting it previously meant the model saw only the
    // instructions and fabricated a recipe from nothing.
    content.push({ type: 'text', text: contentPart.text as string })
  }

  return content
}

/**
 * Runs a single phase: calls OpenRouter, streams the response, buffers it, returns parsed JSON.
 */
async function runPhase(
  client: OpenAI,
  systemPrompt: string,
  userPrompt: string,
  contentPart: Record<string, unknown> | undefined,
  model: string = MODEL,
): Promise<Record<string, unknown> | null> {
  try {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    messages.push({
      role: 'user',
      content: buildMessageContent(
        userPrompt,
        contentPart,
      ) as unknown as OpenAI.Chat.ChatCompletionContentPart[],
    })

    const result = await client.chat.completions.create({
      model,
      messages,
      response_format: { type: 'json_object' },
      max_tokens: 65536,
      stream: true,
    })

    let buffer = ''
    for await (const chunk of result) {
      const delta = chunk.choices?.[0]?.delta?.content
      if (delta) buffer += delta
    }

    const parsed = tryRepairJson(buffer)
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
    return null
  } catch {
    return null
  }
}

/** True only for the photo-scan flow, where contentPart carries inline image bytes. */
function isImageContent(contentPart: Record<string, unknown> | undefined): boolean {
  return !!contentPart && typeof contentPart === 'object' && !!contentPart.inlineData
}

export async function generateRecipeStream(
  client: OpenAI,
  contentPart: Record<string, unknown> | undefined,
  prompt: string,
  style: 'strict' | 'enhanced' = 'strict',
): Promise<ReadableStream> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        if (!isImageContent(contentPart)) {
          // ── URL / JSON-LD / pasted-text sources: the content is already textual, so no
          // OCR passes are needed — send it straight to the model with the source-specific
          // system prompt resolveInput() already selected (URL_SYSTEM_PROMPT /
          // JSON_LD_SYSTEM_PROMPT / TEXT_SYSTEM_PROMPT), same as the Gemini enhance/refresh
          // path. buildMessageContent() attaches the actual text via `contentPart`. ──
          const finalPrompt = `${prompt}\n${getSystemPrompts(style)}`
          const result = await runPhase(
            client,
            'You are an expert Chef and Data Engineer. Follow the instructions in the user message exactly and return a strict JSON object.',
            finalPrompt,
            contentPart,
            MODEL,
          )

          if (!result) {
            controller.error(new Error('Failed to parse recipe from content'))
            return
          }

          controller.enqueue(encoder.encode(JSON.stringify({ _p: 3, ...result }) + '\n'))
          controller.close()
          return
        }

        // ── Photo-scan flow: three phases so the vision model transcribes the image in full
        // before a text-only pass structures it (more reliable than asking one call to OCR
        // and structure simultaneously). ──

        // ── Phase 1: OCR ingredients (raw text, vision model) ──
        const phase1 = await runPhase(
          client,
          '',
          `Extract ALL ingredient lines from this image. Return JSON with an "ingredients" array where each element is one ingredient line as a string. Include amounts and units. Do not combine or skip any ingredients.`,
          contentPart,
          MODEL,
        )

        if (!phase1) {
          controller.error(new Error('Failed to parse recipe from image'))
          return
        }

        controller.enqueue(encoder.encode(JSON.stringify({ _p: 1, ...phase1 }) + '\n'))

        // ── Phase 2: OCR instructions (raw text, vision model) ──
        const phase2 = await runPhase(
          client,
          '',
          `Extract ALL cooking instruction paragraphs from this image. Return JSON with a "steps" array where each element is one complete paragraph as a string. Do NOT combine paragraphs. Do NOT skip any text.`,
          contentPart,
          MODEL,
        )

        if (phase2) {
          controller.enqueue(encoder.encode(JSON.stringify({ _p: 2, ...phase2 }) + '\n'))
        }

        // ── Phase 3: Structure everything from OCR'd text (text-only model) ──
        const ingredientList = Array.isArray(phase1.ingredients)
          ? phase1.ingredients.join('\n')
          : ''
        const stepList = phase2 && Array.isArray(phase2.steps) ? phase2.steps.join('\n') : ''

        const phase3 = await runPhase(
          client,
          'You are a recipe parser. Structure the OCR text into a complete recipe JSON object.',
          `Structure this recipe from the OCR'd text below. Do not re-read the image.\n\nOCR'd ingredients:\n${ingredientList}\n\nOCR'd instructions:\n${stepList}\n\nReturn JSON with:\n- title (string)\n- description (string, optional)\n- servings (number)\n- prepTime (number, minutes)\n- cookTime (number, minutes)\n- ingredients (array of {name, amount, prep?})\n- structuredIngredients (array of {original, name, amount (number), unit, category})\n- structuredSteps (array of {text, highlightedText, tip?})\n- dietary (array of strings)\n- cuisine (string)\n- difficulty (string)\n- protein (string)\n- mealType (string)\n- dishType (string)\n- equipment (array of strings)\n- occasion (array of strings)`,
          undefined,
          MODEL,
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

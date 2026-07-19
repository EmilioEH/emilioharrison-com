import type { APIRoute, APIContext } from 'astro'
import OpenAI from 'openai'
import { createOpenRouterClient, serverErrorResponse, getAuthUser } from '../../lib/api-helpers'
import { tryRepairJson, resolveInput, getSystemPrompts } from '../../lib/services/ai-parser'
import { createTimeoutSignal } from '../../lib/services/ai-timeout'
import { rateLimit } from '../../lib/rate-limit'

const MODEL = 'qwen/qwen3.5-9b'

// OCR passes just transcribe an ingredient/step list (plain string arrays) — far cheaper than
// the full structured-recipe output, which needs enough headroom for enhanced-mode fields
// (structuredSteps/ingredientGroups/etc). The previous 65536-token ceiling on every phase (OCR
// included) meant a hung/slow provider response could run far longer than the content needed.
const OCR_MAX_TOKENS = 8192
const STRUCTURE_MAX_TOKENS = 16384
// A dense, multi-column recipe card can legitimately take the vision model well over a minute
// to read in full — the field report that motivated this had one such photo failing at both a
// 30s and a 45s budget (its pre-guardrails import ran ~5 minutes end-to-end). These phases run
// in-request with the client holding the connection — the ~30s `ctx.waitUntil` cap that
// constrains the background jobs does NOT apply here — so err generous: a slow success beats a
// fast, repeated failure. OCR phases 1+2 run in parallel, so OCR contributes one budget's worth
// of wall time, not two.
const OCR_TIMEOUT_MS = 100_000
const STRUCTURE_TIMEOUT_MS = 60_000

const PARSE_RATE_LIMIT = 20
const PARSE_RATE_WINDOW_SECONDS = 60 * 60

/**
 * Maps raw errors to user-friendly messages.
 */
function getSafeErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : ''

  if (msg.includes('Base64 decoding failed') || msg.includes('inline_data.data')) {
    return 'We couldn’t process that photo. Please try uploading a different image.'
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
  if (msg.includes('Failed to parse recipe from image')) {
    return "We couldn't read this photo — it may need better lighting, or the AI is taking too long on a dense recipe card. Please try again."
  }
  return 'Something went wrong while processing your recipe. Please try again.'
}

export const POST: APIRoute = async (context: APIContext) => {
  const { request, locals, cookies } = context

  const userId = getAuthUser(cookies)
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const kv = locals?.runtime?.env?.SESSION
  const { limited } = await rateLimit(
    kv,
    `parse:${userId}`,
    PARSE_RATE_LIMIT,
    PARSE_RATE_WINDOW_SECONDS,
  )
  if (limited) {
    return new Response(JSON.stringify({ error: 'Too many imports. Please try again later.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }

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
    const responseHeaders = {
      'Content-Type': 'application/json',
      'X-Source-Url': sourceInfo.url || '',
      'X-Source-Image': sourceInfo.image || '',
      'X-Candidate-Images': JSON.stringify(sourceInfo.candidateImages || []),
    }

    if (isImageContent(contentPart)) {
      // Run the OCR phases here, before opening the response stream, rather than inside it.
      // Erroring a ReadableStream-backed Response before anything has ever been enqueued can
      // reach the client as an ambiguous *empty-but-successful* response instead of a clear
      // error (no bytes were ever sent to distinguish "errored immediately" from "closed with
      // nothing to say") — that ambiguity was surfacing as a generic, misleading "couldn't
      // process this image" message on photos where OCR itself was the thing that failed.
      // Once phase 1 has succeeded, the returned stream always has something to enqueue before
      // it can possibly error, so this ambiguity doesn't apply to phase 3 failing downstream.
      const phases = await runImageOcrPhases(client, contentPart, request.signal)
      if (!phases) {
        return new Response(
          JSON.stringify({
            error: getSafeErrorMessage(new Error('Failed to parse recipe from image')),
          }),
          { status: 422, headers: { 'Content-Type': 'application/json' } },
        )
      }

      const stream = buildImageRecipeStream(client, phases.phase1, phases.phase2, request.signal)
      return new Response(stream, { status: 200, headers: responseHeaders })
    }

    const stream = buildTextRecipeStream(client, contentPart, prompt, body.style, request.signal)
    return new Response(stream, { status: 200, headers: responseHeaders })
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
 * Bounded by `timeoutMs` (combined with `externalSignal`, e.g. the incoming request being
 * cancelled) so a hung upstream call can't block the request/stream forever, and can't keep
 * running at full cost after the client has given up.
 */
async function runPhase(
  client: OpenAI,
  systemPrompt: string,
  userPrompt: string,
  contentPart: Record<string, unknown> | undefined,
  model: string = MODEL,
  maxTokens: number = OCR_MAX_TOKENS,
  timeoutMs: number = OCR_TIMEOUT_MS,
  externalSignal?: AbortSignal,
): Promise<Record<string, unknown> | null> {
  const { signal, cleanup } = createTimeoutSignal(timeoutMs, externalSignal)
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

    const result = await client.chat.completions.create(
      {
        model,
        messages,
        response_format: { type: 'json_object' },
        max_tokens: maxTokens,
        stream: true,
      },
      { signal },
    )

    let buffer = ''
    for await (const chunk of result) {
      const delta = chunk.choices?.[0]?.delta?.content
      if (delta) buffer += delta
    }

    const parsed = tryRepairJson(buffer)
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
    return null
  } catch (err) {
    console.error('[ParseRecipe] Phase failed:', err instanceof Error ? err.message : err)
    return null
  } finally {
    cleanup()
  }
}

/** True only for the photo-scan flow, where contentPart carries inline image bytes. */
function isImageContent(contentPart: Record<string, unknown> | undefined): boolean {
  return !!contentPart && typeof contentPart === 'object' && !!contentPart.inlineData
}

/**
 * Runs the two independent OCR passes (ingredients, instructions) against the photo — they read
 * the same image and don't depend on each other, so running them concurrently roughly halves
 * the wall time of the slowest part of this flow. Returns `null` only when ingredient OCR
 * (phase 1) fails outright; the caller returns a normal error response in that case rather than
 * ever opening a response stream with nothing to enqueue (see the POST handler for why that
 * matters). Instruction OCR (phase 2) failing is not fatal here — the caller still has usable
 * ingredients to structure.
 */
export async function runImageOcrPhases(
  client: OpenAI,
  contentPart: Record<string, unknown> | undefined,
  externalSignal?: AbortSignal,
): Promise<{
  phase1: Record<string, unknown>
  phase2: Record<string, unknown> | null
} | null> {
  const [phase1, phase2] = await Promise.all([
    runPhase(
      client,
      '',
      `Extract ALL ingredient lines from this image. Return JSON with an "ingredients" array where each element is one ingredient line as a string. Include amounts and units. Do not combine or skip any ingredients.`,
      contentPart,
      MODEL,
      OCR_MAX_TOKENS,
      OCR_TIMEOUT_MS,
      externalSignal,
    ),
    runPhase(
      client,
      '',
      `Extract ALL cooking instruction paragraphs from this image. Return JSON with a "steps" array where each element is one complete paragraph as a string. Do NOT combine paragraphs. Do NOT skip any text.`,
      contentPart,
      MODEL,
      OCR_MAX_TOKENS,
      OCR_TIMEOUT_MS,
      externalSignal,
    ),
  ])

  if (!phase1) return null
  return { phase1, phase2 }
}

/**
 * Builds the streamed response for the photo-scan flow once OCR (phase 1 required, phase 2
 * optional) has already succeeded — see `runImageOcrPhases`. Streams the OCR chunks immediately
 * (`_p: 1`/`_p: 2`), then runs the text-only structuring pass (phase 3) and streams that
 * (`_p: 3`) or errors the stream if it fails. Because phase 1 is guaranteed present before this
 * stream is ever constructed, the response body is never empty when a later error can occur.
 */
export function buildImageRecipeStream(
  client: OpenAI,
  phase1: Record<string, unknown>,
  phase2: Record<string, unknown> | null,
  externalSignal?: AbortSignal,
): ReadableStream {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(JSON.stringify({ _p: 1, ...phase1 }) + '\n'))

        // Instructions OCR failing doesn't block the pipeline (ingredients alone are still
        // useful), but silently continuing meant a recipe could be saved with no instructions
        // and no signal that anything was wrong. Flag it on the final phase so the client can
        // tell the user explicitly instead.
        const instructionsFailed = !phase2

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
          STRUCTURE_MAX_TOKENS,
          STRUCTURE_TIMEOUT_MS,
          externalSignal,
        )

        if (!phase3) {
          // Without structuring, there's no title/servings/times/groups — just raw OCR text.
          // Previously this closed the stream with no error, and the client's stream-error
          // handler would silently "salvage" the phase1/phase2 fragments into what looked like
          // a complete recipe (see recipe-corruption postmortem). Fail loudly instead. Unlike
          // phase 1 failing, phase 1(+2) have already been enqueued above, so this error is
          // unambiguous to the client — it already has real content, then a clear failure.
          controller.error(
            new Error(
              'Failed to structure the recipe from this photo. Please try again with a clearer image.',
            ),
          )
          return
        }

        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              _p: 3,
              ...phase3,
              ...(instructionsFailed ? { partialFailure: 'instructions' } : {}),
            }) + '\n',
          ),
        )

        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })
}

/**
 * Builds the streamed response for URL / JSON-LD / pasted-text sources — the content is already
 * textual, so no OCR passes are needed. Sends it straight to the model with the source-specific
 * system prompt `resolveInput()` already selected (URL_SYSTEM_PROMPT / JSON_LD_SYSTEM_PROMPT /
 * TEXT_SYSTEM_PROMPT), same as the Gemini enhance/refresh path. `buildMessageContent()` attaches
 * the actual text via `contentPart`.
 */
export function buildTextRecipeStream(
  client: OpenAI,
  contentPart: Record<string, unknown> | undefined,
  prompt: string,
  style: 'strict' | 'enhanced' = 'strict',
  externalSignal?: AbortSignal,
): ReadableStream {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        const finalPrompt = `${prompt}\n${getSystemPrompts(style)}`
        const result = await runPhase(
          client,
          'You are an expert Chef and Data Engineer. Follow the instructions in the user message exactly and return a strict JSON object.',
          finalPrompt,
          contentPart,
          MODEL,
          STRUCTURE_MAX_TOKENS,
          STRUCTURE_TIMEOUT_MS,
          externalSignal,
        )

        if (!result) {
          controller.error(new Error('Failed to parse recipe from content'))
          return
        }

        controller.enqueue(encoder.encode(JSON.stringify({ _p: 3, ...result }) + '\n'))
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })
}

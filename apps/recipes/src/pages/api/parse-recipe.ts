import type { APIRoute, APIContext } from 'astro'
import OpenAI from 'openai'
import { createOpenRouterClient, serverErrorResponse, getAuthUser } from '../../lib/api-helpers'
import {
  tryRepairJson,
  resolveInput,
  getSystemPrompts,
  TITLE_RULE,
  DESCRIPTION_VS_STEPS_RULE,
  FAITHFUL_TRANSCRIPTION_RULES,
} from '../../lib/services/ai-parser'
import { createTimeoutSignal } from '../../lib/services/ai-timeout'
import { withTransientRetry } from '../../lib/services/ai-retry'
import {
  normalizeIngredients,
  normalizeSteps,
  extractPlausibleTitle,
} from '../../lib/services/recipe-result-validation'
import { rateLimit } from '../../lib/rate-limit'
import { logAiError } from '../../lib/services/ai-error-log'

// Swapped from qwen/qwen3.5-9b: the 9B tier was taking minutes to OCR dense, multi-column
// recipe cards (the motivating field report ran ~5 min pre-guardrails and kept hitting the
// raised timeouts). The flash tier is image-capable, latency-optimized, cheaper on input
// (which dominates for image prompts), and per OpenRouter's models API supports the same
// text+image inputs. Still one model for all phases — see CLAUDE.md's AI Integration note.
const MODEL = 'qwen/qwen3.5-flash-02-23'

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

  let body: { url?: string; image?: string; text?: string; style?: 'strict' | 'enhanced' }
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // For error-log labeling in the catch below: photo-scan vs URL/pasted-text import.
  const importFeature = body.image ? 'photo-import' : 'url-import'

  try {
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
        logAiError('photo-import', new Error('Ingredient OCR (phase 1) produced no result'), {
          userId,
          context: { model: MODEL, timeoutMs: String(OCR_TIMEOUT_MS) },
        })
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
    logAiError(importFeature, error, { userId })
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
 * Runs one OpenRouter attempt: streams the response, buffers it, returns parsed JSON. Bounded by
 * `timeoutMs` (combined with `externalSignal`, e.g. the incoming request being cancelled) so a
 * hung upstream call can't block the request/stream forever. Broken out from `runPhase` so a
 * retry gets its own fresh timeout signal rather than sharing one across attempts.
 */
async function runPhaseAttempt(
  client: OpenAI,
  systemPrompt: string,
  userPrompt: string,
  contentPart: Record<string, unknown> | undefined,
  model: string,
  maxTokens: number,
  timeoutMs: number,
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
  } finally {
    cleanup()
  }
}

/**
 * Runs a single phase, retrying once on a transient transport failure (see ai-retry.ts) — these
 * phases all run in-request while the client holds the connection, so unlike the `waitUntil`-bound
 * background jobs there's no hard ceiling that a retry could blow through. A non-transient failure
 * (or the retry also failing) still resolves to `null`, same as before this phase had any retry —
 * callers already treat `null` as "this phase didn't produce anything usable".
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
  try {
    return await withTransientRetry(
      () =>
        runPhaseAttempt(
          client,
          systemPrompt,
          userPrompt,
          contentPart,
          model,
          maxTokens,
          timeoutMs,
          externalSignal,
        ),
      timeoutMs,
      'ParseRecipe',
    )
  } catch (err) {
    console.error('[ParseRecipe] Phase failed:', err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * Instruction-OCR prompt.
 *
 * Beyond transcribing steps it also *separates* the headnote — the intro prose a cookbook page
 * opens with ("Buzhenina is a simple roasted pork tenderloin ... usually served cold"). Returning
 * it as a step is how that text ended up in a user's Instructions box; simply dropping it would
 * be worse, because phase 3 has no other source for `description` and would invent one. So it's
 * captured under its own key and handed to phase 3 explicitly.
 *
 * The reading-order note is deliberately layout-agnostic rather than "left column then right":
 * that phrasing was written against one two-column cookbook photo, and single-column cards,
 * three-column layouts and right-to-left scans all exist.
 */
const INSTRUCTION_OCR_PROMPT = `Extract the cooking instructions from this image.

Read the whole page in natural reading order. If the text is laid out in columns, finish each column before moving to the next — a recipe's method often starts in one column and continues in another, and stopping early loses half of it.

Separate two different kinds of text:
- "steps": ONLY actual cooking instructions, in cooking order, one complete paragraph per element. Do NOT combine paragraphs and do NOT skip any instruction.
- "headnote": the introductory/descriptive prose about the dish (its origin, how it is served, shopping advice), if the page has any. This is NOT a cooking step.

Ignore the ingredient list; it is transcribed separately.

Return JSON: { "steps": string[], "headnote": string }. Use an empty string for "headnote" if there is none.`

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
  const runInstructionOcr = () =>
    runPhase(
      client,
      '',
      INSTRUCTION_OCR_PROMPT,
      contentPart,
      MODEL,
      OCR_MAX_TOKENS,
      OCR_TIMEOUT_MS,
      externalSignal,
    )

  const [phase1, firstPhase2] = await Promise.all([
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
    runInstructionOcr(),
  ])

  if (!phase1) return null

  // Instruction OCR gets a second chance. It previously ran exactly once, and a single miss left
  // the user with an empty Instructions box plus a "couldn't read the instructions" warning —
  // reported on a cookbook page whose instructions are provably legible (a vision model reads all
  // nine paragraphs off it reliably). The failure is the model being inconsistent, not the photo
  // being unreadable, which is the same pattern already handled in grocery-core and
  // enhancement-core. Only retried when it produced nothing usable, so a normal import still
  // costs a single call.
  let phase2 = firstPhase2
  if (!hasOcrSteps(phase2)) {
    console.warn('[ParseRecipe] Instruction OCR produced no steps — retrying once')
    phase2 = (await runInstructionOcr()) ?? phase2
  }

  return { phase1, phase2 }
}

/** Whether an instruction-OCR result actually carries transcribed steps. */
function hasOcrSteps(phase: Record<string, unknown> | null): boolean {
  const steps = phase?.steps
  return Array.isArray(steps) && steps.some((s) => typeof s === 'string' && s.trim().length > 0)
}

/**
 * Builds the streamed response for the photo-scan flow once OCR (phase 1 required, phase 2
 * optional) has already succeeded — see `runImageOcrPhases`. Streams the OCR chunks immediately
 * (`_p: 1`/`_p: 2`), then runs the text-only structuring pass (phase 3) and streams that
 * (`_p: 3`) or errors the stream if it fails. Because phase 1 is guaranteed present before this
 * stream is ever constructed, the response body is never empty when a later error can occur.
 *
 * The phase-3 payload is normalized before it goes out (see `normalizeIngredients` /
 * `normalizeSteps`) so the client's last-write-wins merge can't leave the editor holding raw OCR
 * strings where it expects `{name, amount}` objects, or OCR prose where it expects steps.
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
        // The headnote is transcribed separately (see INSTRUCTION_OCR_PROMPT) so it can't be
        // mistaken for a step — but it's still the best source for `description`, so hand it over
        // explicitly rather than letting the model invent one.
        const headnote = phase2 && typeof phase2.headnote === 'string' ? phase2.headnote.trim() : ''

        const phase3 = await runPhase(
          client,
          'You are a recipe parser. Structure the OCR text into a complete recipe JSON object.',
          `Structure this recipe from the OCR'd text below. Do not re-read the image.\n\nOCR'd ingredients:\n${ingredientList}\n\nOCR'd instructions:\n${stepList}\n\n${headnote ? `The source page's introductory blurb (use this as the basis for "description", NOT as a cooking step):\n${headnote}\n\n` : ''}${DESCRIPTION_VS_STEPS_RULE}\n${TITLE_RULE}\n${FAITHFUL_TRANSCRIPTION_RULES}\n\nReturn JSON with:\n- title (string)\n- description (string, optional)\n- servings (number)\n- prepTime (number, minutes)\n- cookTime (number, minutes)\n- ingredients (array of {name, amount, prep?}) — REQUIRED, one entry per ingredient line, never plain strings\n- structuredIngredients (array of {original, name, amount (number), unit, category})\n- steps (array of strings, one cooking step per element, transcribed as printed)\n- dietary (array of strings)\n- cuisine (string)\n- difficulty (string)\n- protein (string)\n- mealType (string)\n- dishType (string)\n- equipment (array of strings)\n- occasion (array of strings)`,
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

        // The client merges phases last-write-wins, so this final payload must carry shapes the
        // editor can actually render — it can't rely on the model having returned every field.
        // This is a FRESH import, so there is no existing title to fall back to on an implausible
        // one (unlike Refresh/Enhancement's mergeAiRecipeUpdate) — extractPlausibleTitle tries to
        // salvage a clean dish name from a self-narrating title before giving up.
        const normalizedIngredients = normalizeIngredients(phase3.ingredients, phase1.ingredients)
        const normalizedSteps = normalizeSteps(
          phase3.structuredSteps,
          phase3.steps,
          phase2?.steps,
          phase3.description,
        )
        const normalizedTitle = extractPlausibleTitle(phase3.title)

        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              _p: 3,
              ...phase3,
              ...(normalizedIngredients ? { ingredients: normalizedIngredients } : {}),
              ...(normalizedSteps ? { steps: normalizedSteps } : {}),
              title: normalizedTitle ?? 'Untitled Recipe',
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

        // Previously this path (URL, JSON-LD, Reddit, pasted text — four of the five import
        // sources) applied none of the validation the photo path has: a malformed
        // ingredients/steps shape or a self-narrating title would have gone straight to the
        // client and then straight into the saved recipe. Same guarantees, single source: no
        // OCR fallback exists on this path, so the ingredient/step normalizers are called with
        // only the AI result itself, same as they'd behave if the photo path's fallback were
        // also empty.
        const normalizedIngredients = normalizeIngredients(result.ingredients)
        const normalizedSteps = normalizeSteps(
          result.structuredSteps,
          result.steps,
          undefined,
          result.description,
        )
        const normalizedTitle = extractPlausibleTitle(result.title)

        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              _p: 3,
              ...result,
              ...(normalizedIngredients ? { ingredients: normalizedIngredients } : {}),
              ...(normalizedSteps ? { steps: normalizedSteps } : {}),
              title: normalizedTitle ?? 'Untitled Recipe',
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

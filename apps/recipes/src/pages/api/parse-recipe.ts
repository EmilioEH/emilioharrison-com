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

// How often phase 3 reports that it is still producing output, and roughly how much output a
// structured recipe runs to. The second number only shapes the curve of a progress bar — being
// wrong makes it move faster or slower, never wrong about whether work is happening.
const PROGRESS_INTERVAL_MS = 400
const EXPECTED_STRUCTURE_CHARS = 4000

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
  onDelta?: (charactersSoFar: number) => void,
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
        // Disable the model's dynamic reasoning. This is the OpenRouter equivalent of the
        // `thinkingConfig: { thinkingBudget: 0 }` the Gemini calls already set, and it was
        // missing here — the reason photo imports were slow and intermittently failing.
        //
        // Measured on the same dense recipe page (26 ingredients), 2026-08-01:
        //   OCR       177.5s / 47.4s / 49.2s  ->  25.4s / 28.4s / 27.5s
        //   Structure  18.5s / 54.9s / 67.3s  ->  12.5s / 12.9s / 13.7s
        // The 177.5s OCR run exceeded OCR_TIMEOUT_MS and the 67.3s structuring run exceeded
        // STRUCTURE_TIMEOUT_MS, so both would have failed the import outright. Every response
        // was valid JSON with finish_reason "stop" — the failures were always the clock, never
        // truncation or malformed output.
        //
        // This is a LATENCY fix, not an accuracy fix. An initial reading suggested reasoning-off
        // also transcribed more faithfully; a wider sweep across library photos did not support
        // that, and it is not claimed here. Both settings misread small vulgar fractions on a
        // 768x1024 page scan (¼ read as ¾, ½ as ¾) — see the resolution note in
        // BULK-PHOTO-IMPORT-PLAN.md, which is a separate and probably more valuable fix.
        //
        // Not in the OpenAI SDK's types — it's an OpenRouter extension, passed through verbatim.
        reasoning: { enabled: false },
      } as OpenAI.Chat.ChatCompletionCreateParamsStreaming & {
        reasoning: { enabled: boolean }
      },
      { signal },
    )

    let buffer = ''
    for await (const chunk of result) {
      const delta = chunk.choices?.[0]?.delta?.content
      if (delta) {
        buffer += delta
        onDelta?.(buffer.length)
      }
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
  onDelta?: (charactersSoFar: number) => void,
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
          onDelta,
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
const PAGE_OCR_PROMPT = `Transcribe this recipe image.

Read the whole page in natural reading order. If the text is laid out in columns, finish each column before moving to the next — a recipe's method often starts in one column and continues in another, and stopping early loses half of it.

Separate three different kinds of text:
- "ingredients": every ingredient line, one per element, exactly as printed. Include amounts and units. Do not combine or skip any.
- "steps": ONLY actual cooking instructions, in cooking order, one complete paragraph per element. Do NOT combine paragraphs and do NOT skip any instruction.
- "headnote": the introductory/descriptive prose about the dish (its origin, how it is served, shopping advice), if the page has any. This is NOT a cooking step.

Transcribe what is printed. Do not reword, summarise, or add anything the page does not say.

Return JSON: { "ingredients": string[], "steps": string[], "headnote": string }. Use an empty string for "headnote" if there is none.`

/** True only for the photo-scan flow, where contentPart carries inline image bytes. */
function isImageContent(contentPart: Record<string, unknown> | undefined): boolean {
  return !!contentPart && typeof contentPart === 'object' && !!contentPart.inlineData
}

/**
 * Transcribes the photo in a SINGLE model call, returning ingredients, steps and the headnote
 * together.
 *
 * This used to be two calls that each sent the same image — one asking for ingredients, one for
 * instructions. Image input dominates the cost of a vision request, so every photo import was
 * billed for that image twice. One call reads the page once and returns all three, which roughly
 * halves the cost and removes a whole request's worth of latency.
 *
 * The return shape is unchanged (`phase1` carrying ingredients, `phase2` carrying steps and
 * headnote) so the streaming contract the client merges on — `_p: 1` then `_p: 2` — still holds.
 * Returns `null` only when the transcription produced no ingredients at all; the caller turns that
 * into a normal error response rather than opening a stream with nothing to enqueue.
 */
export async function runImageOcrPhases(
  client: OpenAI,
  contentPart: Record<string, unknown> | undefined,
  externalSignal?: AbortSignal,
): Promise<{
  phase1: Record<string, unknown>
  phase2: Record<string, unknown> | null
} | null> {
  const readPage = () =>
    runPhase(
      client,
      '',
      PAGE_OCR_PROMPT,
      contentPart,
      MODEL,
      OCR_MAX_TOKENS,
      OCR_TIMEOUT_MS,
      externalSignal,
    )

  let page = await readPage()

  // Retried only when the page produced no steps — the model being inconsistent rather than the
  // photo being unreadable, which is the same pattern handled in grocery-core and
  // enhancement-core. A normal import still costs a single call.
  if (!hasOcrSteps(page)) {
    console.warn('[ParseRecipe] Page transcription produced no steps — retrying once')
    page = (await readPage()) ?? page
  }

  const ingredients = Array.isArray(page?.ingredients) ? page.ingredients : []
  if (!page || ingredients.length === 0) return null

  // Split back into the two phase payloads the response stream and client already expect.
  const phase1: Record<string, unknown> = { ingredients }
  const phase2: Record<string, unknown> | null = hasOcrSteps(page)
    ? { steps: page.steps, headnote: typeof page.headnote === 'string' ? page.headnote : '' }
    : null

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
        // The headnote is transcribed under its own key (see PAGE_OCR_PROMPT) so it can not be
        // mistaken for a step — but it's still the best source for `description`, so hand it over
        // explicitly rather than letting the model invent one.
        const headnote = phase2 && typeof phase2.headnote === 'string' ? phase2.headnote.trim() : ''

        // Phase 3 is the long one — up to a 60s budget — and it used to emit nothing until it
        // finished, so the client's bar sat frozen at 66% for about a minute with no way to tell
        // a working import from a hung one. The call already streams, so the growing response is
        // turned into real progress markers here.
        //
        // `_t` carries a 0..1 fraction rather than a percentage, so the client owns the wording.
        // It must never be merged onto the recipe — see mergeNdjsonLine in importer/api.ts.
        let lastEmit = 0
        const emitStructuringProgress = (charactersSoFar: number) => {
          const now = Date.now()
          if (now - lastEmit < PROGRESS_INTERVAL_MS) return
          lastEmit = now
          // There is no content-length to divide by, so approach 1 asymptotically: honest about
          // "still working", never claims to be finished, and never goes backwards.
          const fraction = 1 - Math.exp(-charactersSoFar / EXPECTED_STRUCTURE_CHARS)
          try {
            controller.enqueue(
              encoder.encode(JSON.stringify({ _t: Math.round(fraction * 100) / 100 }) + '\n'),
            )
          } catch {
            // The client has gone away; the abort signal will stop the upstream call shortly.
          }
        }

        const phase3 = await runPhase(
          client,
          'You are a recipe parser. Structure the OCR text into a complete recipe JSON object.',
          `Structure this recipe from the OCR'd text below. Do not re-read the image.\n\nOCR'd ingredients:\n${ingredientList}\n\nOCR'd instructions:\n${stepList}\n\n${headnote ? `The source page's introductory blurb (use this as the basis for "description", NOT as a cooking step):\n${headnote}\n\n` : ''}${DESCRIPTION_VS_STEPS_RULE}\n${TITLE_RULE}\n${FAITHFUL_TRANSCRIPTION_RULES}\n\nReturn JSON with:\n- title (string)\n- description (string, optional)\n- servings (number)\n- prepTime (number, minutes)\n- cookTime (number, minutes)\n- ingredients (array of {name, amount, prep?}) — REQUIRED, one entry per ingredient line, never plain strings\n- structuredIngredients (array of {original, name, amount (number), unit, category})\n- steps (array of strings, one cooking step per element, transcribed as printed)\n- dietary (array of strings)\n- cuisine (string)\n- difficulty (string)\n- protein (string)\n- mealType (string)\n- dishType (string)\n- equipment (array of strings)\n- occasion (array of strings)`,
          undefined,
          MODEL,
          STRUCTURE_MAX_TOKENS,
          STRUCTURE_TIMEOUT_MS,
          externalSignal,
          emitStructuringProgress,
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

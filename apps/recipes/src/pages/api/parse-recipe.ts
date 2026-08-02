import type { APIRoute, APIContext } from 'astro'
import type OpenAI from 'openai'
import { createOpenRouterClient, serverErrorResponse, getAuthUser } from '../../lib/api-helpers'
import { resolveInput } from '../../lib/services/ai-parser'
import {
  MODEL,
  OCR_TIMEOUT_MS,
  OCR_FAILED_MESSAGE,
  STRUCTURE_FAILED_MESSAGE,
  photoFromContentPart,
  transcribePhotos,
  structureRecipeFromOcr,
  structureRecipeFromText,
  type OcrPhases,
} from '../../lib/services/parse-photo-core'
import { rateLimit } from '../../lib/rate-limit'
import { logAiError } from '../../lib/services/ai-error-log'

// This route is the Cloudflare/NDJSON wrapper only. Every model call, prompt and validation step
// lives in lib/services/parse-photo-core.ts, which is free of Cloudflare/Astro imports so the
// self-hosted VM worker can run the same pipeline for bulk photo import — the same arrangement
// grocery-core.ts already has. Keep it that way: two independent photo parsers is the exact
// problem IMPORT-PIPELINE-V2-PLAN.md was written to end.

// How often the structuring phase reports that it is still producing output, and roughly how much
// output a structured recipe runs to. The second number only shapes the curve of a progress bar —
// being wrong makes it move faster or slower, never wrong about whether work is happening.
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
  if (msg.includes(OCR_FAILED_MESSAGE)) {
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

    const photo = photoFromContentPart(contentPart)
    if (photo) {
      // Run the transcription here, before opening the response stream, rather than inside it.
      // Erroring a ReadableStream-backed Response before anything has ever been enqueued can
      // reach the client as an ambiguous *empty-but-successful* response instead of a clear
      // error (no bytes were ever sent to distinguish "errored immediately" from "closed with
      // nothing to say") — that ambiguity was surfacing as a generic, misleading "couldn't
      // process this image" message on photos where OCR itself was the thing that failed.
      // Once the transcription has succeeded, the returned stream always has something to
      // enqueue before it can possibly error, so this ambiguity doesn't apply to the structuring
      // phase failing downstream.
      const phases = await transcribePhotos(client, [photo], { externalSignal: request.signal })
      if (!phases) {
        logAiError('photo-import', new Error('Ingredient OCR (phase 1) produced no result'), {
          userId,
          context: { model: MODEL, timeoutMs: String(OCR_TIMEOUT_MS) },
        })
        return new Response(
          JSON.stringify({ error: getSafeErrorMessage(new Error(OCR_FAILED_MESSAGE)) }),
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
 * Builds the streamed response for the photo-scan flow once transcription has already succeeded —
 * see `transcribePhotos`. Streams the OCR chunks immediately (`_p: 1`/`_p: 2`), then runs the
 * text-only structuring pass and streams that (`_p: 3`) or errors the stream if it fails. Because
 * phase 1 is guaranteed present before this stream is ever constructed, the response body is never
 * empty when a later error can occur.
 */
export function buildImageRecipeStream(
  client: OpenAI,
  phase1: Record<string, unknown>,
  phase2: Record<string, unknown> | null,
  externalSignal?: AbortSignal,
): ReadableStream {
  const encoder = new TextEncoder()
  const phases: OcrPhases = { phase1, phase2 }

  return new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(JSON.stringify({ _p: 1, ...phase1 }) + '\n'))

        if (phase2) {
          controller.enqueue(encoder.encode(JSON.stringify({ _p: 2, ...phase2 }) + '\n'))
        }

        // The structuring pass is the long one — up to a 60s budget — and it used to emit nothing
        // until it finished, so the client's bar sat frozen at 66% for about a minute with no way
        // to tell a working import from a hung one. The call already streams, so the growing
        // response is turned into real progress markers here.
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

        const structured = await structureRecipeFromOcr(client, phases, {
          externalSignal,
          onProgress: emitStructuringProgress,
        })

        if (!structured) {
          // Previously this closed the stream with no error, and the client's stream-error
          // handler would silently "salvage" the phase1/phase2 fragments into what looked like
          // a complete recipe (see recipe-corruption postmortem). Fail loudly instead. Unlike
          // transcription failing, phase 1(+2) have already been enqueued above, so this error is
          // unambiguous to the client — it already has real content, then a clear failure.
          controller.error(new Error(STRUCTURE_FAILED_MESSAGE))
          return
        }

        controller.enqueue(encoder.encode(JSON.stringify({ _p: 3, ...structured }) + '\n'))
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })
}

/**
 * Builds the streamed response for URL / JSON-LD / pasted-text sources — a single structuring
 * call, no transcription. One phase in, one `_p: 3` line out.
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
        const structured = await structureRecipeFromText(
          client,
          contentPart,
          prompt,
          style,
          externalSignal,
        )

        if (!structured) {
          controller.error(new Error('Failed to parse recipe from content'))
          return
        }

        controller.enqueue(encoder.encode(JSON.stringify({ _p: 3, ...structured }) + '\n'))
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })
}

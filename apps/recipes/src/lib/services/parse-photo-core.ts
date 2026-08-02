import type OpenAI from 'openai'
import {
  tryRepairJson,
  getSystemPrompts,
  TITLE_RULE,
  DESCRIPTION_VS_STEPS_RULE,
  FAITHFUL_TRANSCRIPTION_RULES,
} from './ai-parser'
import { createTimeoutSignal } from './ai-timeout'
import { withTransientRetry } from './ai-retry'
import {
  normalizeIngredients,
  normalizeSteps,
  extractPlausibleTitle,
} from './recipe-result-validation'

// Provider-agnostic core of photo (and URL/text) recipe parsing — the OpenRouter counterpart of
// grocery-core.ts. It takes an already-built OpenAI-compatible client, runs the model calls, and
// *returns* plain objects. It knows nothing about NDJSON, ReadableStream, Astro or Cloudflare:
// api/parse-recipe.ts wraps it in the streaming response the browser importer expects, and the
// self-hosted VM worker will call `parsePhotosToRecipe` directly (see BULK-PHOTO-IMPORT-PLAN.md).
//
// NOTE: this module must stay free of Cloudflare/Astro/Vite-only imports (no `locals`, no
// `import.meta.env`, no `api-helpers`/`firebase-server`) so it runs unchanged in plain Node —
// same rule as ai-parser.ts, grocery-core.ts and recipe-result-validation.ts.

// Swapped from qwen/qwen3.5-9b: the 9B tier was taking minutes to OCR dense, multi-column
// recipe cards (the motivating field report ran ~5 min pre-guardrails and kept hitting the
// raised timeouts). The flash tier is image-capable, latency-optimized, cheaper on input
// (which dominates for image prompts), and per OpenRouter's models API supports the same
// text+image inputs. Still one model for all phases — see CLAUDE.md's AI Integration note.
export const MODEL = 'qwen/qwen3.5-flash-02-23'

// OCR passes just transcribe an ingredient/step list (plain string arrays) — far cheaper than
// the full structured-recipe output, which needs enough headroom for enhanced-mode fields
// (structuredSteps/ingredientGroups/etc). The previous 65536-token ceiling on every phase (OCR
// included) meant a hung/slow provider response could run far longer than the content needed.
const OCR_MAX_TOKENS = 8192
const STRUCTURE_MAX_TOKENS = 16384

// A dense, multi-column recipe card can legitimately take the vision model well over a minute
// to read in full — the field report that motivated this had one such photo failing at both a
// 30s and a 45s budget (its pre-guardrails import ran ~5 minutes end-to-end). On the Cloudflare
// path these phases run in-request with the client holding the connection — the ~30s
// `ctx.waitUntil` cap that constrains the background jobs does NOT apply here — so err generous:
// a slow success beats a fast, repeated failure.
export const OCR_TIMEOUT_MS = 100_000
export const STRUCTURE_TIMEOUT_MS = 60_000

/** Transcription produced nothing usable — no ingredients at all. */
export const OCR_FAILED_MESSAGE = 'Failed to parse recipe from image'
/** Transcription worked but the structuring pass didn't, so all we hold is raw OCR text. */
export const STRUCTURE_FAILED_MESSAGE =
  'Failed to structure the recipe from this photo. Please try again with a clearer image.'

/** One photo, as inline bytes. The browser path already holds base64; the VM worker gets it from
 * a Firebase Storage `download()`. */
export interface PhotoSource {
  mimeType: string
  /** Base64, with no `data:` prefix. */
  data: string
}

/**
 * The transcription, split into the two payloads the NDJSON streaming contract expects
 * (`_p: 1` = ingredients, `_p: 2` = steps + headnote). One model call per photo produces all
 * three; the split is a wire-format detail, not two separate reads.
 */
export interface OcrPhases {
  phase1: Record<string, unknown>
  phase2: Record<string, unknown> | null
}

/**
 * The structuring pass's output: the model's recipe fields after normalization. Deliberately not
 * typed as `Recipe` — there is no id/createdBy/timestamps yet, and every field is only whatever
 * the model returned. Callers persist it as the body of a new recipe.
 */
export type ParsedRecipeFields = Record<string, unknown>

/** Which stage of the pipeline gave up, for callers that need to report or retry selectively. */
export class PhotoParseError extends Error {
  stage: 'transcribe' | 'structure'

  constructor(message: string, stage: 'transcribe' | 'structure') {
    super(message)
    this.name = 'PhotoParseError'
    this.stage = stage
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

/** The photo bytes carried by a `resolveInput` contentPart, or null for URL/text sources. */
export function photoFromContentPart(
  contentPart: Record<string, unknown> | undefined,
): PhotoSource | null {
  const inlineData = contentPart?.inlineData as { mimeType?: string; data?: string } | undefined
  if (!inlineData?.data) return null
  return { mimeType: inlineData.mimeType ?? 'image/jpeg', data: inlineData.data }
}

function contentPartFor(photo: PhotoSource): Record<string, unknown> {
  return { inlineData: { mimeType: photo.mimeType, data: photo.data } }
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
 * Runs a single phase, retrying once on a transient transport failure (see ai-retry.ts) — on the
 * Cloudflare path these phases all run in-request while the client holds the connection, so unlike
 * the `waitUntil`-bound background jobs there's no hard ceiling that a retry could blow through. A
 * non-transient failure (or the retry also failing) still resolves to `null` — callers already
 * treat `null` as "this phase didn't produce anything usable".
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
 * Page-transcription prompt.
 *
 * Beyond transcribing steps it also *separates* the headnote — the intro prose a cookbook page
 * opens with ("Buzhenina is a simple roasted pork tenderloin ... usually served cold"). Returning
 * it as a step is how that text ended up in a user's Instructions box; simply dropping it would
 * be worse, because the structuring pass has no other source for `description` and would invent
 * one. So it's captured under its own key and handed over explicitly.
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

/**
 * The prompt for one page of a group. A single photo gets the prompt above verbatim (so the
 * long-standing single-photo path is unchanged); a manually-grouped spread gets an extra
 * paragraph, because without it the model treats page 2 as a whole recipe — inventing the
 * ingredient list it can't see and re-narrating the method it can.
 */
function pageOcrPrompt(pageIndex: number, pageCount: number): string {
  if (pageCount < 2) return PAGE_OCR_PROMPT

  return `${PAGE_OCR_PROMPT}

This image is page ${pageIndex + 1} of ${pageCount} of ONE recipe that continues across several pages. Transcribe only what is printed on this page. Do not invent, complete or repeat anything from the other pages — if this page has no ingredient list, or no cooking steps, return an empty array for that key. The pages are combined afterwards.`
}

/** Whether a transcription actually carries transcribed steps. */
function hasOcrSteps(page: Record<string, unknown> | null): boolean {
  const steps = page?.steps
  return Array.isArray(steps) && steps.some((s) => typeof s === 'string' && s.trim().length > 0)
}

/** Concatenates per-page transcriptions in page order. Null (failed) pages are skipped; the
 * headnote is taken from the first page that printed one, since a spread has only one. */
function mergePages(pages: Array<Record<string, unknown> | null>): Record<string, unknown> | null {
  const read = pages.filter((p): p is Record<string, unknown> => p !== null)
  if (read.length === 0) return null

  const ingredients: unknown[] = []
  const steps: unknown[] = []
  let headnote = ''

  for (const page of read) {
    if (Array.isArray(page.ingredients)) ingredients.push(...page.ingredients)
    if (Array.isArray(page.steps)) steps.push(...page.steps)
    if (!headnote && typeof page.headnote === 'string' && page.headnote.trim()) {
      headnote = page.headnote
    }
  }

  return { ingredients, steps, headnote }
}

/**
 * Transcribes one photo — or several photos that are pages of the SAME recipe — into the two
 * phase payloads. One model call per page, returning ingredients, steps and the headnote
 * together.
 *
 * This used to be two calls per photo that each sent the same image — one asking for ingredients,
 * one for instructions. Image input dominates the cost of a vision request, so every photo import
 * was billed for that image twice. One call reads the page once and returns all three, which
 * roughly halves the cost and removes a whole request's worth of latency.
 *
 * Pages are read one at a time rather than in parallel: a group is at most a spread or two, and
 * the worker's concurrency cap is meant to bound how many model calls a batch has in flight, which
 * a fan-out inside a single job would quietly break.
 *
 * Returns `null` only when the transcription produced no ingredients at all; callers turn that
 * into a normal error rather than opening a stream with nothing to enqueue.
 */
export async function transcribePhotos(
  client: OpenAI,
  photos: PhotoSource[],
  opts: { externalSignal?: AbortSignal } = {},
): Promise<OcrPhases | null> {
  if (photos.length === 0) return null

  const readAllPages = async () => {
    const pages: Array<Record<string, unknown> | null> = []
    for (const [index, photo] of photos.entries()) {
      pages.push(
        await runPhase(
          client,
          '',
          pageOcrPrompt(index, photos.length),
          contentPartFor(photo),
          MODEL,
          OCR_MAX_TOKENS,
          OCR_TIMEOUT_MS,
          opts.externalSignal,
        ),
      )
    }
    return mergePages(pages)
  }

  let page = await readAllPages()

  // Retried only when the read produced no steps — the model being inconsistent rather than the
  // photo being unreadable, which is the same pattern handled in grocery-core. A normal import
  // still costs a single call per page.
  if (!hasOcrSteps(page)) {
    console.warn('[ParseRecipe] Page transcription produced no steps — retrying once')
    page = (await readAllPages()) ?? page
  }

  const ingredients = Array.isArray(page?.ingredients) ? page.ingredients : []
  if (!page || ingredients.length === 0) return null

  // Split into the two phase payloads the response stream and client already expect.
  const phase1: Record<string, unknown> = { ingredients }
  const phase2: Record<string, unknown> | null = hasOcrSteps(page)
    ? { steps: page.steps, headnote: typeof page.headnote === 'string' ? page.headnote : '' }
    : null

  return { phase1, phase2 }
}

const STRUCTURE_SYSTEM_PROMPT =
  'You are a recipe parser. Structure the OCR text into a complete recipe JSON object.'

function buildStructurePrompt(ingredientList: string, stepList: string, headnote: string): string {
  return `Structure this recipe from the OCR'd text below. Do not re-read the image.\n\nOCR'd ingredients:\n${ingredientList}\n\nOCR'd instructions:\n${stepList}\n\n${headnote ? `The source page's introductory blurb (use this as the basis for "description", NOT as a cooking step):\n${headnote}\n\n` : ''}${DESCRIPTION_VS_STEPS_RULE}\n${TITLE_RULE}\n${FAITHFUL_TRANSCRIPTION_RULES}\n\nReturn JSON with:\n- title (string)\n- description (string, optional)\n- servings (number)\n- prepTime (number, minutes)\n- cookTime (number, minutes)\n- ingredients (array of {name, amount, prep?}) — REQUIRED, one entry per ingredient line, never plain strings\n- structuredIngredients (array of {original, name, amount (number), unit, category})\n- steps (array of strings, one cooking step per element, transcribed as printed)\n- dietary (array of strings)\n- cuisine (string)\n- difficulty (string)\n- protein (string)\n- mealType (string)\n- dishType (string)\n- equipment (array of strings)\n- occasion (array of strings)`
}

/**
 * The text-only structuring pass over an already-transcribed page: turns the OCR'd strings into a
 * recipe object (title, servings, times, grouped fields).
 *
 * The result is normalized before it is returned (see `normalizeIngredients`/`normalizeSteps`) so
 * no caller can end up holding raw OCR strings where it expects `{name, amount}` objects, or OCR
 * prose where it expects steps. `onProgress` reports the response length as it streams — the
 * Cloudflare route turns that into progress markers, the worker ignores it.
 *
 * Returns `null` when the model produced nothing usable. Without structuring there's no
 * title/servings/times/groups — just raw OCR text — which must never be presented as a recipe:
 * that is the "salvaged fragments look like a complete recipe" corruption this pipeline had before.
 */
export async function structureRecipeFromOcr(
  client: OpenAI,
  phases: OcrPhases,
  opts: {
    externalSignal?: AbortSignal
    onProgress?: (charactersSoFar: number) => void
  } = {},
): Promise<ParsedRecipeFields | null> {
  const { phase1, phase2 } = phases

  const ingredientList = Array.isArray(phase1.ingredients) ? phase1.ingredients.join('\n') : ''
  const stepList = phase2 && Array.isArray(phase2.steps) ? phase2.steps.join('\n') : ''
  // The headnote is transcribed under its own key (see PAGE_OCR_PROMPT) so it can not be mistaken
  // for a step — but it's still the best source for `description`, so hand it over explicitly
  // rather than letting the model invent one.
  const headnote = phase2 && typeof phase2.headnote === 'string' ? phase2.headnote.trim() : ''

  const phase3 = await runPhase(
    client,
    STRUCTURE_SYSTEM_PROMPT,
    buildStructurePrompt(ingredientList, stepList, headnote),
    undefined,
    MODEL,
    STRUCTURE_MAX_TOKENS,
    STRUCTURE_TIMEOUT_MS,
    opts.externalSignal,
    opts.onProgress,
  )

  if (!phase3) return null

  // Callers merge phases last-write-wins, so this final payload must carry shapes the editor can
  // actually render — it can't rely on the model having returned every field. This is a FRESH
  // import, so there is no existing title to fall back to on an implausible one (unlike
  // Refresh/Enhancement's mergeAiRecipeUpdate) — extractPlausibleTitle tries to salvage a clean
  // dish name from a self-narrating title before giving up.
  const normalizedIngredients = normalizeIngredients(phase3.ingredients, phase1.ingredients)
  const normalizedSteps = normalizeSteps(
    phase3.structuredSteps,
    phase3.steps,
    phase2?.steps,
    phase3.description,
  )
  const normalizedTitle = extractPlausibleTitle(phase3.title)

  return {
    ...phase3,
    ...(normalizedIngredients ? { ingredients: normalizedIngredients } : {}),
    ...(normalizedSteps ? { steps: normalizedSteps } : {}),
    title: normalizedTitle ?? 'Untitled Recipe',
    // Instructions OCR failing doesn't block the pipeline (ingredients alone are still useful),
    // but silently continuing meant a recipe could be saved with no instructions and no signal
    // that anything was wrong. Flag it so the caller can tell the user explicitly instead.
    ...(phase2 ? {} : { partialFailure: 'instructions' }),
  }
}

/**
 * The single structuring call for URL / JSON-LD / pasted-text sources — the content is already
 * textual, so no transcription is needed. Sends it straight to the model with the source-specific
 * system prompt `resolveInput()` already selected (URL_SYSTEM_PROMPT / JSON_LD_SYSTEM_PROMPT /
 * TEXT_SYSTEM_PROMPT), same as the Gemini enhance/refresh path. `buildMessageContent()` attaches
 * the actual text via `contentPart`.
 *
 * Normalized identically to the photo path: this path (URL, JSON-LD, Reddit, pasted text — four
 * of the five import sources) previously applied none of the validation the photo path has, so a
 * malformed ingredients/steps shape or a self-narrating title went straight into the saved recipe.
 * No OCR fallback exists here, so the ingredient/step normalizers see only the AI result itself.
 */
export async function structureRecipeFromText(
  client: OpenAI,
  contentPart: Record<string, unknown> | undefined,
  prompt: string,
  style: 'strict' | 'enhanced' = 'strict',
  externalSignal?: AbortSignal,
): Promise<ParsedRecipeFields | null> {
  const result = await runPhase(
    client,
    'You are an expert Chef and Data Engineer. Follow the instructions in the user message exactly and return a strict JSON object.',
    `${prompt}\n${getSystemPrompts(style)}`,
    contentPart,
    MODEL,
    STRUCTURE_MAX_TOKENS,
    STRUCTURE_TIMEOUT_MS,
    externalSignal,
  )

  if (!result) return null

  const normalizedIngredients = normalizeIngredients(result.ingredients)
  const normalizedSteps = normalizeSteps(
    result.structuredSteps,
    result.steps,
    undefined,
    result.description,
  )
  const normalizedTitle = extractPlausibleTitle(result.title)

  return {
    ...result,
    ...(normalizedIngredients ? { ingredients: normalizedIngredients } : {}),
    ...(normalizedSteps ? { steps: normalizedSteps } : {}),
    title: normalizedTitle ?? 'Untitled Recipe',
  }
}

/**
 * The whole photo pipeline in one call: transcribe the photo (or the pages of one grouped
 * recipe), then structure it. Throws `PhotoParseError` rather than returning null, because a
 * caller with no stream to error has nothing useful to do with a half-result.
 *
 * The Cloudflare route does NOT use this — it needs the transcription in its hands before the
 * structuring pass finishes, so it can stream `_p: 1`/`_p: 2` to the browser immediately. This is
 * for callers that just want the finished recipe: the VM worker's bulk-import job.
 */
export async function parsePhotosToRecipe(
  client: OpenAI,
  photos: PhotoSource[],
  opts: { externalSignal?: AbortSignal } = {},
): Promise<ParsedRecipeFields> {
  const phases = await transcribePhotos(client, photos, opts)
  if (!phases) throw new PhotoParseError(OCR_FAILED_MESSAGE, 'transcribe')

  const recipe = await structureRecipeFromOcr(client, phases, opts)
  if (!recipe) throw new PhotoParseError(STRUCTURE_FAILED_MESSAGE, 'structure')

  return recipe
}

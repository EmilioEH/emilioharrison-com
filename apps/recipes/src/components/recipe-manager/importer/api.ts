export async function uploadImage(file: File, baseUrl: string): Promise<string | null> {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch(`${baseUrl}api/uploads`, {
      method: 'POST',
      body: formData,
    })

    if (res.ok) {
      const { key } = await res.json()
      return `${baseUrl}api/uploads/${key}`
    }
    return null
  } catch (err) {
    console.error('Upload error', err)
    throw new Error('Network error while uploading image.')
  }
}

/** Maps a stream-reading failure (unsalvageable — see the `merged.title` check above) to a
 * user-friendly message. */
function getStreamErrorMessage(err: unknown): string {
  if (err instanceof SyntaxError) {
    if (err.message.includes('Empty response')) {
      return 'The AI couldn’t process this image. Try a different photo or upload a clearer image.'
    }
    return 'The AI response was cut off. Please try again — if this persists, try a smaller or clearer photo.'
  }
  if (err instanceof Error) return err.message
  return 'Something went wrong'
}

/** Indexed by the `_p` phase marker parse-recipe.ts's response streams (`_p: 1/2/3`). Shared by
 * both the streaming and non-streaming (`!res.body` fallback) read paths — previously duplicated
 * verbatim in each, one of the things that made `parseRecipe` hard to follow. */
const PHASE_PROGRESS_MESSAGES = [
  '',
  // Each marker arrives *after* its phase finished, so the wording names what just completed.
  // These used to describe the phase as if it were starting — "Structuring instructions" appeared
  // the moment instruction OCR ended, which is also where the bar then sat frozen.
  'Read the ingredients... (20%)',
  'Read the instructions... (35%)',
  'Finalizing recipe details... (100%)',
]

function reportPhaseProgress(phase: unknown, onProgress?: (msg: string) => void): void {
  if (typeof phase !== 'number' || !onProgress) return
  const msg = PHASE_PROGRESS_MESSAGES[phase]
  if (msg) onProgress(msg)
}

/** Where the structuring phase's own progress is mapped to, between OCR finishing and the end. */
const STRUCTURE_BAND_START = 35
const STRUCTURE_BAND_END = 95

/**
 * Reports progress from the structuring phase, which is the slow one.
 *
 * The server sends a 0..1 fraction as `_t` while that response streams in. Before this the bar
 * had nothing to show for the ~60s it can take and sat at a fixed percentage, which is
 * indistinguishable from a hung import.
 */
function reportStructuringProgress(fraction: unknown, onProgress?: (msg: string) => void): void {
  if (typeof fraction !== 'number' || !onProgress) return
  const clamped = Math.min(Math.max(fraction, 0), 1)
  const percent = Math.round(STRUCTURE_BAND_START + clamped * (STRUCTURE_BAND_END - STRUCTURE_BAND_START))
  onProgress(`Structuring the recipe... (${percent}%)`)
}

/** Parses one NDJSON line and merges it onto `merged` in place. Malformed/partial lines (e.g. a
 * chunk boundary that split a line mid-write) are skipped silently rather than treated as an
 * error — the next read (or the trailing-buffer flush) recovers a clean line. */
function mergeNdjsonLine(
  merged: Record<string, unknown>,
  line: string,
  onProgress?: (msg: string) => void,
): void {
  const trimmed = line.trim()
  if (!trimmed) return
  try {
    const phaseData = JSON.parse(trimmed)

    // A progress-only line. It must return before the merge below: `Object.assign` folds in every
    // key it is given, so letting `_t` through would write a stray field onto the recipe itself.
    if ('_t' in phaseData) {
      reportStructuringProgress(phaseData._t, onProgress)
      return
    }

    reportPhaseProgress(phaseData._p, onProgress)
    delete phaseData._p
    Object.assign(merged, phaseData)
  } catch {
    // Skip partial/unparseable lines — see doc comment above.
  }
}

/**
 * Reads the streaming response body to completion, merging each NDJSON line onto `merged` as it
 * arrives. Mutates `merged` in place (rather than building and returning its own object) so that
 * if this throws partway through, the caller still has whatever was merged before the failure —
 * that partial state is exactly what `parseRecipe`'s catch block uses to decide whether a failure
 * is salvageable (see the `merged.title` check there).
 */
async function readNdjsonStream(
  body: ReadableStream<Uint8Array>,
  merged: Record<string, unknown>,
  onProgress?: (msg: string) => void,
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    const newlineIdx = buffer.lastIndexOf('\n')
    if (newlineIdx < 0) continue

    const complete = buffer.slice(0, newlineIdx)
    buffer = buffer.slice(newlineIdx + 1)
    for (const line of complete.split('\n')) {
      mergeNdjsonLine(merged, line, onProgress)
    }
  }

  if (buffer.trim()) mergeNdjsonLine(merged, buffer, onProgress)
}

type CandidateImages = Array<{ url: string; alt?: string; isDefault?: boolean }>
type ParseResult = { data: unknown; candidateImages?: CandidateImages }

/** Reads and throws the server's error message for a non-OK response, falling back to the raw
 * status line if the body isn't the expected `{error}` JSON shape. */
async function throwForErrorResponse(res: Response): Promise<never> {
  let errMsg = `Failed: ${res.status} ${res.statusText}`
  try {
    const errData = JSON.parse(await res.text())
    if (errData.error) errMsg = errData.error
  } catch {
    // ignore — use the status-line fallback above
  }
  throw new Error(errMsg)
}

/** Pulls the source URL and image-picker candidates out of response headers (see
 * `parse-recipe.ts`'s `responseHeaders`). Malformed JSON in the candidates header is ignored
 * rather than failing the whole import over an image-picker nicety. */
function extractResponseMetadata(res: Response): {
  sourceUrl: string | undefined
  candidateImages: CandidateImages | undefined
} {
  const sourceUrl = res.headers.get('X-Source-Url') || undefined
  let candidateImages: CandidateImages | undefined
  try {
    const header = res.headers.get('X-Candidate-Images')
    if (header) candidateImages = JSON.parse(header)
  } catch {
    // Invalid JSON in header, ignore
  }
  return { sourceUrl, candidateImages }
}

/** Non-streaming fallback (some environments don't expose `res.body`): read the whole response as
 * text and parse it as NDJSON in one pass rather than incrementally. */
async function parseFromFullText(
  res: Response,
  sourceUrl: string | undefined,
  candidateImages: CandidateImages | undefined,
  onProgress?: (msg: string) => void,
): Promise<ParseResult> {
  const merged = parseNdjsonLines(await res.text(), onProgress)
  if (Object.keys(merged).length === 0) {
    throw new SyntaxError('Empty response — the AI generated no content')
  }
  if (sourceUrl) merged.sourceUrl = sourceUrl
  return { data: merged, candidateImages }
}

/**
 * Reads the streaming response to completion. On a stream failure, salvages whatever was merged
 * so far if structuring got far enough to produce a title — see `readNdjsonStream`'s doc comment
 * for why a title is the bar for "usable" (phase 1/2 fragments alone aren't a real recipe, and
 * silently treating them as one is how a hollow, title-less recipe got saved with no error shown,
 * per the recipe-corruption postmortem). Everything else propagates as a real, user-visible error.
 */
async function parseFromStream(
  body: ReadableStream<Uint8Array>,
  sourceUrl: string | undefined,
  candidateImages: CandidateImages | undefined,
  onProgress?: (msg: string) => void,
): Promise<ParseResult> {
  const merged: Record<string, unknown> = {}

  try {
    await readNdjsonStream(body, merged, onProgress)
    if (Object.keys(merged).length === 0) {
      throw new SyntaxError('Empty response — the AI generated no content')
    }
    if (sourceUrl) merged.sourceUrl = sourceUrl
    return { data: merged, candidateImages }
  } catch (err) {
    // Preserve cancellation semantics — let the caller's AbortError check in
    // handleParseError see the real error, rather than wrapping it below.
    if (err instanceof Error && err.name === 'AbortError') throw err

    console.warn('Stream error — attempting to salvage partial response', err)

    if (merged.title) {
      if (sourceUrl) merged.sourceUrl = sourceUrl
      return { data: merged, candidateImages }
    }

    throw new Error(getStreamErrorMessage(err))
  }
}

export async function parseRecipe(
  payload: {
    url?: string
    image?: string
    text?: string
    mode?: 'parse' | 'infer'
    style?: 'strict' | 'enhanced'
    dishName?: string
    cuisine?: string
    knownIngredients?: string
    dietaryNotes?: string
    tasteProfile?: string
  },
  baseUrl: string,
  signal?: AbortSignal,
  onProgress?: (stage: string) => void,
): Promise<ParseResult> {
  const res = await fetch(`${baseUrl}api/parse-recipe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  })

  if (!res.ok) await throwForErrorResponse(res)

  const { sourceUrl, candidateImages } = extractResponseMetadata(res)

  return res.body
    ? parseFromStream(res.body, sourceUrl, candidateImages, onProgress)
    : parseFromFullText(res, sourceUrl, candidateImages, onProgress)
}

function parseNdjsonLines(
  text: string,
  onProgress?: (msg: string) => void,
): Record<string, unknown> {
  const merged: Record<string, unknown> = {}
  for (const line of text.trim().split('\n')) {
    mergeNdjsonLine(merged, line, onProgress)
  }
  return merged
}

/**
 * One shared layer for deciding whether an AI-produced Recipe field is safe to use — applied at
 * every place a raw AI result becomes part of a saved recipe: fresh import (all five sources —
 * photo, URL, JSON-LD, Reddit, pasted text) and Refresh/Enhancement's merge.
 *
 * Before this module existed, these checks were invented independently per call site and several
 * sites had none at all: `normalizeIngredients`/`normalizeSteps` lived in parse-recipe.ts and
 * protected the *photo* import path only (URL/JSON-LD/Reddit/text import called none of it), while
 * title-plausibility and description/step classification lived in recipe-merge.ts and protected
 * *only* Refresh/Enhancement (a fresh import never touched it — the client-side merge in
 * RecipeEditor.tsx is a raw object spread). That gap is exactly how a title-pollution bug fixed
 * for Enhancement could still happen, unfixed, on a brand-new photo import.
 *
 * NOTE: must stay free of Cloudflare/Astro-only imports — this is reachable from recipe-merge.ts,
 * which the self-hosted VM worker imports and runs in plain Node.
 */

// ---------------------------------------------------------------------------
// Title plausibility
// ---------------------------------------------------------------------------

/**
 * Longest a real recipe title plausibly gets. Generous — "Roasted Pork Chops and Vegetables with
 * Parsley Vinaigrette" is 56 — while still far below the runaway lengths seen in the wild.
 */
/**
 * Real cookbook titles run long — "Salted Butter and Chocolate Chunk Shortbread, or Why Would I
 * Make Another Chocolate Chip Cookie Ever Again?" is 105 characters and entirely legitimate. The
 * cap exists only to catch runaway output (the incident that prompted it produced a 3,167-character
 * title), so it sits well above any plausible real title. The commentary-phrase check below is what
 * actually distinguishes a real title from the model narrating its own difficulties.
 */
const MAX_TITLE_LENGTH = 200

/**
 * Phrases that mark a "title" as the model narrating its own difficulties rather than naming the
 * dish. Seen in production on two recipes, one with a 3,167-character title that opened
 * "... (Incomplete Recipe Extract from Image Source - Instructions truncated in source image,
 * completing based on common culinary practices ...)". The dish name was correct; the model just
 * appended an apology to it.
 */
// "note:" is deliberately its own alternative with no trailing `\b` — a word boundary can't match
// between ":" and the space that follows it (neither is a word character, so there's no
// transition), which silently let "Note: ..." commentary through undetected when it wasn't
// accompanied by one of the other trigger phrases.
const TITLE_COMMENTARY =
  /\bnote:|\b(incomplete recipe|truncated|inferred|based on common|source image|extract from|remaining steps|not (?:fully )?(?:visible|legible))\b/i

/** Character(s) that typically introduce commentary tacked onto an otherwise-clean title. */
const COMMENTARY_START = /[([]|(?:\bnote:)/i

/**
 * Whether an AI-supplied title is safe to use as-is. A recipe title is a short noun phrase;
 * anything long or self-narrating is the model breaking character.
 */
function isPlausibleTrimmedTitle(t: string): boolean {
  return t.length > 0 && t.length <= MAX_TITLE_LENGTH && !TITLE_COMMENTARY.test(t)
}

export function isPlausibleTitle(title: unknown): title is string {
  return typeof title === 'string' && isPlausibleTrimmedTitle(title.trim())
}

/**
 * For merges *onto an existing recipe* (Refresh/Enhancement): the existing title is always a
 * reasonable fallback, since the user has already seen and accepted it. Returns the AI title only
 * if plausible, else the original.
 */
export function pickPlausibleTitle(aiTitle: unknown, originalTitle: string): string {
  return isPlausibleTitle(aiTitle) ? aiTitle.trim() : originalTitle
}

/**
 * For a *fresh* import, there is no original title to fall back to. Tries to salvage a clean dish
 * name from an implausible title before giving up entirely — the two production incidents both had
 * the correct dish name first, with commentary appended after a `(`/`[`/`Note:` marker, so
 * truncating there recovers a good title without needing another AI call. Returns `undefined` only
 * when nothing usable survives (caller should fall back to a placeholder like "Untitled Recipe").
 */
export function extractPlausibleTitle(title: unknown): string | undefined {
  if (typeof title !== 'string') return undefined
  const t = title.trim()
  if (isPlausibleTrimmedTitle(t)) return t

  const match = COMMENTARY_START.exec(t)
  if (match && match.index > 0) {
    const salvaged = t.slice(0, match.index).trim().replace(/[,;:.\s-]+$/, '')
    if (isPlausibleTrimmedTitle(salvaged)) return salvaged
  }

  return undefined
}

// ---------------------------------------------------------------------------
// Description vs. steps
// ---------------------------------------------------------------------------

/** Collapses case, punctuation, and whitespace so OCR spacing or a stray period can't defeat a
 * match between two renderings of the same sentence. */
function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Minimum normalized length before a step is even considered a description echo. A genuinely
 * short instruction ("Toast the bread.") can share opening words with a long description, and
 * dropping a real step is worse than leaving a stray blurb in the list.
 */
const MIN_ECHO_LENGTH = 40

/**
 * True when `step` is really the description rather than an instruction. Handles both the exact
 * repeat and the truncation case — a step list often carries only the description's opening
 * sentences — via a prefix comparison in either direction.
 */
export function isDescriptionEcho(step: string, description: string): boolean {
  const s = normalizeForCompare(step)
  const d = normalizeForCompare(description)
  if (!s || !d || s.length < MIN_ECHO_LENGTH) return false
  return d.startsWith(s) || s.startsWith(d)
}

/**
 * Drops leading steps that merely echo the description.
 *
 * Only strips from the front: a blurb appears as the lead-in, whereas a mid-list match is far
 * more likely to be a legitimate instruction that happens to read similarly. Never returns an
 * empty list — if every entry looks description-ish, that's more likely a bad comparison than a
 * recipe with no steps, and the caller's data is left alone.
 */
export function stripLeadingDescriptionEcho(
  steps: string[],
  description: string | undefined,
): string[] {
  if (!Array.isArray(steps) || steps.length === 0 || !description) return steps

  let start = 0
  while (start < steps.length && isDescriptionEcho(steps[start], description)) start++

  return start < steps.length ? steps.slice(start) : steps
}

// ---------------------------------------------------------------------------
// Ingredient shape
// ---------------------------------------------------------------------------

/** True for an ingredient entry the editor can actually render — an object carrying a `name`.
 * Photo-import OCR emits plain strings before structuring; the structuring/enhancement pass
 * emits `{name, amount, prep?}`. */
export function isObjectIngredient(value: unknown): value is { name: string } {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as { name?: unknown }).name === 'string' &&
    (value as { name: string }).name.trim().length > 0
  )
}

/**
 * Guarantees `ingredients` are object-shaped, coercing raw strings to `{name}` rather than letting
 * them reach the editor as-is — a mapping like `${i.amount} ${i.name}` over a string entry renders
 * the literal text "undefined" (a real, reported bug). `fallback` is optional secondary source
 * (e.g. photo OCR's raw ingredient lines) used only when `structured` is empty or entirely
 * malformed; callers with no such fallback (URL/JSON-LD/Reddit/text import, Refresh/Enhancement)
 * simply omit it.
 */
export function normalizeIngredients(
  structured: unknown,
  fallback?: unknown,
): Array<Record<string, unknown>> | undefined {
  if (Array.isArray(structured) && structured.length > 0 && structured.every(isObjectIngredient)) {
    return structured as Array<Record<string, unknown>>
  }

  const source = Array.isArray(structured) && structured.length > 0 ? structured : fallback
  if (!Array.isArray(source)) return undefined

  const coerced = source
    .map((entry) => {
      if (isObjectIngredient(entry)) return entry as Record<string, unknown>
      if (typeof entry === 'string' && entry.trim()) return { name: entry.trim(), amount: '' }
      return null
    })
    .filter((e): e is Record<string, unknown> => e !== null)

  return coerced.length > 0 ? coerced : undefined
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

/**
 * Picks the best available step list and strips a leading description echo from it.
 *
 * Preference order: `structuredSteps[].text` (the more deliberate output — verified against a
 * real production result where the model returned both, with the blurb polluting `steps` while
 * `structuredSteps` was clean), then plain `steps`, then `fallback` (e.g. photo OCR's raw
 * transcription) as a last resort — a rough list beats an empty one. Callers with no fallback
 * concept (URL/JSON-LD/Reddit/text import, Refresh/Enhancement) simply omit it.
 */
export function normalizeSteps(
  structuredSteps: unknown,
  steps: unknown,
  fallback: unknown,
  description?: unknown,
): string[] | undefined {
  const fromStructured = Array.isArray(structuredSteps)
    ? structuredSteps
        .map((s) =>
          s && typeof s === 'object'
            ? (s as { text?: unknown }).text
            : typeof s === 'string'
              ? s
              : undefined,
        )
        .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    : []

  const fromSteps = Array.isArray(steps)
    ? steps.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : []

  const fromFallback = Array.isArray(fallback)
    ? fallback.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : []

  const chosen =
    fromStructured.length > 0 ? fromStructured : fromSteps.length > 0 ? fromSteps : fromFallback

  if (chosen.length === 0) return undefined

  return stripLeadingDescriptionEcho(
    chosen,
    typeof description === 'string' ? description : undefined,
  )
}

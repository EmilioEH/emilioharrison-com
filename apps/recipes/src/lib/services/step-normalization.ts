/**
 * Shared guard against a recipe's descriptive blurb being stored as a cooking step.
 *
 * Recipe sources (photo cards, web pages) open with prose — "X is a simple roasted pork
 * tenderloin, usually served cold" — and every AI path that produces a step list has been
 * observed gluing that onto the front of `steps` at least some of the time: the photo-import
 * structuring pass (api/parse-recipe.ts) and the Gemini reparse behind Refresh/Enhancement
 * (services/recipe-merge.ts) both do it, inconsistently, on the same recipe.
 *
 * Prompting alone doesn't fix it reliably, and the two paths overwrite each other's `steps`
 * (background Enhancement runs right after an import), so the check lives here and is applied
 * at both choke points.
 *
 * NOTE: must stay free of Cloudflare/Astro-only imports — recipe-merge.ts is also imported by
 * the self-hosted VM worker running in plain Node.
 */

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

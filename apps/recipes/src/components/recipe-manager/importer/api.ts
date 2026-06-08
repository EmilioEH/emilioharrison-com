/**
 * Attempts to parse a possibly-truncated JSON string from the AI stream.
 * - Tries JSON.parse directly first
 * - If that fails, strips markdown code fences, control characters, trailing commas
 * - Then attempts to close unclosed strings, arrays, and objects
 * - Progressive truncation as a last resort
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tryParseRecipeJson(text: string): any {
  // Step 1: Try direct parse (fast path)
  try {
    return JSON.parse(text)
  } catch {
    // Attempt repair
  }

  // Step 2: Strip markdown code fences (```json ... ```)
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```$/, '')
  }

  // Step 3: Replace control characters that break JSON.parse.
  // \n, \r, \t are handled above; strip remaining Cc category chars.
  // Uses Unicode property escape to avoid ESLint no-control-regex.
  cleaned = cleaned
    .replace(/\r/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/\p{Cc}/gu, ' ')

  // Step 4: Remove trailing commas before closing brackets/braces
  // (common AI behavior especially in large arrays)
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1')

  try {
    return JSON.parse(cleaned)
  } catch {
    // Fall through to deeper repair
  }

  let repaired = cleaned

  // Close unterminated string (odd number of double-quotes)
  const quoteCount = (repaired.match(/"/g) || []).length
  if (quoteCount % 2 !== 0) {
    repaired += '"'
  }

  // Close unclosed objects and arrays
  const openBraces = (repaired.match(/\{/g) || []).length
  const closeBraces = (repaired.match(/\}/g) || []).length
  const openBrackets = (repaired.match(/\[/g) || []).length
  const closeBrackets = (repaired.match(/\]/g) || []).length

  repaired += '}'.repeat(Math.max(0, openBraces - closeBraces))
  repaired += ']'.repeat(Math.max(0, openBrackets - closeBrackets))

  try {
    return JSON.parse(repaired)
  } catch {
    // Fall through to truncation approach
  }

  // Progressive truncation: find the longest valid JSON prefix
  for (let end = cleaned.lastIndexOf('}'); end > 0; end = cleaned.lastIndexOf('}', end - 1)) {
    const prefix = cleaned.slice(0, end + 1)
    try {
      return JSON.parse(prefix)
    } catch {
      continue
    }
  }

  for (let end = cleaned.lastIndexOf(']'); end > 0; end = cleaned.lastIndexOf(']', end - 1)) {
    const prefix = cleaned.slice(0, end + 1)
    try {
      return JSON.parse(prefix)
    } catch {
      continue
    }
  }

  throw new SyntaxError('Unable to parse recipe response — the response was incomplete')
}

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
): Promise<{
  data: unknown
  candidateImages?: Array<{ url: string; alt?: string; isDefault?: boolean }>
}> {
  const res = await fetch(`${baseUrl}api/parse-recipe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  })

  if (!res.ok) {
    let errMsg = `Failed: ${res.status} ${res.statusText}`
    try {
      const textBody = await res.text()
      const errData = JSON.parse(textBody)
      if (errData.error) errMsg = errData.error
    } catch {
      // ignore
    }
    throw new Error(errMsg)
  }

  // Extract metadata from headers
  const sourceUrl = res.headers.get('X-Source-Url') || undefined
  const candidateImagesHeader = res.headers.get('X-Candidate-Images')
  let candidateImages: Array<{ url: string; alt?: string; isDefault?: boolean }> | undefined

  try {
    if (candidateImagesHeader) {
      candidateImages = JSON.parse(candidateImagesHeader)
    }
  } catch {
    // Invalid JSON in header, ignore
  }

  if (!res.body) {
    const data = await res.json()
    return { data, candidateImages }
  }

  // If stream processing is requested via callback
  if (onProgress) {
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let result = ''

    // Track stages found to avoid repetitive updates
    const foundStages = new Set<string>()
    let stageCount = 0
    const totalStages = 5 // start, title, ingredients, steps, meta

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        result += chunk

        // Simple heuristics based on JSON keys appearing in the stream
        if (!foundStages.has('start') && result.length > 10) {
          foundStages.add('start')
          stageCount++
          onProgress(
            `Connected to Chef Gemini... (${Math.round((stageCount / totalStages) * 100)}%)`,
          )
        }
        if (!foundStages.has('title') && result.includes('"title":')) {
          foundStages.add('title')
          stageCount++
          onProgress(
            `Extracting recipe details... (${Math.round((stageCount / totalStages) * 100)}%)`,
          )
        }
        if (!foundStages.has('ingredients') && result.includes('"ingredients":')) {
          foundStages.add('ingredients')
          stageCount++
          onProgress(
            `Identifying ingredients... (${Math.round((stageCount / totalStages) * 100)}%)`,
          )
        }
        if (!foundStages.has('steps') && result.includes('"steps":')) {
          foundStages.add('steps')
          stageCount++
          onProgress(
            `Structuring instructions... (${Math.round((stageCount / totalStages) * 100)}%)`,
          )
        }
        if (
          !foundStages.has('meta') &&
          (result.includes('"dietary":') || result.includes('"cuisine":'))
        ) {
          foundStages.add('meta')
          stageCount++
          onProgress(`Finalizing metadata... (${Math.round((stageCount / totalStages) * 100)}%)`)
        }
      }

      // Final parse and merge source URL
      const parsed = tryParseRecipeJson(result)
      if (sourceUrl) {
        parsed.sourceUrl = sourceUrl
      }
      return { data: parsed, candidateImages }
    } catch (err) {
      console.warn('Stream error — attempting to salvage partial response', err)

      // Always try to parse whatever text was accumulated, regardless of error type.
      // Stream errors (network, Gemini safety filter, etc.) are rarely SyntaxError,
      // but the accumulated `result` may still contain usable partial JSON.
      try {
        const salvaged = tryParseRecipeJson(result)
        if (salvaged) {
          if (sourceUrl) {
            salvaged.sourceUrl = sourceUrl
          }
          return { data: salvaged, candidateImages }
        }
      } catch {
        // Salvage also failed — fall through to user-friendly error
      }

      const userMessage =
        err instanceof SyntaxError
          ? 'The AI response was cut off. Please try again — if this persists, try a smaller or clearer photo.'
          : err instanceof Error
            ? err.message
            : 'Something went wrong'
      throw new Error(userMessage)
    }
  }

  const data = await res.json()
  return { data, candidateImages }
}

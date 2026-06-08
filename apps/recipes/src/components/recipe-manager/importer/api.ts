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

  // Ensure we have a body to read
  if (!res.body) {
    const text = await res.text()
    const merged = parseNdjsonLines(text, onProgress)
    if (Object.keys(merged).length === 0) {
      throw new SyntaxError('Empty response — the AI generated no content')
    }
    if (sourceUrl) (merged as Record<string, unknown>).sourceUrl = sourceUrl
    return { data: merged, candidateImages }
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const merged: Record<string, any> = {}

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Process complete NDJSON lines as they arrive
      const newlineIdx = buffer.lastIndexOf('\n')
      if (newlineIdx >= 0) {
        const complete = buffer.slice(0, newlineIdx)
        buffer = buffer.slice(newlineIdx + 1)
        for (const line of complete.split('\n')) {
          const trimmed = line.trim()
          if (!trimmed) continue
          try {
            const phaseData = JSON.parse(trimmed)
            const p = phaseData._p
            if (p && onProgress) {
              const msgs = [
                '',
                'Extracting ingredients... (33%)',
                'Structuring instructions... (66%)',
                'Finalizing recipe details... (100%)',
              ]
              if (msgs[p]) onProgress(msgs[p])
            }
            delete phaseData._p
            Object.assign(merged, phaseData)
          } catch {
            // Skip partial/unparseable lines
          }
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      try {
        const phaseData = JSON.parse(buffer.trim())
        delete phaseData._p
        Object.assign(merged, phaseData)
      } catch {
        // ignore
      }
    }

    if (Object.keys(merged).length === 0) {
      throw new SyntaxError('Empty response — the AI generated no content')
    }

    if (sourceUrl) merged.sourceUrl = sourceUrl
    return { data: merged, candidateImages }
  } catch (err) {
    console.warn('Stream error — attempting to salvage partial response', err)

    // Try to salvage whatever we have
    if (Object.keys(merged).length > 0) {
      if (sourceUrl) merged.sourceUrl = sourceUrl
      return { data: merged, candidateImages }
    }

    const userMessage =
      err instanceof SyntaxError && err.message.includes('Empty response')
        ? 'The AI couldn\u2019t process this image. Try a different photo or upload a clearer image.'
        : err instanceof SyntaxError
          ? 'The AI response was cut off. Please try again — if this persists, try a smaller or clearer photo.'
          : err instanceof Error
            ? err.message
            : 'Something went wrong'
    throw new Error(userMessage)
  }
}

function parseNdjsonLines(text: string, onProgress?: (msg: string) => void): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const merged: Record<string, any> = {}
  const msgs = [
    '',
    'Extracting ingredients... (33%)',
    'Structuring instructions... (66%)',
    'Finalizing recipe details... (100%)',
  ]
  for (const line of text.trim().split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const phaseData = JSON.parse(trimmed)
      const p = phaseData._p
      if (p && onProgress && msgs[p]) onProgress(msgs[p])
      delete phaseData._p
      Object.assign(merged, phaseData)
    } catch {
      // skip bad lines
    }
  }
  return merged
}

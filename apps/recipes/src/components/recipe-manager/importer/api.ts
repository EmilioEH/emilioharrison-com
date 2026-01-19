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
): Promise<unknown> {
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
  if (!res.body) return await res.json()

  // If stream processing is requested via callback
  if (onProgress) {
    // Capture headers for source info before reading body
    const sourceUrl = res.headers.get('X-Source-Url') || undefined

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
      const parsed = JSON.parse(result)
      if (sourceUrl) {
        parsed.sourceUrl = sourceUrl
      }
      return parsed
    } catch (err) {
      console.warn('Stream parsing failed, falling back to text parsing if possible', err)
      // If JSON parse failed, it might be incomplete or error
      throw err
    }
  }

  return await res.json()
}

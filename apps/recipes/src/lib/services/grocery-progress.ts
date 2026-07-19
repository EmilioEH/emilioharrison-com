/**
 * Progress heuristics for the grocery-list generation stream (see generate-grocery-list.ts).
 * Detects category boundaries in the accumulating JSON text so the UI can show granular
 * progress ("Selecting fresh produce...") without waiting for the full response — matches the
 * fixed 8-category order the AI is instructed to use.
 */

interface GroceryProgressStage {
  key: string
  test: RegExp
  progress: number
  message: string
}

const GROCERY_PROGRESS_STAGES: GroceryProgressStage[] = [
  {
    key: 'produce',
    test: /"category":\s*"Produce"/i,
    progress: 25,
    message: 'Selecting fresh produce...',
  },
  {
    key: 'meat',
    test: /"category":\s*"Meat"/i,
    progress: 40,
    message: 'Checking butcher & seafood...',
  },
  {
    key: 'pantry',
    test: /"category":\s*"(Pantry|Spices)"/i,
    progress: 60,
    message: 'Auditing pantry essentials...',
  },
  {
    key: 'dairy',
    test: /"category":\s*"Dairy"/i,
    progress: 80,
    message: 'Reviewing dairy & eggs...',
  },
  {
    key: 'frozen',
    test: /"category":\s*"Frozen"/i,
    progress: 90,
    message: 'Adding frozen items...',
  },
]

export interface GroceryProgressUpdate {
  progress: number
  message: string
}

/**
 * Given the text accumulated so far and the set of stage keys already seen (mutated in place —
 * pass the same `Set` across calls for one generation), returns the next newly-detected stage,
 * or `null` if nothing new has appeared yet. Call repeatedly (in a loop) after each chunk to
 * catch multiple stage transitions that arrived in a single chunk.
 */
export function detectNextGroceryStage(
  accumulatedText: string,
  foundStages: Set<string>,
): GroceryProgressUpdate | null {
  if (!foundStages.has('start') && accumulatedText.length > 50) {
    foundStages.add('start')
    return { progress: 10, message: 'Analyzing recipes...' }
  }

  for (const stage of GROCERY_PROGRESS_STAGES) {
    if (!foundStages.has(stage.key) && stage.test.test(accumulatedText)) {
      foundStages.add(stage.key)
      return { progress: stage.progress, message: stage.message }
    }
  }

  return null
}

/** All newly-detected stages for this chunk of accumulated text, in order. */
export function detectAllNewGroceryStages(
  accumulatedText: string,
  foundStages: Set<string>,
): GroceryProgressUpdate[] {
  const updates: GroceryProgressUpdate[] = []
  let next = detectNextGroceryStage(accumulatedText, foundStages)
  while (next) {
    updates.push(next)
    next = detectNextGroceryStage(accumulatedText, foundStages)
  }
  return updates
}

/** Extracts the text delta from a Gemini streaming chunk, across the shapes it may take. */
export function extractGeminiChunkText(chunk: unknown): string {
  if (chunk && typeof chunk === 'object') {
    const c = chunk as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      text?: string
    }
    if (c.candidates?.[0]?.content?.parts?.[0]?.text) {
      return c.candidates[0].content.parts[0].text
    }
    if (typeof c.text === 'string') {
      return c.text
    }
  }
  if (typeof chunk === 'string') return chunk
  return ''
}

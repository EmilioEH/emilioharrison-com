/**
 * Persistent store for cooking progress tracked from the recipe overview.
 * Stores checked ingredients and completed steps per recipe, keyed by recipe ID.
 * Auto-clears after 24 hours so stale state doesn't persist forever.
 */

const STORAGE_KEY = 'overview-cooking-progress'
const EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

interface RecipeProgress {
  checkedIngredients: number[]
  checkedSteps: number[]
  timestamp: number
}

type ProgressStore = Record<string, RecipeProgress>

function loadStore(): ProgressStore {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const store: ProgressStore = JSON.parse(raw)
    const now = Date.now()
    // Purge expired entries
    for (const key of Object.keys(store)) {
      if (now - store[key].timestamp > EXPIRY_MS) {
        delete store[key]
      }
    }
    return store
  } catch {
    return {}
  }
}

function saveStore(store: ProgressStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Storage full or unavailable — silently fail
  }
}

function getProgress(recipeId: string): RecipeProgress {
  const store = loadStore()
  return store[recipeId] || { checkedIngredients: [], checkedSteps: [], timestamp: Date.now() }
}

function setProgress(recipeId: string, progress: RecipeProgress) {
  const store = loadStore()
  store[recipeId] = { ...progress, timestamp: Date.now() }
  saveStore(store)
}

// --- Public API ---

export function getCheckedIngredients(recipeId: string): number[] {
  return getProgress(recipeId).checkedIngredients
}

export function getCheckedSteps(recipeId: string): number[] {
  return getProgress(recipeId).checkedSteps
}

export function toggleIngredient(recipeId: string, index: number): number[] {
  const progress = getProgress(recipeId)
  const set = new Set(progress.checkedIngredients)
  if (set.has(index)) {
    set.delete(index)
  } else {
    set.add(index)
  }
  const updated = Array.from(set)
  setProgress(recipeId, { ...progress, checkedIngredients: updated })
  return updated
}

export function toggleStep(recipeId: string, stepIndex: number): number[] {
  const progress = getProgress(recipeId)
  const set = new Set(progress.checkedSteps)
  if (set.has(stepIndex)) {
    set.delete(stepIndex)
  } else {
    set.add(stepIndex)
  }
  const updated = Array.from(set)
  setProgress(recipeId, { ...progress, checkedSteps: updated })
  return updated
}

export function hasAnyProgress(recipeId: string): boolean {
  const progress = getProgress(recipeId)
  return progress.checkedIngredients.length > 0 || progress.checkedSteps.length > 0
}

export function clearProgress(recipeId: string): void {
  const store = loadStore()
  delete store[recipeId]
  saveStore(store)
}

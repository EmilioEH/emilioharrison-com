import { map } from 'nanostores'
import type { Recipe } from '../lib/types'

export interface Timer {
  id: string
  stepNumber: number
  duration: number // total seconds
  remaining: number // current seconds
  isRunning: boolean
  label: string
}

export interface CookingSession {
  isActive: boolean
  recipeId: string | null
  recipe: Recipe | null // hydrating full recipe for ease of access in components
  currentStepIdx: number
  maxStepReached: number // for progress tracking
  startTime: number | null
  completedSteps: number[] // array of step indices
  activeTimers: Record<string, Timer> // keyed by timer ID
  checkedIngredients: number[] // indices of checked ingredients
}

const initialSession: CookingSession = {
  isActive: false,
  recipeId: null,
  recipe: null,
  currentStepIdx: 0,
  maxStepReached: 0,
  startTime: null,
  completedSteps: [],
  activeTimers: {},
  checkedIngredients: [],
}

export const $cookingSession = map<CookingSession>(initialSession)

export const cookingSessionActions = {
  startSession: (recipe: Recipe) => {
    // Check if we have a saved session for this recipe in localStorage (TODO: Persistence)
    $cookingSession.set({
      ...initialSession,
      isActive: true,
      recipeId: recipe.id,
      recipe,
      startTime: Date.now(),
    })

    // Notify family (fire and forget)
    const baseUrl = import.meta.env.BASE_URL.endsWith('/')
      ? import.meta.env.BASE_URL
      : `${import.meta.env.BASE_URL}/`

    fetch(`${baseUrl}api/cooking/notify-start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeId: recipe.id }),
    }).catch((err) => console.error('Failed to notify start:', err))
  },

  endSession: () => {
    $cookingSession.set(initialSession)
  },

  goToStep: (stepIdx: number) => {
    const session = $cookingSession.get()
    if (!session.isActive || !session.recipe) return

    const safeIdx = Math.max(0, Math.min(stepIdx, session.recipe.steps.length))

    $cookingSession.setKey('currentStepIdx', safeIdx)
    if (safeIdx > session.maxStepReached) {
      $cookingSession.setKey('maxStepReached', safeIdx)
    }
  },

  completeStep: (stepIdx: number) => {
    const session = $cookingSession.get()
    if (!session.completedSteps.includes(stepIdx)) {
      $cookingSession.setKey('completedSteps', [...session.completedSteps, stepIdx])
    }
  },

  // Timer actions will be delegated to TimerManager, which updates this store
  updateTimer: (timer: Timer) => {
    const session = $cookingSession.get()
    $cookingSession.setKey('activeTimers', {
      ...session.activeTimers,
      [timer.id]: timer,
    })
  },

  removeTimer: (timerId: string) => {
    const session = $cookingSession.get()
    const { [timerId]: _, ...rest } = session.activeTimers
    $cookingSession.setKey('activeTimers', rest)
  },

  toggleIngredient: (index: number) => {
    const session = $cookingSession.get()
    const current = new Set(session.checkedIngredients)
    if (current.has(index)) {
      current.delete(index)
    } else {
      current.add(index)
    }
    $cookingSession.setKey('checkedIngredients', Array.from(current))
  },
}

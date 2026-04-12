export const triggerHaptic = (style: 'light' | 'medium' | 'success' = 'light') => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    const patterns = { light: [10], medium: [20], success: [10, 50, 20] }
    navigator.vibrate(patterns[style])
  }
}

export const LONG_PRESS_MS = 500

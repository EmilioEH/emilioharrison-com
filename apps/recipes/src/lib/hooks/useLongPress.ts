import { useCallback, useRef } from 'react'
import { triggerHaptic, LONG_PRESS_MS } from '../haptics'

/**
 * Press-and-hold gesture, extracted from the grocery list where it was the app's only
 * implementation. Returns props to spread onto the pressable element, plus `didLongPress()` so a
 * click handler can tell a real tap from the click that fires after a long press completes.
 *
 * Both touch and mouse are wired: touch for phones, mouse so the gesture is reachable on desktop
 * and in tests. `onCancel` fires when the press is abandoned (finger moved away, pointer left the
 * element), which matters because a long-press that turns into a scroll must not fire.
 */
export function useLongPress(onLongPress: () => void, enabled = true) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggered = useRef(false)

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const start = useCallback(() => {
    if (!enabled) return
    triggered.current = false
    clear()
    timer.current = setTimeout(() => {
      triggered.current = true
      triggerHaptic('medium')
      onLongPress()
    }, LONG_PRESS_MS)
  }, [enabled, onLongPress, clear])

  /** True if the press just completed as a long press — call from onClick to suppress the tap. */
  const didLongPress = useCallback(() => triggered.current, [])

  return {
    didLongPress,
    handlers: {
      onTouchStart: start,
      onTouchEnd: clear,
      onTouchCancel: clear,
      onTouchMove: clear,
      onMouseDown: start,
      onMouseUp: clear,
      onMouseLeave: clear,
    },
  }
}

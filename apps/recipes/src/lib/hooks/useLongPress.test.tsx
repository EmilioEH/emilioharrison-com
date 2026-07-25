import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { useLongPress } from './useLongPress'
import { LONG_PRESS_MS } from '../haptics'

function Probe({ onLongPress, onTap, enabled = true }: {
  onLongPress: () => void
  onTap: () => void
  enabled?: boolean
}) {
  const { handlers, didLongPress } = useLongPress(onLongPress, enabled)
  return (
    <button
      {...handlers}
      onClick={() => {
        if (didLongPress()) return
        onTap()
      }}
    >
      press me
    </button>
  )
}

describe('useLongPress', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const target = () => screen.getByText('press me')

  it('fires after the press is held long enough', () => {
    const onLongPress = vi.fn()
    render(<Probe onLongPress={onLongPress} onTap={vi.fn()} />)

    fireEvent.touchStart(target())
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS))

    expect(onLongPress).toHaveBeenCalledTimes(1)
  })

  it('does not fire on a quick tap, and the tap still works', () => {
    const onLongPress = vi.fn()
    const onTap = vi.fn()
    render(<Probe onLongPress={onLongPress} onTap={onTap} />)

    fireEvent.touchStart(target())
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS - 50))
    fireEvent.touchEnd(target())
    fireEvent.click(target())

    expect(onLongPress).not.toHaveBeenCalled()
    expect(onTap).toHaveBeenCalledTimes(1)
  })

  it('suppresses the click that follows a completed long press', () => {
    // Releasing after a long press still emits a click; without the guard the card would open
    // the recipe at the same moment the sheet appeared.
    const onLongPress = vi.fn()
    const onTap = vi.fn()
    render(<Probe onLongPress={onLongPress} onTap={onTap} />)

    fireEvent.touchStart(target())
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS))
    fireEvent.touchEnd(target())
    fireEvent.click(target())

    expect(onLongPress).toHaveBeenCalledTimes(1)
    expect(onTap).not.toHaveBeenCalled()
  })

  it('cancels when the finger moves — a scroll must not trigger it', () => {
    const onLongPress = vi.fn()
    render(<Probe onLongPress={onLongPress} onTap={vi.fn()} />)

    fireEvent.touchStart(target())
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS / 2))
    fireEvent.touchMove(target())
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS))

    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('works with a mouse so the gesture is reachable on desktop', () => {
    const onLongPress = vi.fn()
    render(<Probe onLongPress={onLongPress} onTap={vi.fn()} />)

    fireEvent.mouseDown(target())
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS))

    expect(onLongPress).toHaveBeenCalledTimes(1)
  })

  it('does nothing when disabled', () => {
    const onLongPress = vi.fn()
    render(<Probe onLongPress={onLongPress} onTap={vi.fn()} enabled={false} />)

    fireEvent.touchStart(target())
    act(() => void vi.advanceTimersByTime(LONG_PRESS_MS * 2))

    expect(onLongPress).not.toHaveBeenCalled()
  })
})

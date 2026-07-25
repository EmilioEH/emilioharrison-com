import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { ImageViewer } from './ImageViewer'

/** Builds a touch-event init with the given point coordinates, as the pinch handlers read them
 * (they only use clientX/clientY and touches.length). */
function touches(points: Array<{ x: number; y: number }>) {
  return {
    touches: points.map((p) => ({ clientX: p.x, clientY: p.y })),
  }
}

function getImage() {
  return screen.getByAltText('Recipe photo') as HTMLImageElement
}

/** Pinches from `fromGap` to `toGap` pixels apart, horizontally centred, then lifts. */
function pinch(target: Element, fromGap: number, toGap: number) {
  fireEvent.touchStart(target, touches([{ x: 0, y: 0 }, { x: fromGap, y: 0 }]))
  fireEvent.touchMove(target, touches([{ x: 0, y: 0 }, { x: toGap, y: 0 }]))
  fireEvent.touchEnd(target, touches([]))
}

describe('ImageViewer pinch-zoom', () => {
  const setup = () => {
    const { container } = render(
      <ImageViewer
        isOpen
        imageUrl="https://example.com/recipe.jpg"
        alt="Recipe photo"
        onClose={vi.fn()}
      />,
    )
    // The element carrying the touch handlers wraps the image.
    const surface = document.querySelector('.touch-none') as HTMLElement
    return { container, surface }
  }

  it('scales the image up on a pinch out', () => {
    const { surface } = setup()

    pinch(surface, 100, 200)

    expect(getImage().style.transform).toContain('scale(2)')
  })

  it('never scales below 1 — zooming out past fit clamps', () => {
    const { surface } = setup()

    pinch(surface, 200, 50)

    expect(getImage().style.transform).toContain('scale(1)')
  })

  it('recentres the image when zoomed back out to fit (regression: image left out of frame)', () => {
    // The reported bug: pinch in, pan around, pinch back out — the image returned to scale 1 but
    // kept its pan offset, stranding it off-screen with no way to drag it back (panning is only
    // enabled above scale 1). The reset was gated on `scale < 1`, which is unreachable.
    const { surface } = setup()

    pinch(surface, 100, 300) // zoom in to 3x
    expect(getImage().style.transform).toContain('scale(3)')

    // Pan while zoomed — this is what leaves the stale offset behind.
    fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(surface, { clientX: 120, clientY: -60, pointerId: 1 })
    fireEvent.pointerUp(surface, { pointerId: 1 })
    expect(getImage().style.transform).toContain('translate(120px, -60px)')

    // Zoom back out to fit.
    pinch(surface, 300, 100)

    const transform = getImage().style.transform
    expect(transform).toContain('scale(1)')
    expect(transform).toContain('translate(0px, 0px)')
  })

  it('keeps the pan offset while still zoomed in', () => {
    const { surface } = setup()

    pinch(surface, 100, 300)
    fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(surface, { clientX: 40, clientY: 25, pointerId: 1 })
    fireEvent.pointerUp(surface, { pointerId: 1 })

    // Still zoomed, so the offset is legitimate and must survive.
    pinch(surface, 300, 280)

    expect(getImage().style.transform).toContain('translate(40px, 25px)')
  })
})

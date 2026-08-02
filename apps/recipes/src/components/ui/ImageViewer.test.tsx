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
  fireEvent.touchStart(
    target,
    touches([
      { x: 0, y: 0 },
      { x: fromGap, y: 0 },
    ]),
  )
  fireEvent.touchMove(
    target,
    touches([
      { x: 0, y: 0 },
      { x: toGap, y: 0 },
    ]),
  )
  fireEvent.touchEnd(target, touches([]))
}

/** Drags one finger from `from` to `to` and lifts, as a swipe between photos does. */
function swipe(target: Element, from: { x: number; y: number }, to: { x: number; y: number }) {
  fireEvent.touchStart(target, touches([from]))
  fireEvent.touchMove(target, touches([to]))
  fireEvent.touchEnd(target, { changedTouches: [{ clientX: to.x, clientY: to.y }] })
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

describe('ImageViewer paging', () => {
  const setup = (props: Partial<React.ComponentProps<typeof ImageViewer>> = {}) => {
    const onPrev = vi.fn()
    const onNext = vi.fn()
    const onClose = vi.fn()
    render(
      <ImageViewer
        isOpen
        imageUrl="https://example.com/recipe.jpg"
        alt="Recipe photo"
        onClose={onClose}
        onPrev={onPrev}
        onNext={onNext}
        {...props}
      />,
    )
    const surface = document.querySelector('.touch-none') as HTMLElement
    return { surface, onPrev, onNext, onClose }
  }

  it('shows only the arrows it was given a handler for', () => {
    const { onNext } = setup({ onPrev: undefined })

    expect(screen.queryByLabelText('Previous photo')).toBeNull()
    fireEvent.click(screen.getByLabelText('Next photo'))
    expect(onNext).toHaveBeenCalled()
  })

  it('does not close the viewer when an arrow is tapped', () => {
    // The arrow sits on the backdrop, whose whole job is to close on click.
    const { onClose } = setup()

    fireEvent.click(screen.getByLabelText('Next photo'))

    expect(onClose).not.toHaveBeenCalled()
  })

  it('pages back and forward on a horizontal swipe', () => {
    const { surface, onPrev, onNext } = setup()

    swipe(surface, { x: 200, y: 100 }, { x: 40, y: 110 })
    expect(onNext).toHaveBeenCalledTimes(1)

    swipe(surface, { x: 40, y: 100 }, { x: 200, y: 110 })
    expect(onPrev).toHaveBeenCalledTimes(1)
  })

  it('ignores a short drag and a vertical one', () => {
    const { surface, onPrev, onNext } = setup()

    swipe(surface, { x: 100, y: 100 }, { x: 120, y: 100 }) // too short to be intentional
    swipe(surface, { x: 100, y: 40 }, { x: 130, y: 260 }) // mostly vertical

    expect(onNext).not.toHaveBeenCalled()
    expect(onPrev).not.toHaveBeenCalled()
  })

  it('pans instead of paging once the photo is zoomed in', () => {
    const { surface, onNext } = setup()

    pinch(surface, 100, 300)
    swipe(surface, { x: 200, y: 100 }, { x: 40, y: 100 })

    expect(onNext).not.toHaveBeenCalled()
  })

  it('does not close the viewer on the click that follows a swipe', () => {
    // Touch devices fire a click after the gesture; without swallowing it, every swipe would
    // land on the backdrop and dismiss the viewer the user was paging through.
    const { surface, onClose } = setup()

    swipe(surface, { x: 200, y: 100 }, { x: 40, y: 100 })
    fireEvent.click(surface)

    expect(onClose).not.toHaveBeenCalled()

    // A plain tap after that still closes.
    fireEvent.click(surface)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

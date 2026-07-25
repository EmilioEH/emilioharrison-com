import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import React from 'react'
import { ViewSkeleton } from './ViewSkeleton'

describe('ViewSkeleton', () => {
  // Several E2E specs wait on this testid; the spinner it replaced carried the same one.
  it('keeps the loading-indicator testid the previous spinner used', () => {
    render(<ViewSkeleton />)
    expect(screen.getByTestId('loading-indicator')).toBeDefined()
  })

  it('announces itself to assistive tech rather than being a silent blank region', () => {
    render(<ViewSkeleton variant="detail" />)
    const el = screen.getByTestId('loading-indicator')
    expect(el.getAttribute('aria-busy')).toBe('true')
    expect(screen.getByText('Loading…')).toBeDefined()
  })

  it('renders placeholder blocks rather than an empty container', () => {
    const { container } = render(<ViewSkeleton variant="detail" />)
    // The whole point of the change: something occupies the screen while the chunk loads.
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(3)
  })

  it.each(['detail', 'week', 'list', 'form'] as const)(
    'renders a distinct layout for the %s variant',
    (variant) => {
      const { container } = render(<ViewSkeleton variant={variant} />)
      expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    },
  )

  it('falls back to the list shape for an unrecognised variant', () => {
    // Guards the lookup: a bad variant must not render an empty screen.
    const { container } = render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <ViewSkeleton variant={'nonsense' as any} />,
    )
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })
})

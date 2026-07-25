import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { InstructionCard } from './InstructionCard'

describe('InstructionCard', () => {
  it('marks the step done when the row itself is tapped', () => {
    // The control used to be a separate 20px circle. Tapping the step text did nothing, which is
    // the natural thing to do with wet hands and a phone at arm's length.
    const onToggle = vi.fn()
    render(<InstructionCard stepNumber={1} text="Sear the steak." onToggle={onToggle} />)

    fireEvent.click(screen.getByText('Sear the steak.'))

    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('exposes the whole row as the toggle, not a small separate control', () => {
    render(<InstructionCard stepNumber={2} text="Rest for 10 minutes." onToggle={vi.fn()} />)

    const toggle = screen.getByTestId('instruction-step-toggle')
    // The tappable element contains the step text, i.e. it *is* the row.
    expect(toggle.textContent).toContain('Rest for 10 minutes.')
    expect(toggle.tagName).toBe('BUTTON')
  })

  it('reports completion state to assistive tech', () => {
    const { rerender } = render(
      <InstructionCard stepNumber={3} text="Slice thinly." onToggle={vi.fn()} />,
    )
    const toggle = screen.getByTestId('instruction-step-toggle')
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
    expect(toggle.getAttribute('aria-label')).toMatch(/mark as done/i)

    rerender(<InstructionCard stepNumber={3} text="Slice thinly." isChecked onToggle={vi.fn()} />)
    const checked = screen.getByTestId('instruction-step-toggle')
    expect(checked.getAttribute('aria-pressed')).toBe('true')
    expect(checked.getAttribute('aria-label')).toMatch(/done/i)
  })

  it('renders a non-interactive row when no toggle handler is supplied', () => {
    render(<InstructionCard stepNumber={1} text="Read only." />)

    expect(screen.queryByTestId('instruction-step-toggle')).toBeNull()
    expect(screen.getByText('Read only.')).toBeDefined()
  })

  it('renders the Smart View extras — step title and tip — through the same card', () => {
    // Smart View used to render its own prose layout with no way to check a step off. Both views
    // now share this component, so these must survive here.
    render(
      <InstructionCard
        stepNumber={1}
        title="Prep Aromatics"
        text="Mince the garlic."
        tip="Do this before heating the pan."
        onToggle={vi.fn()}
      />,
    )

    expect(screen.getByText('Prep Aromatics')).toBeDefined()
    expect(screen.getByText('Do this before heating the pan.')).toBeDefined()
    expect(screen.getByText('Mince the garlic.')).toBeDefined()
  })

  it('shows the step number, and hides it on request', () => {
    const { rerender } = render(<InstructionCard stepNumber={7} text="Plate up." />)
    expect(screen.getByText('7')).toBeDefined()

    rerender(<InstructionCard stepNumber={7} text="Plate up." hideNumber />)
    expect(screen.queryByText('7')).toBeNull()
  })
})

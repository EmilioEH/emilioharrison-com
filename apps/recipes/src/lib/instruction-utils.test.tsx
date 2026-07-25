import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import { renderHighlightedInstruction, normalizeEmphasisMarkup } from './instruction-utils'

describe('normalizeEmphasisMarkup', () => {
  it('converts <highlight> tags to markdown bold', () => {
    // Real production text: instructions rendered the tags literally to the user.
    expect(
      normalizeEmphasisMarkup(
        'Set the pork to come to <highlight>room temperature</highlight> 1 to 2 hours before.',
      ),
    ).toBe('Set the pork to come to **room temperature** 1 to 2 hours before.')
  })

  it('handles other HTML-ish emphasis variants the model might drift to', () => {
    expect(normalizeEmphasisMarkup('Stir the <b>salt</b> and <mark>pepper</mark>.')).toBe(
      'Stir the **salt** and **pepper**.',
    )
  })

  it('leaves correct markdown untouched', () => {
    expect(normalizeEmphasisMarkup('**Pat** the chicken dry.')).toBe('**Pat** the chicken dry.')
  })
})

describe('renderHighlightedInstruction', () => {
  it('renders <highlight> content as emphasis, not literal tag text', () => {
    const { container } = render(
      <>{renderHighlightedInstruction('Come to <highlight>room temperature</highlight> first.')}</>,
    )

    expect(container.textContent).not.toContain('<highlight>')
    expect(container.textContent).toBe('Come to room temperature first.')
    expect(container.querySelector('strong')?.textContent).toBe('room temperature')
  })

  it('still renders markdown bold as emphasis', () => {
    const { container } = render(<>{renderHighlightedInstruction('**Pat** the chicken dry.')}</>)
    expect(container.querySelector('strong')?.textContent).toBe('Pat')
  })

  it('returns plain text unchanged when there is no emphasis markup', () => {
    const { container } = render(<>{renderHighlightedInstruction('Preheat the oven to 350F.')}</>)
    expect(container.textContent).toBe('Preheat the oven to 350F.')
  })
})

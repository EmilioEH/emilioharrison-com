import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import BrutalCard from './BrutalCard'

const mockTheme = {
  id: 'default',
  border: 'border-2 border-black',
  shadow: 'shadow-black',
  colors: {
    card: 'bg-white',
  },
}

describe('BrutalCard', () => {
  it('renders children correctly', () => {
    render(
      <BrutalCard theme={mockTheme}>
        <p>Card Content</p>
      </BrutalCard>,
    )
    expect(screen.getByText('Card Content')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(
      <BrutalCard className="custom-class" theme={mockTheme}>
        Content
      </BrutalCard>,
    )
    // The container div should have the custom class
    const card = screen.getByText('Content').closest('div')
    expect(card).toHaveClass('custom-class')
  })
})

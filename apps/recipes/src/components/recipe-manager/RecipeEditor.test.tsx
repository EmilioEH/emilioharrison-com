import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { RecipeEditor } from './RecipeEditor'

describe('RecipeEditor', () => {
  const defaultProps = {
    recipe: {},
    onSave: vi.fn(),
    onCancel: vi.fn(),
    onDelete: vi.fn(),
  }

  it('renders header and container styles when not embedded', () => {
    const { container } = render(<RecipeEditor {...defaultProps} />)

    // Check for header title
    expect(screen.getByRole('heading', { level: 2, name: 'New Recipe' })).toBeDefined()

    // Check for Cancel button in header
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDefined()

    // Check for container classes (border, shadow, etc)
    expect(container.firstChild).toHaveClass('border', 'shadow-sm', 'bg-card')
  })

  it('hides header and removes container styles when embedded', () => {
    const { container } = render(<RecipeEditor {...defaultProps} isEmbedded={true} />)

    // Header title should be gone
    expect(screen.queryByRole('heading', { level: 2, name: 'New Recipe' })).toBeNull()

    // Cancel button should be gone (ensure there isn't another one)
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull()

    // Container should NOT have border/shadow
    expect(container.firstChild).not.toHaveClass('border', 'shadow-sm', 'bg-card')
    expect(container.firstChild).toHaveClass('space-y-4')
  })

  describe('ingredient rendering (field report: literal "undefined" lines)', () => {
    it('renders object-shaped ingredients as amount + name + prep', () => {
      render(
        <RecipeEditor
          {...defaultProps}
          recipe={{
            ingredients: [
              { name: 'flour', amount: '2 cups' },
              { name: 'garlic', amount: '4 cloves', prep: 'minced' },
            ],
          }}
        />,
      )

      const textarea = screen.getByLabelText('Ingredients (One per line)') as HTMLTextAreaElement
      expect(textarea.value).toBe('2 cups flour\n4 cloves garlic (minced)')
    })

    it('renders raw OCR *string* ingredients as-is instead of "undefined"', () => {
      // The photo-import pipeline can hand back plain strings when the structuring phase omits
      // `ingredients`; the old `${i.amount} ${i.name}` mapping turned each into the literal
      // text "undefined", which is what the user saw in place of their ingredient list.
      render(
        <RecipeEditor
          {...defaultProps}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          recipe={{ ingredients: ['1 pork tenderloin', '4 cloves garlic'] as any }}
        />,
      )

      const textarea = screen.getByLabelText('Ingredients (One per line)') as HTMLTextAreaElement
      expect(textarea.value).toBe('1 pork tenderloin\n4 cloves garlic')
      expect(textarea.value).not.toContain('undefined')
    })

    it('never emits "undefined" for malformed or empty entries', () => {
      render(
        <RecipeEditor
          {...defaultProps}
          recipe={{
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ingredients: [{ amount: '2 cups' }, null, undefined, {}, { name: 'salt' }] as any,
          }}
        />,
      )

      const textarea = screen.getByLabelText('Ingredients (One per line)') as HTMLTextAreaElement
      expect(textarea.value).not.toContain('undefined')
      // The nameless entry still surfaces its amount rather than vanishing silently.
      expect(textarea.value).toContain('2 cups')
      expect(textarea.value).toContain('salt')
    })
  })
})

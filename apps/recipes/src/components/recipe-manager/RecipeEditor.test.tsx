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
})

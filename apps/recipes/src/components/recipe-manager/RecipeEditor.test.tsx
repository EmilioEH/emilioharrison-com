import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { RecipeEditor } from './RecipeEditor'
import type { Recipe } from '../../lib/types'

// Real AiImporter drives a full photo/URL UI flow — for handleRecipeParsed tests we only care
// about what happens once it hands back a parsed result, so replace it with a button that invokes
// the callback directly with whatever payload the test set via `setNextParsedRecipe` beforehand.
const { getNextParsedRecipe, setNextParsedRecipe } = vi.hoisted(() => {
  let next: unknown = null
  return {
    getNextParsedRecipe: () => next,
    setNextParsedRecipe: (recipe: unknown) => {
      next = recipe
    },
  }
})

vi.mock('./importer/AiImporter', () => ({
  AiImporter: ({
    onRecipeParsed,
  }: {
    onRecipeParsed: (recipe: Recipe, candidateImages?: unknown[]) => void
  }) => (
    <button onClick={() => onRecipeParsed(getNextParsedRecipe() as Recipe)}>
      Simulate Parsed
    </button>
  ),
}))

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

  describe('handleRecipeParsed — client-side defense-in-depth (IMPORT-PIPELINE-V2-PLAN.md, Phase 5)', () => {
    it('passes through an already-plausible title and well-formed ingredients unchanged', () => {
      setNextParsedRecipe({
        title: 'Buzhenina',
        ingredients: [{ name: 'pork', amount: '1 lb' }],
        steps: ['Roast it.'],
      })
      render(<RecipeEditor {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: 'Simulate Parsed' }))

      expect(screen.getByLabelText('Title')).toHaveValue('Buzhenina')
      const textarea = screen.getByLabelText('Ingredients (One per line)') as HTMLTextAreaElement
      expect(textarea.value).toBe('1 lb pork')
    })

    it('salvages a clean title instead of saving self-narrating AI commentary', () => {
      // Same production pattern the server-side validation was built against — this is the
      // client's last-mile check in case a malformed result ever slips past it.
      setNextParsedRecipe({
        title:
          'Buzhenina (Incomplete Recipe Extract from Image Source - Instructions truncated). Note: remaining steps inferred.',
        ingredients: [{ name: 'pork', amount: '1 lb' }],
      })
      render(<RecipeEditor {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: 'Simulate Parsed' }))

      expect(screen.getByLabelText('Title')).toHaveValue('Buzhenina')
    })

    it('falls back to "Untitled Recipe" rather than saving an unsalvageable title', () => {
      setNextParsedRecipe({ title: 'A '.repeat(120).trim(), ingredients: [] })
      render(<RecipeEditor {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: 'Simulate Parsed' }))

      expect(screen.getByLabelText('Title')).toHaveValue('Untitled Recipe')
    })

    it('coerces raw string ingredients to objects instead of letting them render as "undefined"', () => {
      setNextParsedRecipe({
        title: 'Test Recipe',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ingredients: ['2 cups flour', '1 tsp salt'] as any,
      })
      render(<RecipeEditor {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: 'Simulate Parsed' }))

      const textarea = screen.getByLabelText('Ingredients (One per line)') as HTMLTextAreaElement
      expect(textarea.value).toBe('2 cups flour\n1 tsp salt')
      expect(textarea.value).not.toContain('undefined')
    })

    it('strips a leading description echo from steps', () => {
      const blurb = 'This is a simple weeknight dinner the whole family will enjoy.'
      setNextParsedRecipe({
        title: 'Test Recipe',
        description: blurb,
        steps: [blurb, 'Preheat the oven.', 'Bake for 20 minutes.'],
      })
      render(<RecipeEditor {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: 'Simulate Parsed' }))

      const textarea = screen.getByLabelText('Instructions (One per line)') as HTMLTextAreaElement
      expect(textarea.value).toBe('Preheat the oven.\nBake for 20 minutes.')
    })
  })
})

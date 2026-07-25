import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { IngredientRow } from './IngredientRow'

describe('IngredientRow', () => {
  const ingredient = { name: 'Steak', amount: '1 lb', prep: 'pat dry' }

  it('toggles when the row is tapped', () => {
    const onToggle = vi.fn()
    render(<IngredientRow ingredient={ingredient} onToggle={onToggle} />)

    fireEvent.click(screen.getByText('Steak'))

    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('draws no radio-style circle beside the ingredient', () => {
    // The row was always the tap target, but it rendered a bordered circle that read as a radio
    // button (pick-one) rather than a checkbox, and at 20px was under the 44px touch minimum.
    const { container } = render(<IngredientRow ingredient={ingredient} onToggle={vi.fn()} />)

    expect(container.querySelectorAll('.rounded-full').length).toBe(0)
  })

  it('reports checked state to assistive tech and shows it visually', () => {
    const { container } = render(
      <IngredientRow ingredient={ingredient} isChecked onToggle={vi.fn()} />,
    )

    expect(screen.getByTestId('ingredient-row').getAttribute('aria-pressed')).toBe('true')
    expect(container.querySelectorAll('.line-through').length).toBeGreaterThan(0)
  })

  it('still splits amount into quantity and unit columns', () => {
    render(<IngredientRow ingredient={{ name: 'Oil', amount: '2 tbsp' }} onToggle={vi.fn()} />)

    expect(screen.getByTestId('ingredient-amount').textContent).toBe('2')
    expect(screen.getByTestId('ingredient-unit').textContent).toBe('tbsp')
  })

  it('renders as plain text when there is no toggle handler', () => {
    render(<IngredientRow ingredient={ingredient} />)

    expect(screen.queryByTestId('ingredient-row')).toBeNull()
    expect(screen.getByText(/Steak/)).toBeDefined()
  })

  it.each([
    ['2 tbsp', '2', 'tbsp'],
    ['2.5 tsp', '2.5', 'tsp'],   // decimals were split as "2" + ".5 tsp"
    ['1 1/4 cups', '1 1/4', 'cups'],
    ['1/4 tsp', '1/4', 'tsp'],
    ['1 lb', '1', 'lb'],
  ])('splits %s into quantity and unit', (amount, qty, unit) => {
    render(<IngredientRow ingredient={{ name: 'X', amount }} onToggle={vi.fn()} />)
    expect(screen.getByTestId('ingredient-amount').textContent).toBe(qty)
    expect(screen.getByTestId('ingredient-unit').textContent).toBe(unit)
  })

  it('handles non-numeric amounts', () => {
    render(<IngredientRow ingredient={{ name: 'Salt', amount: 'to taste' }} onToggle={vi.fn()} />)
    expect(screen.getByTestId('ingredient-amount').textContent).toBe('\u2014')
    expect(screen.getByTestId('ingredient-unit').textContent).toBe('to taste')
  })
})

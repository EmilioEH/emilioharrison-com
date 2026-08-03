import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { Chip } from '../../ui/Chip'
import { ingredientKey } from '../../../lib/ingredient-names'
import type { Constraints } from '../../../lib/services/suggest-turns'

interface PantryPickerProps {
  options: Array<{ label: string; value: string }>
  constraints: Constraints
  onChange: (said: string, next: Constraints) => void
}

/**
 * "Anything you already have?" — taps for the usual suspects, typing for everything else.
 *
 * This is the one place in the suggester where typing comes before suggestions exist, and it is a
 * deliberate exception to the rule stated in `suggest-turns.ts`: what is in someone's fridge is a
 * fact only they know, and no list of chips can cover half a bag of spinach. The chips are drawn
 * from the real library so a tap always matches something; the text box is for the rest.
 *
 * Entirely optional. "Find me meals" sits right below it, and a waiter who insists on an inventory
 * before bringing anything is not a good waiter.
 */
export const PantryPicker: React.FC<PantryPickerProps> = ({ options, constraints, onChange }) => {
  const [typed, setTyped] = useState('')

  const has = (value: string) =>
    constraints.pantry.some((entry) => ingredientKey(entry) === ingredientKey(value))

  const toggle = (value: string) => {
    const next = has(value)
      ? constraints.pantry.filter((entry) => ingredientKey(entry) !== ingredientKey(value))
      : [...constraints.pantry, value]
    onChange(has(value) ? `Not ${value}.` : `I have ${value}.`, { ...constraints, pantry: next })
  }

  const addTyped = () => {
    const value = typed.trim()
    // A word that normalises to nothing ("!!!") would sit in the list matching nothing at all.
    if (!value || !ingredientKey(value) || has(value)) {
      setTyped('')
      return
    }
    setTyped('')
    onChange(`I have ${value}.`, { ...constraints, pantry: [...constraints.pantry, value] })
  }

  return (
    <div className="flex flex-col gap-2" data-testid="pantry-picker">
      <p className="text-xs font-medium text-muted-foreground">
        Anything you already have? (optional)
      </p>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Ingredients you already have">
        {options.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            active={has(option.value)}
            onClick={() => toggle(option.value)}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addTyped()
            }
          }}
          placeholder="…or type something else"
          aria-label="Add an ingredient you already have"
          maxLength={40}
          className="h-11 min-w-0 flex-1 rounded-full border border-border bg-secondary/50 px-4 text-sm shadow-sm transition-all focus:border-primary focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="button"
          onClick={addTyped}
          disabled={!typed.trim()}
          aria-label="Add this ingredient"
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

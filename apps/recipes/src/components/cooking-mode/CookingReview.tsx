import React, { useState } from 'react'
import { Check, Flame, MessageSquare, ChevronDown, Pencil, X, Plus } from 'lucide-react'
import { Button } from '../ui/button'
import { Stack } from '../ui/layout'
import { useStore } from '@nanostores/react'
import { $cookingSession } from '../../stores/cookingSession'
import { cn } from '@/lib/utils'

interface CookingReviewProps {
  onComplete: (data: {
    difficulty: number
    ingredientNotes: Record<number, string>
    stepNotes: Record<number, string>
    ingredientEdits: Record<number, string>
    stepEdits: Record<number, string>
  }) => void
}

export const CookingReview: React.FC<CookingReviewProps> = ({ onComplete }) => {
  const session = useStore($cookingSession)
  const recipe = session.recipe

  const [difficulty, setDifficulty] = useState<number>(0)
  const [ingredientNotes, setIngredientNotes] = useState<Record<number, string>>({})
  const [stepNotes, setStepNotes] = useState<Record<number, string>>({})

  // Edit State
  const [ingredientEdits, setIngredientEdits] = useState<Record<number, string>>({})
  const [stepEdits, setStepEdits] = useState<Record<number, string>>({})
  const [editingIngredient, setEditingIngredient] = useState<number | null>(null)
  const [editingStep, setEditingStep] = useState<number | null>(null)

  // Edit Temp State (for input field before saving)
  const [tempEditText, setTempEditText] = useState('')

  const [ingredientsOpen, setIngredientsOpen] = useState(false)
  const [stepsOpen, setStepsOpen] = useState(false)

  const handleSubmit = () => {
    onComplete({ difficulty, ingredientNotes, stepNotes, ingredientEdits, stepEdits })
  }

  if (!recipe) return null

  const difficultyLevels = [
    {
      value: 1,
      label: 'Easy',
      color: 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200',
    },
    {
      value: 2,
      label: 'Medium',
      color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200',
    },
    { value: 3, label: 'Hard', color: 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200' },
  ]

  // Ingredient Edit Handlers
  const startEditingIngredient = (idx: number, currentText: string) => {
    setEditingIngredient(idx)
    setTempEditText(ingredientEdits[idx] || currentText)
  }

  const saveIngredientEdit = (idx: number) => {
    setIngredientEdits((prev) => ({ ...prev, [idx]: tempEditText }))
    setEditingIngredient(null)
  }

  const cancelIngredientEdit = () => {
    setEditingIngredient(null)
    setTempEditText('')
  }

  // Step Edit Handlers
  const startEditingStep = (idx: number, currentText: string) => {
    setEditingStep(idx)
    setTempEditText(stepEdits[idx] || currentText)
  }

  const saveStepEdit = (idx: number) => {
    setStepEdits((prev) => ({ ...prev, [idx]: tempEditText }))
    setEditingStep(null)
  }

  const cancelStepEdit = () => {
    setEditingStep(null)
    setTempEditText('')
  }

  return (
    <Stack spacing="none" className="h-full bg-background duration-500 animate-in fade-in">
      <div className="flex-1 overflow-y-auto p-6">
        <Stack spacing="lg" className="mx-auto max-w-lg pb-10">
          <div className="flex flex-col items-center pt-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Check className="h-8 w-8 stroke-[3]" />
            </div>
            <h2 className="font-display text-3xl font-bold">All Done!</h2>
            <p className="text-muted-foreground">Record your experience for next time.</p>
          </div>

          {/* Difficulty Rating */}
          <section>
            <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest text-muted-foreground">
              <Flame className="h-4 w-4" /> Difficulty
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {difficultyLevels.map((level) => (
                <button
                  key={level.value}
                  onClick={() => setDifficulty(level.value)}
                  className={cn(
                    'flex flex-col items-center justify-center rounded-xl border-2 py-4 transition-all active:scale-95',
                    difficulty === level.value
                      ? cn(level.color, 'border-current ring-2 ring-primary ring-offset-2')
                      : 'border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/50',
                  )}
                >
                  <span className="text-lg font-bold">{level.label}</span>
                </button>
              ))}
            </div>
          </section>

          <div className="text-center font-medium text-muted-foreground">
            Need to make a note or an edit?
          </div>

          {/* Ingredient Notes & Edits Accordion */}
          <section className="rounded-xl border border-border bg-card">
            <button
              onClick={() => setIngredientsOpen(!ingredientsOpen)}
              className="flex w-full items-center justify-between p-4 transition-colors hover:bg-muted/30"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-display text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  Ingredients
                </h3>
              </div>
              <ChevronDown
                className={cn(
                  'h-5 w-5 text-muted-foreground transition-transform duration-200',
                  ingredientsOpen && 'rotate-180',
                )}
              />
            </button>
            <div
              className={cn(
                'grid transition-all duration-200 ease-in-out',
                ingredientsOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
              )}
            >
              <div className="overflow-hidden">
                <div className="border-t border-border p-4">
                  <Stack spacing="md">
                    {recipe.ingredients.map((ing, idx) => {
                      const displayText = ingredientEdits[idx] || `${ing.amount} ${ing.name}`.trim()
                      const hasNote = !!ingredientNotes[idx]
                      const isEditing = editingIngredient === idx

                      return (
                        <div
                          key={idx}
                          className="group border-b border-border/50 pb-3 last:border-0 last:pb-0"
                        >
                          {isEditing ? (
                            <div className="flex gap-2">
                              <input
                                // eslint-disable-next-line jsx-a11y/no-autofocus
                                autoFocus
                                value={tempEditText}
                                onChange={(e) => setTempEditText(e.target.value)}
                                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveIngredientEdit(idx)
                                  if (e.key === 'Escape') cancelIngredientEdit()
                                }}
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => saveIngredientEdit(idx)}
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={cancelIngredientEdit}>
                                <X className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-4">
                              <p className="flex-1 text-sm font-medium leading-normal decoration-muted-foreground/30">
                                {displayText}
                              </p>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                                onClick={() => startEditingIngredient(idx, displayText)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}

                          {/* Note Section */}
                          {!isEditing && (
                            <div className="mt-2 border-l-2 border-muted/50 pl-4">
                              {hasNote ? (
                                <textarea
                                  placeholder="Add note..."
                                  value={ingredientNotes[idx] || ''}
                                  onChange={(e) =>
                                    setIngredientNotes((p) => ({ ...p, [idx]: e.target.value }))
                                  }
                                  className="w-full rounded-md border-0 bg-transparent p-0 text-sm text-muted-foreground placeholder:text-muted-foreground/50 focus-visible:ring-0"
                                />
                              ) : (
                                <button
                                  onClick={() => setIngredientNotes((p) => ({ ...p, [idx]: '' }))}
                                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                                >
                                  <Plus className="h-3 w-3" /> Add Note
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </Stack>
                </div>
              </div>
            </div>
          </section>

          {/* Step Notes & Edits Accordion */}
          <section className="rounded-xl border border-border bg-card">
            <button
              onClick={() => setStepsOpen(!stepsOpen)}
              className="flex w-full items-center justify-between p-4 transition-colors hover:bg-muted/30"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-display text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  Instructions
                </h3>
              </div>
              <ChevronDown
                className={cn(
                  'h-5 w-5 text-muted-foreground transition-transform duration-200',
                  stepsOpen && 'rotate-180',
                )}
              />
            </button>
            <div
              className={cn(
                'grid transition-all duration-200 ease-in-out',
                stepsOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
              )}
            >
              <div className="overflow-hidden">
                <div className="border-t border-border p-4">
                  <Stack spacing="xl">
                    {recipe.steps.map((step, idx) => {
                      const displayText = stepEdits[idx] || step
                      const hasNote = !!stepNotes[idx]
                      const isEditing = editingStep === idx

                      return (
                        <div key={idx} className="group">
                          {isEditing ? (
                            <div className="flex flex-col gap-2">
                              <textarea
                                // eslint-disable-next-line jsx-a11y/no-autofocus
                                autoFocus
                                value={tempEditText}
                                onChange={(e) => setTempEditText(e.target.value)}
                                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              />
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost" onClick={cancelStepEdit}>
                                  Cancel
                                </Button>
                                <Button size="sm" onClick={() => saveStepEdit(idx)}>
                                  Save Change
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="mb-2 flex gap-3">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                                {idx + 1}
                              </span>
                              <div className="flex-1">
                                <div className="flex items-start justify-between gap-4">
                                  <p className="text-sm text-foreground/90">{displayText}</p>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                                    onClick={() => startEditingStep(idx, displayText)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                <div className="mt-2">
                                  {hasNote ? (
                                    <textarea
                                      placeholder="Add note about this step..."
                                      value={stepNotes[idx] || ''}
                                      onChange={(e) =>
                                        setStepNotes((p) => ({ ...p, [idx]: e.target.value }))
                                      }
                                      className="w-full rounded-md border border-input/50 bg-muted/20 p-2 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                                    />
                                  ) : (
                                    <button
                                      onClick={() => setStepNotes((p) => ({ ...p, [idx]: '' }))}
                                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                                    >
                                      <Plus className="h-3 w-3" /> Add Note
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </Stack>
                </div>
              </div>
            </div>
          </section>
        </Stack>
      </div>

      {/* Footer */}
      <div className="safe-area-pb border-t border-border bg-background p-4">
        <Button
          size="lg"
          className="h-14 w-full rounded-xl text-lg font-bold shadow-lg shadow-primary/20"
          onClick={handleSubmit}
          disabled={difficulty === 0}
        >
          {difficulty === 0 ? 'Select Difficulty' : 'Complete Review'}
        </Button>
      </div>
    </Stack>
  )
}

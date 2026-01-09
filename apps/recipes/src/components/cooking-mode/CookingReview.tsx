import React, { useState } from 'react'
import { Check, Flame, MessageSquare, ChevronDown } from 'lucide-react'
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
  }) => void
}

export const CookingReview: React.FC<CookingReviewProps> = ({ onComplete }) => {
  const session = useStore($cookingSession)
  const recipe = session.recipe

  const [difficulty, setDifficulty] = useState<number>(0)
  const [ingredientNotes, setIngredientNotes] = useState<Record<number, string>>({})
  const [stepNotes, setStepNotes] = useState<Record<number, string>>({})
  const [ingredientsOpen, setIngredientsOpen] = useState(false)
  const [stepsOpen, setStepsOpen] = useState(false)

  const handleSubmit = () => {
    onComplete({ difficulty, ingredientNotes, stepNotes })
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

          {/* Ingredient Notes Accordion */}
          <section className="rounded-xl border border-border bg-card">
            <button
              onClick={() => setIngredientsOpen(!ingredientsOpen)}
              className="flex w-full items-center justify-between p-4 transition-colors hover:bg-muted/30"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-display text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  Ingredient Notes
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
                  <p className="mb-4 text-sm text-muted-foreground">
                    Only add notes if you need to adjust quantities or substitutions for next time.
                  </p>
                  <Stack spacing="md">
                    {recipe.ingredients.map((ing, idx) => (
                      <div key={idx} className="group">
                        <p className="mb-1 text-sm font-medium leading-none">
                          {ing.amount} {ing.name}
                        </p>
                        <textarea
                          placeholder="Add note..."
                          value={ingredientNotes[idx] || ''}
                          onChange={(e) =>
                            setIngredientNotes((p) => ({ ...p, [idx]: e.target.value }))
                          }
                          className="min-h-[60px] w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                        />
                      </div>
                    ))}
                  </Stack>
                </div>
              </div>
            </div>
          </section>

          {/* Step Notes Accordion */}
          <section className="rounded-xl border border-border bg-card">
            <button
              onClick={() => setStepsOpen(!stepsOpen)}
              className="flex w-full items-center justify-between p-4 transition-colors hover:bg-muted/30"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-display text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  Step Notes
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
                  <p className="mb-4 text-sm text-muted-foreground">
                    Only add notes if a step needs clarification or took longer than expected.
                  </p>
                  <Stack spacing="xl">
                    {recipe.steps.map((step, idx) => (
                      <div key={idx} className="group">
                        <div className="mb-2 flex gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                            {idx + 1}
                          </span>
                          <p className="line-clamp-2 text-sm text-foreground/80">{step}</p>
                        </div>
                        <textarea
                          placeholder={`Add note...`}
                          value={stepNotes[idx] || ''}
                          onChange={(e) => setStepNotes((p) => ({ ...p, [idx]: e.target.value }))}
                          className="min-h-[60px] w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                        />
                      </div>
                    ))}
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

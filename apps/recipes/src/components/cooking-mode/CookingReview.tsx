import React, { useState, useRef } from 'react'
import {
  Check,
  Flame,
  MessageSquare,
  ChevronDown,
  Pencil,
  X,
  Plus,
  FileEdit,
  Star,
  Camera,
} from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardHeader, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { Stack, Inline } from '../ui/layout'
import { useStore } from '@nanostores/react'
import { $cookingSession } from '../../stores/cookingSession'
import { cn } from '@/lib/utils'

interface CookingReviewProps {
  onComplete: (data: {
    difficulty: number
    rating: number
    finishedPhoto?: string
    ingredientNotes: Record<number, string>
    stepNotes: Record<number, string>
    ingredientEdits: Record<number, string>
    stepEdits: Record<number, string>
  }) => void
  onSkip?: () => void
}

export const CookingReview: React.FC<CookingReviewProps> = ({ onComplete, onSkip }) => {
  const session = useStore($cookingSession)
  const recipe = session.recipe

  const [difficulty, setDifficulty] = useState<number>(0)
  const [rating, setRating] = useState<number>(0)
  const [finishedPhoto, setFinishedPhoto] = useState<string | null>(null)
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

  const photoInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      // Convert to base64 for preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setFinishedPhoto(reader.result as string)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Failed to read photo:', error)
    }
  }

  const handleSubmit = () => {
    onComplete({
      difficulty,
      rating,
      finishedPhoto: finishedPhoto || undefined,
      ingredientNotes,
      stepNotes,
      ingredientEdits,
      stepEdits,
    })
  }

  if (!recipe) return null

  const difficultyLevels = [
    {
      value: 1,
      label: 'Easy',
      variant: 'outline' as const,
      accentClass: 'border-green-500/20 hover:bg-green-50/50 hover:border-green-500/40',
    },
    {
      value: 2,
      label: 'Medium',
      variant: 'outline' as const,
      accentClass: 'border-yellow-500/20 hover:bg-yellow-50/50 hover:border-yellow-500/40',
    },
    {
      value: 3,
      label: 'Hard',
      variant: 'outline' as const,
      accentClass: 'border-red-500/20 hover:bg-red-50/50 hover:border-red-500/40',
    },
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
        <Stack spacing="xl" className="mx-auto max-w-lg pb-10">
          <Stack spacing="md" className="items-center pt-8 text-center">
            <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Check className="h-10 w-10 stroke-[3]" />
            </div>
            <h2 className="font-display text-3xl font-bold text-foreground">All Done!</h2>
            <p className="text-base text-muted-foreground">Record your experience for next time.</p>
          </Stack>

          {/* Difficulty Rating */}
          <Stack spacing="md" as="section">
            <Inline spacing="sm" className="font-display text-xl font-bold text-foreground">
              <Flame className="h-5 w-5" />
              <span>Difficulty</span>
            </Inline>
            <div className="grid grid-cols-3 gap-3">
              {difficultyLevels.map((level) => (
                <button
                  key={level.value}
                  onClick={() => setDifficulty(level.value)}
                  className={cn(
                    'flex flex-col items-center justify-center rounded-lg border-2 py-4 transition-all duration-200 active:scale-95',
                    difficulty === level.value
                      ? 'scale-105 border-primary bg-primary/5 shadow-sm ring-2 ring-primary ring-offset-2'
                      : cn('border-border bg-card', level.accentClass),
                  )}
                >
                  <span className="text-base font-semibold">{level.label}</span>
                </button>
              ))}
            </div>
          </Stack>

          {/* Star Rating */}
          <Stack spacing="md" as="section">
            <Inline spacing="sm" className="font-display text-xl font-bold text-foreground">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <span>Recipe Rating</span>
            </Inline>
            <Inline justify="center" spacing="sm">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="transition-transform active:scale-95"
                  type="button"
                >
                  <Star
                    className={cn(
                      'h-8 w-8',
                      star <= rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-border text-border',
                    )}
                  />
                </button>
              ))}
            </Inline>
          </Stack>

          {/* Finished Dish Photo */}
          <Stack spacing="md" as="section">
            <Inline spacing="sm" className="font-display text-xl font-bold text-foreground">
              <Camera className="h-5 w-5" />
              <span>Finished Dish (Optional)</span>
            </Inline>

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoUpload}
            />

            {finishedPhoto ? (
              <div className="relative overflow-hidden rounded-lg">
                <img
                  src={finishedPhoto}
                  alt="Finished dish"
                  className="w-full rounded-lg object-cover"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFinishedPhoto(null)}
                  className="mt-2 w-full"
                >
                  <X className="h-4 w-4" />
                  Remove Photo
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="lg"
                onClick={() => photoInputRef.current?.click()}
                className="w-full"
              >
                <Camera />
                Add Photo
              </Button>
            )}
          </Stack>

          <Inline
            spacing="sm"
            justify="center"
            className="font-display text-base font-semibold text-foreground"
          >
            <FileEdit className="h-4 w-4" />
            <span>Need to make a note or an edit?</span>
          </Inline>

          {/* Ingredient Notes & Edits Accordion */}
          <Card>
            <CardHeader
              role="button"
              tabIndex={0}
              className="cursor-pointer p-4 transition-colors hover:bg-muted/20 focus-visible:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              onClick={() => setIngredientsOpen(!ingredientsOpen)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setIngredientsOpen(!ingredientsOpen)
                }
              }}
            >
              <Inline justify="between" spacing="none">
                <Inline spacing="sm">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-display text-sm font-bold uppercase tracking-widest text-muted-foreground">
                    Ingredients
                  </h3>
                </Inline>
                <ChevronDown
                  className={cn(
                    'h-5 w-5 text-muted-foreground transition-transform duration-200',
                    ingredientsOpen && 'rotate-180',
                  )}
                />
              </Inline>
            </CardHeader>
            <div
              className={cn(
                'grid transition-all duration-200 ease-in-out',
                ingredientsOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
              )}
            >
              <div className="overflow-hidden">
                <CardContent className="border-t border-border p-4">
                  <Stack spacing="md">
                    {recipe.ingredients.map((ing, idx) => {
                      const displayText = ingredientEdits[idx] || `${ing.amount} ${ing.name}`.trim()
                      const hasNote = idx in ingredientNotes
                      const isEditing = editingIngredient === idx

                      return (
                        <div
                          key={idx}
                          className="group border-b border-border/50 pb-3 last:border-0 last:pb-0"
                        >
                          {isEditing ? (
                            <div className="rounded-md bg-muted/20 p-2">
                              <Inline spacing="sm">
                                <Input
                                  // eslint-disable-next-line jsx-a11y/no-autofocus
                                  autoFocus
                                  value={tempEditText}
                                  onChange={(e) => setTempEditText(e.target.value)}
                                  className="flex-1"
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
                              </Inline>
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setIngredientNotes((p) => ({ ...p, [idx]: '' }))}
                                  className="h-auto p-0 text-xs font-medium text-primary hover:text-primary/80"
                                >
                                  <Plus className="h-3 w-3" /> Add Note
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </Stack>
                </CardContent>
              </div>
            </div>
          </Card>

          {/* Step Notes & Edits Accordion */}
          <Card>
            <CardHeader
              role="button"
              tabIndex={0}
              className="cursor-pointer p-4 transition-colors hover:bg-muted/20 focus-visible:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              onClick={() => setStepsOpen(!stepsOpen)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setStepsOpen(!stepsOpen)
                }
              }}
            >
              <Inline justify="between" spacing="none">
                <Inline spacing="sm">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-display text-sm font-bold uppercase tracking-widest text-muted-foreground">
                    Instructions
                  </h3>
                </Inline>
                <ChevronDown
                  className={cn(
                    'h-5 w-5 text-muted-foreground transition-transform duration-200',
                    stepsOpen && 'rotate-180',
                  )}
                />
              </Inline>
            </CardHeader>
            <div
              className={cn(
                'grid transition-all duration-200 ease-in-out',
                stepsOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
              )}
            >
              <div className="overflow-hidden">
                <CardContent className="border-t border-border p-4">
                  <Stack spacing="xl">
                    {recipe.steps.map((step, idx) => {
                      const displayText = stepEdits[idx] || step
                      const hasNote = idx in stepNotes
                      const isEditing = editingStep === idx

                      return (
                        <div key={idx} className="group">
                          {isEditing ? (
                            <Stack spacing="sm" className="rounded-md bg-muted/20 p-3">
                              <textarea
                                // eslint-disable-next-line jsx-a11y/no-autofocus
                                autoFocus
                                value={tempEditText}
                                onChange={(e) => setTempEditText(e.target.value)}
                                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              />
                              <Inline justify="end" spacing="sm">
                                <Button size="sm" variant="ghost" onClick={cancelStepEdit}>
                                  Cancel
                                </Button>
                                <Button size="sm" onClick={() => saveStepEdit(idx)}>
                                  Save Change
                                </Button>
                              </Inline>
                            </Stack>
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
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setStepNotes((p) => ({ ...p, [idx]: '' }))}
                                      className="h-auto p-0 text-xs font-medium text-primary hover:text-primary/80"
                                    >
                                      <Plus className="h-3 w-3" /> Add Note
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </Stack>
                </CardContent>
              </div>
            </div>
          </Card>
        </Stack>
      </div>

      {/* Footer */}
      <div className="safe-area-pb border-t border-border bg-background p-4 pb-12">
        <Stack spacing="sm">
          <Button
            size="lg"
            className="h-14 w-full rounded-xl text-lg font-bold shadow-lg shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleSubmit}
            disabled={difficulty === 0 || rating === 0}
          >
            {difficulty === 0
              ? 'Select Difficulty'
              : rating === 0
                ? 'Select Rating'
                : 'Complete Review'}
          </Button>
          {onSkip && (
            <Button
              variant="ghost"
              size="lg"
              className="h-12 w-full text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              onClick={onSkip}
            >
              Skip
            </Button>
          )}
        </Stack>
      </div>
    </Stack>
  )
}

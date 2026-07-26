import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Plus, RotateCw, Check, Pencil } from 'lucide-react'
import { cn } from '../../../lib/utils'
import type { Recipe } from '../../../lib/types'
import {
  PROTEIN_OPTIONS,
  DISH_TYPE_OPTIONS,
  CUISINE_OPTIONS,
  DIFFICULTY_OPTIONS,
  TIME_OPTIONS,
  describeFacets,
  type RecipeFacets,
} from '../../../lib/recipe-facets'

interface Suggestion {
  recipeId: string
  reason: string
}

interface MealSuggesterProps {
  allRecipes: Recipe[]
  /** Already on the plan for this week — never suggested, and used to balance what comes next. */
  plannedIds: string[]
  onAdd: (recipeId: string) => Promise<void> | void
  onOpenRecipe?: (recipe: Recipe) => void
}

/**
 * Moods, not filters. The cook may not be able to name what they want — tapping is pointing,
 * which is easier than describing, and the text box is there for when they do have the words.
 * Multi-select, because "quick" and "comforting" is a perfectly ordinary thing to want.
 */
const MOODS = [
  'something new',
  'quick weeknights',
  'comforting',
  'light and fresh',
  'feeding people',
  'use up what we have',
  'not much effort',
  'worth the effort',
]

const COUNTS = [3, 4, 5, 6, 7]

const apiBase = () =>
  import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`

const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

const Chip: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({
  label,
  active,
  onClick,
}) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={cn(
      'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
      active
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground',
    )}
  >
    {label}
  </button>
)

/**
 * One turn of the exchange.
 *
 * An answered step collapses to its answer and stays on screen, so the whole thing reads back like
 * a conversation — and any earlier answer can be reopened without starting over.
 */
const Step: React.FC<{
  title: string
  summary?: string
  open: boolean
  onReopen: () => void
  children: React.ReactNode
}> = ({ title, summary, open, onReopen, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
    className="border-t border-border/60 pt-3 first:border-t-0 first:pt-0"
  >
    {open ? (
      <>
        <p className="mb-2 text-sm font-semibold text-foreground">{title}</p>
        {children}
      </>
    ) : (
      <button
        type="button"
        onClick={onReopen}
        className="flex w-full items-baseline justify-between gap-3 py-1 text-left"
      >
        <span className="shrink-0 text-sm text-muted-foreground">{title}</span>
        <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
          <span className="truncate">{summary || 'Anything'}</span>
          <Pencil className="h-3 w-3 shrink-0 text-muted-foreground" />
        </span>
      </button>
    )}
  </motion.div>
)

/**
 * Suggests meals for the week from the cook's own library.
 *
 * Modelled on asking a waiter rather than filling in a filter: say roughly what you feel like, get
 * a few things back with a reason for each, keep the ones you want and ask for others.
 *
 * It asks one thing at a time and leaves each answer on screen, so the exchange reads like a
 * conversation rather than a form — but every answer is a tap, not a sentence, because the cook
 * usually cannot name what they want. Because keeping happens a batch at a time, each new round is
 * chosen against what has already been banked: take a stew and a pasta, ask for more, and it
 * should stop offering heavy dinners.
 *
 * Closed until asked for. Most visits to the planner are not "decide the whole week from scratch",
 * and a permanently expanded form at the top of the plan is in the way the rest of the time.
 */
export const MealSuggester: React.FC<MealSuggesterProps> = ({
  allRecipes,
  plannedIds,
  onAdd,
  onOpenRecipe,
}) => {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  const [wanted, setWanted] = useState(4)
  const [moods, setMoods] = useState<string[]>([])
  const [freeText, setFreeText] = useState('')
  const [proteins, setProteins] = useState<string[]>([])
  const [dishTypes, setDishTypes] = useState<string[]>([])
  const [cuisines, setCuisines] = useState<string[]>([])
  const [difficulties, setDifficulties] = useState<string[]>([])
  const [timeId, setTimeId] = useState<string>('any')

  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [kept, setKept] = useState<string[]>([])
  const [rejected, setRejected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [asked, setAsked] = useState(false)
  const [degraded, setDegraded] = useState(false)

  const byId = React.useMemo(() => new Map(allRecipes.map((r) => [r.id, r])), [allRecipes])
  const stillNeeded = Math.max(0, wanted - kept.length)

  const facets: RecipeFacets = {
    proteins,
    dishTypes,
    cuisines,
    difficulties,
    maxMinutes: TIME_OPTIONS.find((t) => t.id === timeId)?.maxMinutes ?? null,
  }
  const moodText = [...moods, freeText.trim()].filter(Boolean).join(', ')
  const narrowed = describeFacets(facets)

  const ask = async (opts: { rejectCurrent?: boolean } = {}) => {
    setLoading(true)
    setError(null)
    setAsked(true)
    setStep(-1) // every step collapses once there are suggestions to look at

    const nextRejected = opts.rejectCurrent
      ? [...rejected, ...suggestions.map((s) => s.recipeId)]
      : rejected
    if (opts.rejectCurrent) setRejected(nextRejected)

    try {
      const res = await fetch(`${apiBase()}api/week/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wanted: Math.max(1, stillNeeded || wanted),
          mood: moodText,
          facets,
          keptIds: [...plannedIds, ...kept],
          rejectedIds: nextRejected,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not get suggestions.')

      setDegraded(Boolean(data.degraded))
      setSuggestions(data.suggestions ?? [])
      if (!data.suggestions?.length) {
        setError(
          data.exhausted
            ? "That's everything that fits — try widening what you asked for."
            : 'Nothing came back. Try loosening a choice above.',
        )
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  const keep = async (recipeId: string) => {
    setKept((prev) => [...prev, recipeId])
    setSuggestions((prev) => prev.filter((s) => s.recipeId !== recipeId))
    await onAdd(recipeId)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="meal-suggester-open"
        className="mx-4 mb-4 flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card font-medium text-foreground shadow-sm transition-all hover:border-primary/50 hover:bg-accent/50 hover:shadow-md active:scale-[0.98]"
      >
        <Sparkles className="h-4 w-4 text-primary" />
        Help me pick this week
      </button>
    )
  }

  const facetGroups = [
    { label: 'Protein', options: PROTEIN_OPTIONS, selected: proteins, set: setProteins },
    { label: 'Dish', options: DISH_TYPE_OPTIONS, selected: dishTypes, set: setDishTypes },
    { label: 'Cuisine', options: CUISINE_OPTIONS, selected: cuisines, set: setCuisines },
    { label: 'Effort', options: DIFFICULTY_OPTIONS, selected: difficulties, set: setDifficulties },
  ]

  return (
    <section
      className="mx-4 mb-4 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm"
      data-testid="meal-suggester"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-display text-lg font-bold text-foreground">Help me pick</h3>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Close
        </button>
      </div>

      <Step
        title="How many meals?"
        summary={`${wanted} meals`}
        open={step === 0}
        onReopen={() => setStep(0)}
      >
        <div className="flex gap-1.5">
          {COUNTS.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={wanted === n}
              onClick={() => {
                setWanted(n)
                setStep(1)
              }}
              className={cn(
                'h-11 w-11 rounded-full border text-sm font-bold transition-colors',
                wanted === n
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground',
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </Step>

      {(step >= 1 || asked) && (
        <Step
          title="What are you feeling?"
          summary={moodText}
          open={step === 1}
          onReopen={() => setStep(1)}
        >
          <div className="mb-2 flex flex-wrap gap-1.5">
            {MOODS.map((m) => (
              <Chip
                key={m}
                label={m}
                active={moods.includes(m)}
                onClick={() => setMoods((prev) => toggle(prev, m))}
              />
            ))}
          </div>
          <input
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="Or say it in your own words"
            aria-label="Describe what you feel like"
            className="mb-2 h-11 w-full rounded-lg border border-border bg-secondary/50 px-3 text-sm transition-all focus:border-primary focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            type="button"
            onClick={() => setStep(2)}
            className="h-11 rounded-lg text-sm font-semibold text-primary"
          >
            Next
          </button>
        </Step>
      )}

      {(step >= 2 || asked) && (
        <Step
          title="Anything specific?"
          summary={narrowed}
          open={step === 2}
          onReopen={() => setStep(2)}
        >
          <div className="flex flex-col gap-3">
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Time
              </p>
              <div className="flex flex-wrap gap-1.5">
                {TIME_OPTIONS.map((t) => (
                  <Chip
                    key={t.id}
                    label={t.label}
                    active={timeId === t.id}
                    onClick={() => setTimeId(t.id)}
                  />
                ))}
              </div>
            </div>

            {facetGroups.map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {group.options.map((option) => (
                    <Chip
                      key={option}
                      label={option}
                      active={group.selected.includes(option)}
                      onClick={() => group.set((prev) => toggle(prev, option))}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Step>
      )}

      {kept.length > 0 && (
        <p className="text-sm text-muted-foreground">
          <Check className="mr-1 inline h-3.5 w-3.5 text-primary" />
          {kept.length} added
          {stillNeeded > 0 ? ` · ${stillNeeded} to go` : ' · that’s the week'}
        </p>
      )}

      {!asked && step >= 1 && (
        <button
          type="button"
          onClick={() => ask()}
          disabled={loading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground disabled:opacity-40"
        >
          <Sparkles className="h-4 w-4" />
          {step === 2 ? 'Find me meals' : 'Just suggest something'}
        </button>
      )}

      {loading && (
        <p className="py-3 text-center text-sm text-muted-foreground" role="status">
          Looking through your recipes…
        </p>
      )}

      {error && !loading && <p className="text-sm text-muted-foreground">{error}</p>}

      <AnimatePresence initial={false}>
        {!loading &&
          suggestions.map((suggestion) => {
            const recipe = byId.get(suggestion.recipeId)
            if (!recipe) return null
            const minutes = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0)
            return (
              <motion.div
                key={suggestion.recipeId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                className="rounded-lg border border-border bg-background p-3"
              >
                <button
                  type="button"
                  onClick={() => onOpenRecipe?.(recipe)}
                  className="block w-full text-left"
                >
                  <p className="font-display font-bold leading-tight text-foreground">
                    {recipe.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {minutes > 0 && `${minutes} min`}
                    {recipe.protein && ` · ${recipe.protein}`}
                  </p>
                  {suggestion.reason && (
                    <p className="mt-1.5 text-sm italic text-muted-foreground">
                      {suggestion.reason}
                    </p>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => keep(suggestion.recipeId)}
                  className="mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-border font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-accent/50"
                >
                  <Plus className="h-4 w-4" />
                  Add to week
                </button>
              </motion.div>
            )
          })}
      </AnimatePresence>

      {asked && !loading && (
        <button
          type="button"
          onClick={() => ask({ rejectCurrent: suggestions.length > 0 })}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <RotateCw className="h-4 w-4" />
          {suggestions.length ? 'Show me others' : 'Try again'}
        </button>
      )}

      {degraded && !loading && suggestions.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Based on your history — the assistant was unavailable.
        </p>
      )}
    </section>
  )
}

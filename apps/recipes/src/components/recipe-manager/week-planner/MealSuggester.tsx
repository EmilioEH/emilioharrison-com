import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Plus, RotateCw, Check } from 'lucide-react'
import { cn } from '../../../lib/utils'
import type { Recipe } from '../../../lib/types'

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
 */
const MOODS = [
  'something new',
  'quick weeknights',
  'cold and rainy',
  'feeding people',
  'light and fresh',
  'use up what we have',
]

const COUNTS = [3, 4, 5, 6, 7]

const apiBase = () =>
  import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`

/**
 * Suggests meals for the week from the cook's own library.
 *
 * Modelled on asking a waiter rather than filling in a filter: say roughly what you feel like, get
 * a few things back with a reason for each, keep the ones you want and ask for others. Because the
 * keeping happens a batch at a time, each new round is chosen against what has already been
 * banked — take a stew and a pasta, ask for more, and it should stop offering heavy dinners.
 */
export const MealSuggester: React.FC<MealSuggesterProps> = ({
  allRecipes,
  plannedIds,
  onAdd,
  onOpenRecipe,
}) => {
  const [wanted, setWanted] = useState(4)
  const [mood, setMood] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [kept, setKept] = useState<string[]>([])
  const [rejected, setRejected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [started, setStarted] = useState(false)
  const [degraded, setDegraded] = useState(false)

  const byId = React.useMemo(
    () => new Map(allRecipes.map((r) => [r.id, r])),
    [allRecipes],
  )
  const stillNeeded = Math.max(0, wanted - kept.length)

  const ask = async (opts: { rejectCurrent?: boolean } = {}) => {
    setLoading(true)
    setError(null)
    setStarted(true)

    // Asking for more means passing over what is on screen — don't offer it again.
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
          mood,
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
            ? "That's everything in your library for now."
            : 'Nothing came back — try describing it differently.',
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

  return (
    <section
      className="mx-4 mb-4 rounded-xl border border-border bg-card p-4 shadow-sm"
      data-testid="meal-suggester"
    >
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="font-display text-lg font-bold text-foreground">Help me pick</h3>
      </div>

      <p id="meal-count-label" className="mb-1.5 text-sm font-medium text-foreground">
        How many meals this week?
      </p>
      <div className="mb-4 flex gap-1.5" role="group" aria-labelledby="meal-count-label">
        {COUNTS.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={wanted === n}
            onClick={() => setWanted(n)}
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

      <label htmlFor="meal-mood" className="mb-1.5 block text-sm font-medium text-foreground">
        What are you in the mood for?
      </label>
      <input
        id="meal-mood"
        value={mood}
        onChange={(e) => setMood(e.target.value)}
        placeholder="Optional — say anything"
        className="mb-2 h-11 w-full rounded-lg border border-border bg-secondary/50 px-3 text-sm transition-all focus:border-primary focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {MOODS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMood(m)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              mood === m
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground',
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {kept.length > 0 && (
        <p className="mb-3 text-sm text-muted-foreground">
          <Check className="mr-1 inline h-3.5 w-3.5 text-primary" />
          {kept.length} added
          {stillNeeded > 0 ? ` · ${stillNeeded} to go` : ' · that’s the week'}
        </p>
      )}

      {!started && (
        <button
          type="button"
          onClick={() => ask()}
          disabled={loading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground disabled:opacity-40"
        >
          <Sparkles className="h-4 w-4" />
          Suggest meals
        </button>
      )}

      {loading && (
        <p className="py-4 text-center text-sm text-muted-foreground" role="status">
          Looking through your recipes…
        </p>
      )}

      {error && !loading && <p className="py-2 text-sm text-muted-foreground">{error}</p>}

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
                className="mb-2 rounded-lg border border-border bg-background p-3"
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

      {started && !loading && (
        <button
          type="button"
          onClick={() => ask({ rejectCurrent: suggestions.length > 0 })}
          className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <RotateCw className="h-4 w-4" />
          {suggestions.length ? 'Show me others' : 'Try again'}
        </button>
      )}

      {degraded && !loading && suggestions.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Suggestions are based on your history — the assistant was unavailable.
        </p>
      )}
    </section>
  )
}

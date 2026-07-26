import React, { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Plus, X, Check, Send } from 'lucide-react'
import { Chip } from '../../ui/Chip'
import { ConstraintBar } from './ConstraintBar'
import { apiBase } from '../../../lib/routes'
import {
  emptyConstraints,
  openingTurn,
  MIN_WANTED,
  MAX_WANTED,
  type Constraints,
  type ConversationEntry,
  type Turn,
  type Widget,
} from '../../../lib/services/suggest-turns'
import type { Recipe } from '../../../lib/types'

interface SuggesterConversationProps {
  allRecipes: Recipe[]
  /** Already on the plan for this week — never suggested, and used to balance what comes next. */
  plannedIds: string[]
  /** Resolves `false` when the add failed, so the card can be put back. */
  onAdd: (recipeId: string) => Promise<boolean | void> | boolean | void
  onRemoveFromWeek?: (recipeId: string) => Promise<unknown>
  onOpenRecipe?: (recipe: Recipe) => void
  onDone?: () => void
  /** A turn fetched before the screen opened, so it opens on a question rather than a spinner. */
  prefetched?: Turn | null
}

/** One thing that happened, in order. Taps collapse to their answer; typing gets its own bubble. */
type Row =
  | { kind: 'app'; turn: Turn; answered?: string }
  | { kind: 'cook'; said: string }
  | { kind: 'added'; recipeId: string; title: string }

export const SuggesterConversation: React.FC<SuggesterConversationProps> = ({
  allRecipes,
  plannedIds,
  onAdd,
  onRemoveFromWeek,
  onOpenRecipe,
  onDone,
  prefetched,
}) => {
  const byId = React.useMemo(() => new Map(allRecipes.map((r) => [r.id, r])), [allRecipes])

  const [constraints, setConstraints] = useState<Constraints>(() => ({
    ...emptyConstraints(),
    keptIds: [...plannedIds],
  }))
  const [rows, setRows] = useState<Row[]>(() => [
    { kind: 'app', turn: prefetched ?? openingTurn(plannedIds.length) },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [exhausted, setExhausted] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)

  /** Once a real suggestion has been made, typing is worth offering. Not before — there is
    * nothing concrete to react to yet, and "too much chicken" needs three chickens first. */
  const composerOpen = rows.some(
    (row) => row.kind === 'app' && row.turn.widgets.some((w) => w.kind === 'recipes'),
  )

  const keptCount = constraints.keptIds.length - plannedIds.length
  const stillNeeded = Math.max(0, constraints.wanted - keptCount)

  useEffect(() => {
    if (stickToBottom.current) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [rows, loading])

  const onScroll = () => {
    const el = scrollerRef.current
    if (!el) return
    // Don't yank the cook back down if they've scrolled up to re-read something.
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  /** Summarise a turn's offers for replay, so "not the second one" has something to resolve to. */
  const describeOffer = useCallback(
    (turn: Turn): string[] | undefined => {
      const picks = turn.widgets.find((w) => w.kind === 'recipes')
      if (!picks || picks.kind !== 'recipes') return undefined
      return picks.picks.map(({ recipeId }) => {
        const recipe = byId.get(recipeId)
        if (!recipe) return recipeId
        const minutes = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0)
        const facts: string[] = []
        if (recipe.protein) facts.push(recipe.protein)
        if (minutes) facts.push(`${minutes}m`)
        return facts.length ? `${recipe.title} (${facts.join(', ')})` : recipe.title
      })
    },
    [byId],
  )

  const conversationForServer = useCallback(
    (extra?: ConversationEntry): ConversationEntry[] => {
      const history: ConversationEntry[] = []
      for (const row of rows) {
        if (row.kind === 'app') {
          history.push({ role: 'app', said: row.turn.say, offered: describeOffer(row.turn) })
          if (row.answered) history.push({ role: 'cook', said: row.answered })
        } else if (row.kind === 'cook') {
          history.push({ role: 'cook', said: row.said })
        }
      }
      if (extra) history.push(extra)
      return history
    },
    [rows, describeOffer],
  )

  /**
   * Ask for the next turn.
   *
   * Previous turns stay on screen throughout — the old version replaced everything with one line
   * of grey text on every round, so the screen emptied and refilled each time.
   */
  const ask = useCallback(
    async (said: string, next: Constraints) => {
      setLoading(true)
      setError(null)
      stickToBottom.current = true

      try {
        const res = await fetch(`${apiBase()}api/week/suggest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation: conversationForServer(said ? { role: 'cook', said } : undefined),
            constraints: next,
          }),
        })
        const data = await res.json()
        if (!res.ok || !data.success) throw new Error(data.error || 'Could not get suggestions.')

        setConstraints(data.constraints ?? next)
        setExhausted(Boolean(data.exhausted))
        setRows((prev) => [...prev, { kind: 'app', turn: data.turn as Turn }])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.')
      } finally {
        setLoading(false)
      }
    },
    [conversationForServer],
  )

  /** Record the cook's answer against the turn that asked, then ask the next question. */
  const answer = (rowIndex: number, said: string, next: Constraints) => {
    setRows((prev) =>
      prev.map((row, i) => (i === rowIndex && row.kind === 'app' ? { ...row, answered: said } : row)),
    )
    setConstraints(next)
    void ask(said, next)
  }

  const keep = async (recipeId: string) => {
    const recipe = byId.get(recipeId)
    const next = { ...constraints, keptIds: [...constraints.keptIds, recipeId] }
    setConstraints(next)
    setRows((prev) => [
      ...prev,
      { kind: 'added', recipeId, title: recipe?.title ?? 'That one' },
    ])

    const added = await onAdd(recipeId)
    if (added === false) {
      setConstraints((prev) => ({
        ...prev,
        keptIds: prev.keptIds.filter((id) => id !== recipeId),
      }))
      setRows((prev) => prev.filter((row) => !(row.kind === 'added' && row.recipeId === recipeId)))
      setError('Couldn’t add that to the week. Try again.')
    }
  }

  const unkeep = async (recipeId: string) => {
    setConstraints((prev) => ({ ...prev, keptIds: prev.keptIds.filter((id) => id !== recipeId) }))
    setRows((prev) => prev.filter((row) => !(row.kind === 'added' && row.recipeId === recipeId)))
    await onRemoveFromWeek?.(recipeId)
  }

  /** Turning down one card is a local decision — no model call, no waiting. */
  const dismiss = (recipeId: string) => {
    setConstraints((prev) => ({ ...prev, rejectedIds: [...prev.rejectedIds, recipeId] }))
    setRows((prev) => prev.map((row) => withoutPick(row, recipeId)))
  }

  const submitTyped = () => {
    const said = typed.trim()
    if (!said || loading) return
    setTyped('')
    setRows((prev) => [...prev, { kind: 'cook', said }])
    stickToBottom.current = true
    void ask(said, constraints)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="meal-suggester">
      <ConstraintBar
        constraints={constraints}
        onRemove={(label, next) => answer(rows.length - 1, `Not ${label} after all.`, next)}
      />

      <div ref={scrollerRef} onScroll={onScroll} className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 p-4">
          {rows.map((row, index) => {
            if (row.kind === 'cook') {
              return (
                <motion.p
                  key={`cook-${index}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                  className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                  data-testid="cook-said"
                >
                  {row.said}
                </motion.p>
              )
            }

            if (row.kind === 'added') {
              return (
                <motion.div
                  key={`added-${row.recipeId}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                  className="flex items-center justify-between gap-3 text-sm text-muted-foreground"
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">Added {row.title} to the week</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => unkeep(row.recipeId)}
                    className="min-h-11 shrink-0 px-2 text-sm font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    Undo
                  </button>
                </motion.div>
              )
            }

            return (
              <TurnRow
                key={`turn-${index}`}
                turn={row.turn}
                answered={row.answered}
                byId={byId}
                constraints={constraints}
                onAnswer={(said, next) => answer(index, said, next)}
                onKeep={keep}
                onDismiss={dismiss}
                onOpenRecipe={onOpenRecipe}
                onDone={onDone}
              />
            )
          })}

          {loading && (
            <p className="text-sm text-muted-foreground" role="status" data-testid="suggester-thinking">
              Looking through your recipes…
            </p>
          )}

          {error && !loading && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}

          {exhausted && !loading && (
            <p className="text-sm text-muted-foreground">
              That’s everything that fits — take something off above to widen it.
            </p>
          )}

          {keptCount > 0 && (
            <p className="text-sm text-muted-foreground">
              {keptCount} added{stillNeeded > 0 ? ` · ${stillNeeded} to go` : ' · that’s the week'}
            </p>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {composerOpen && (
        <div className="border-t border-border bg-background px-4 pb-[env(safe-area-inset-bottom)] pt-2">
          <div className="flex items-end gap-2 pb-2">
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitTyped()}
              onFocus={() => {
                stickToBottom.current = true
                bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
              }}
              placeholder="Too heavy? Not enough veg? Say so."
              aria-label="Tell the suggester what’s wrong"
              data-testid="suggester-composer"
              className="h-11 min-w-0 flex-1 rounded-full border border-border bg-secondary/50 px-4 text-sm transition-all focus:border-primary focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="button"
              onClick={submitTyped}
              disabled={!typed.trim() || loading}
              aria-label="Send"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Drop one suggestion from a row, leaving everything else about the turn intact. */
function withoutPick(row: Row, recipeId: string): Row {
  if (row.kind !== 'app') return row
  const widgets = row.turn.widgets.map((w) =>
    w.kind === 'recipes' ? { ...w, picks: w.picks.filter((p) => p.recipeId !== recipeId) } : w,
  )
  return { ...row, turn: { ...row.turn, widgets } }
}

/** One exchange: what the app said, and whatever it put in front of the cook. */
const TurnRow: React.FC<{
  turn: Turn
  answered?: string
  byId: Map<string, Recipe>
  constraints: Constraints
  onAnswer: (said: string, next: Constraints) => void
  onKeep: (recipeId: string) => void
  onDismiss: (recipeId: string) => void
  onOpenRecipe?: (recipe: Recipe) => void
  onDone?: () => void
}> = ({ turn, answered, byId, constraints, onAnswer, onKeep, onDismiss, onOpenRecipe, onDone }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
    className="flex flex-col gap-3"
  >
    {turn.say && <p className="text-sm leading-snug text-foreground">{turn.say}</p>}

    {turn.widgets.map((widget, i) => (
      <WidgetView
        key={`${widget.kind}-${i}`}
        widget={widget}
        byId={byId}
        constraints={constraints}
        onAnswer={onAnswer}
        onKeep={onKeep}
        onDismiss={onDismiss}
        onOpenRecipe={onOpenRecipe}
        onDone={onDone}
      />
    ))}

    {answered && <p className="text-sm font-medium text-muted-foreground">{answered}</p>}
  </motion.div>
)

const WidgetView: React.FC<{
  widget: Widget
  byId: Map<string, Recipe>
  constraints: Constraints
  onAnswer: (said: string, next: Constraints) => void
  onKeep: (recipeId: string) => void
  onDismiss: (recipeId: string) => void
  onOpenRecipe?: (recipe: Recipe) => void
  onDone?: () => void
}> = ({ widget, byId, constraints, onAnswer, onKeep, onDismiss, onOpenRecipe, onDone }) => {
  switch (widget.kind) {
    case 'counter':
      return (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: MAX_WANTED - MIN_WANTED + 1 }, (_, i) => MIN_WANTED + i).map((n) => (
            <Chip
              key={n}
              label={String(n)}
              active={constraints.wanted === n}
              onClick={() => onAnswer(`${n} meals.`, { ...constraints, wanted: n })}
              className="w-11 px-0"
            />
          ))}
        </div>
      )

    case 'chips':
      return (
        <div className="flex flex-wrap gap-2">
          {widget.options.map((option) => (
            <Chip
              key={option.value}
              label={
                option.count ? (
                  <>
                    {option.label}
                    <span className="ml-1.5 text-xs opacity-60">{option.count}</span>
                  </>
                ) : (
                  option.label
                )
              }
              active={isChosen(widget.id, option.value, constraints)}
              onClick={() => {
                const next = applyChoice(widget, option.value, constraints)
                onAnswer(option.label, next)
              }}
            />
          ))}
        </div>
      )

    case 'recipes':
      return (
        <AnimatePresence initial={false}>
          {widget.picks.map((pick) => {
            const recipe = byId.get(pick.recipeId)
            if (!recipe) return null
            const minutes = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0)
            return (
              <motion.div
                key={pick.recipeId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                className="rounded-xl border border-border bg-card p-3 shadow-sm"
                data-testid="suggestion-card"
              >
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenRecipe?.(recipe)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="font-display font-bold leading-tight text-foreground">
                      {recipe.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {minutes > 0 && `${minutes} min`}
                      {recipe.protein && ` · ${recipe.protein}`}
                    </p>
                    {pick.why && (
                      <p className="mt-1.5 text-sm italic text-muted-foreground">{pick.why}</p>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDismiss(pick.recipeId)}
                    aria-label={`Not ${recipe.title}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onKeep(pick.recipeId)}
                  className="mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-border font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-accent/50"
                >
                  <Plus className="h-4 w-4" />
                  Add to week
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      )

    case 'actions':
      return (
        <div className="flex flex-wrap gap-2">
          {widget.options.map((option) => (
            <button
              key={option.intent}
              type="button"
              onClick={() => {
                if (option.intent === 'done') return onDone?.()
                onAnswer(option.label, constraints)
              }}
              className={
                option.intent === 'more'
                  ? 'flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-medium text-primary-foreground'
                  : 'flex h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground'
              }
            >
              {option.intent === 'more' && <Sparkles className="h-4 w-4" />}
              {option.label}
            </button>
          ))}
        </div>
      )

    // The persistent composer already covers typing once suggestions exist, and before that there
    // is nothing concrete to react to — so a `text` widget renders nothing rather than a second
    // input box competing with it.
    case 'text':
    default:
      return null
  }
}

const FACET_IDS = ['proteins', 'dishTypes', 'cuisines', 'difficulties'] as const
type FacetId = (typeof FACET_IDS)[number]
const isFacetId = (id: string): id is FacetId => (FACET_IDS as readonly string[]).includes(id)

function isChosen(widgetId: string, value: string, constraints: Constraints): boolean {
  if (widgetId === 'mood') return constraints.mood.includes(value)
  if (isFacetId(widgetId)) return (constraints.facets[widgetId] ?? []).includes(value)
  return false
}

/** Write a tapped option into the typed state — the only way a chip ever changes anything. */
function applyChoice(widget: Widget, value: string, constraints: Constraints): Constraints {
  if (widget.kind !== 'chips') return constraints

  if (widget.id === 'mood') {
    const mood = constraints.mood.includes(value)
      ? constraints.mood.filter((m) => m !== value)
      : [...constraints.mood, value]
    return { ...constraints, mood }
  }

  if (widget.id === 'time') {
    const byId: Record<string, number | null> = { quick: 30, medium: 60 }
    return {
      ...constraints,
      facets: { ...constraints.facets, maxMinutes: byId[value] ?? null },
    }
  }

  if (!isFacetId(widget.id)) return constraints

  const current = constraints.facets[widget.id] ?? []
  let next: string[]
  if (widget.mode === 'one') next = [value]
  else if (current.includes(value)) next = current.filter((v) => v !== value)
  else next = [...current, value]

  return { ...constraints, facets: { ...constraints.facets, [widget.id]: next } }
}

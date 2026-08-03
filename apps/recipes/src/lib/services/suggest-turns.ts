/**
 * One turn of the exchange: what the app says, what it offers, and what it now believes.
 *
 * **Generative UI from a closed vocabulary.** The model returns a typed `Turn` the client already
 * knows how to render — never markup. A strict CSP, a PWA saved to the home screen and no runtime
 * JSX compiler all rule out free-form markup, and none of the value needs it. The model choosing
 * *which question to ask and what to offer* is the whole feature; how a recipe card looks is not
 * its business.
 *
 * **Code owns the state; the model owns the question.** `Constraints` is the single source of
 * truth. Widget answers write into it, and every filter, exclusion and fallback reads it — the
 * conversation is replayed to the model for context only. A model that goes off the rails can
 * therefore produce a bad question, but never a corrupted filter. It also makes `Constraints` a
 * lossless summary of the transcript, which is what lets history replay stay capped.
 *
 * **Every offered option is grounded.** Options come back counted against the real library under
 * the constraints so far; zero-count options are dropped and a widget with nothing left to choose
 * between is dropped whole. This is the difference between feeling smart and feeling stupid: an
 * ungrounded model happily offers "Thai" to a library that has none. It is the same discipline
 * `parseSuggestions` already applied to picks, extended to the UI.
 *
 * **Taps for narrowing, words only after suggestions exist.** Before anything has been offered
 * there is nothing concrete to react to — "too much chicken" needs three chickens first — so the
 * composer stays shut and narrowing happens through grounded chips.
 *
 * The `pantry` widget is the one deliberate exception, and it is on the opening turn. What is in
 * someone's fridge is a fact only they know: no set of chips can cover half a bag of spinach, and
 * unlike a mood it is exact enough for code to filter on. It is offered, never required.
 */

import {
  PROTEIN_OPTIONS,
  DISH_TYPE_OPTIONS,
  CUISINE_OPTIONS,
  DIFFICULTY_OPTIONS,
  TIME_OPTIONS,
  matchesFacets,
  type RecipeFacets,
} from '../recipe-facets'
import { applyPantry } from './pantry-match'
import type { Recipe } from '../types'

/** The facet lists a `chips` widget may steer, and the vocabulary each is allowed to offer. */
export const FACET_VOCABULARY = {
  proteins: PROTEIN_OPTIONS,
  dishTypes: DISH_TYPE_OPTIONS,
  cuisines: CUISINE_OPTIONS,
  difficulties: DIFFICULTY_OPTIONS,
} as const

export type FacetKey = keyof typeof FACET_VOCABULARY

/** Widget ids the client renders specially. `mood` is a steer, not a filter, so it isn't counted. */
export const PANTRY_WIDGET_ID = 'pantry'
export const MOOD_WIDGET_ID = 'mood'
export const TIME_WIDGET_ID = 'time'

export type Widget =
  | {
      kind: 'chips'
      id: string
      mode: 'one' | 'many'
      options: Array<{ label: string; value: string; count?: number }>
    }
  | { kind: 'counter'; id: string; min: number; max: number; value: number }
  | { kind: 'recipes'; picks: Array<{ recipeId: string; why: string }> }
  | { kind: 'text'; id: string; placeholder: string }
  /**
   * "What have you got in?" — chips of the library's commonest ingredients, plus free text.
   *
   * A deliberate exception to "taps for narrowing, words only after suggestions exist" (see the
   * module note above): this is the one place typing genuinely comes first, because what is in
   * someone's fridge is a fact only they know and no list of chips can cover it. It is offered,
   * never required — the cook can go straight to "Find me meals".
   */
  | { kind: 'pantry'; id: string; options: Array<{ label: string; value: string }> }
  | { kind: 'actions'; options: Array<{ label: string; intent: 'more' | 'done' | 'restart' }> }

export interface Turn {
  /** One or two sentences, in the waiter's voice. */
  say: string
  widgets: Widget[]
  /** A proposed edit to the typed state. Validated before it is applied — never trusted as-is. */
  patch?: ConstraintPatch
}

export type ListPatch = { add?: string[]; remove?: string[] }

export interface ConstraintPatch {
  proteins?: ListPatch
  dishTypes?: ListPatch
  cuisines?: ListPatch
  difficulties?: ListPatch
  maxMinutes?: number | null
  excludeIds?: string[]
  wanted?: number
}

/** What the cook has decided so far. The transcript is context; this is the truth. */
export interface Constraints {
  wanted: number
  mood: string[]
  facets: RecipeFacets
  /**
   * Ingredients the cook says they already have.
   *
   * Not a facet: facets are a fixed vocabulary the model may steer, and this is free-form and
   * cook-owned. It narrows in code (see `pantry-match.ts`) rather than being handed to the model,
   * because "does this recipe use spinach" is a matter of fact and the model would only be
   * re-deriving what the ingredient lists already say.
   */
  pantry: string[]
  keptIds: string[]
  rejectedIds: string[]
}

/** One entry of replayed history. Offered recipes carry their titles so ordinals can resolve. */
export type ConversationEntry =
  | { role: 'cook'; said: string }
  | { role: 'app'; said: string; offered?: string[] }

export const MAX_WANTED = 7
export const MIN_WANTED = 1
/** Enough for the model to hear the last few exchanges; `Constraints` carries the rest losslessly. */
export const MAX_REPLAYED_TURNS = 6

export const emptyConstraints = (): Constraints => ({
  wanted: 4,
  mood: [],
  facets: { proteins: [], dishTypes: [], cuisines: [], difficulties: [], maxMinutes: null },
  pantry: [],
  keptIds: [],
  rejectedIds: [],
})

const clampWanted = (n: unknown): number =>
  Math.max(MIN_WANTED, Math.min(MAX_WANTED, Math.trunc(Number(n)) || 4))

const asStrings = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : []

/**
 * Coerce anything arriving over the wire into a well-formed `Constraints`.
 *
 * The client round-trips this object every turn, so it is untrusted input like any other body.
 */
export function sanitizeConstraints(raw: unknown): Constraints {
  const input = (raw ?? {}) as Record<string, unknown>
  const facets = (input.facets ?? {}) as Record<string, unknown>
  const maxMinutes = Number(facets.maxMinutes)

  return {
    wanted: clampWanted(input.wanted),
    mood: asStrings(input.mood).slice(0, 12),
    facets: {
      proteins: keepKnown(asStrings(facets.proteins), 'proteins'),
      dishTypes: keepKnown(asStrings(facets.dishTypes), 'dishTypes'),
      cuisines: keepKnown(asStrings(facets.cuisines), 'cuisines'),
      difficulties: keepKnown(asStrings(facets.difficulties), 'difficulties'),
      maxMinutes: Number.isFinite(maxMinutes) && maxMinutes > 0 ? maxMinutes : null,
    },
    // Free text, so capped and trimmed like the mood list beside it. Twelve is well past what
    // anyone types and far short of anything that could bloat a request.
    pantry: asStrings(input.pantry)
      .map((entry) => entry.trim().slice(0, 40))
      .filter(Boolean)
      .slice(0, 12),
    keptIds: asStrings(input.keptIds),
    rejectedIds: asStrings(input.rejectedIds),
  }
}

/** Drop anything outside the shared vocabulary, case-insensitively. */
function keepKnown(values: string[], key: FacetKey): string[] {
  const vocabulary = FACET_VOCABULARY[key] as readonly string[]
  const canonical = new Map(vocabulary.map((v) => [v.toLowerCase(), v]))
  const out: string[] = []
  for (const value of values) {
    const match = canonical.get(value.toLowerCase())
    if (match && !out.includes(match)) out.push(match)
  }
  return out
}

/**
 * Apply a model-proposed patch to the typed state.
 *
 * Everything is checked against the shared vocabulary first, so "no chicken" can only ever become
 * a constraint the app already understands and the cook can see and remove. `excludeIds` has to
 * name a real recipe. An unrecognised value is dropped rather than rejecting the whole patch — the
 * cook said something useful even if the model dressed part of it up wrong.
 */
export function applyPatch(
  constraints: Constraints,
  patch: ConstraintPatch | undefined,
  knownRecipeIds: Set<string>,
): Constraints {
  if (!patch) return constraints

  const next: Constraints = {
    ...constraints,
    facets: { ...constraints.facets },
    keptIds: [...constraints.keptIds],
    rejectedIds: [...constraints.rejectedIds],
  }

  for (const key of Object.keys(FACET_VOCABULARY) as FacetKey[]) {
    const change = patch[key]
    if (!change) continue
    const current = new Set(next.facets[key] ?? [])
    for (const value of keepKnown(asStrings(change.add), key)) current.add(value)
    for (const value of keepKnown(asStrings(change.remove), key)) current.delete(value)
    next.facets[key] = Array.from(current)
  }

  if (patch.maxMinutes === null) next.facets.maxMinutes = null
  else if (typeof patch.maxMinutes === 'number' && patch.maxMinutes > 0) {
    next.facets.maxMinutes = patch.maxMinutes
  }

  if (patch.wanted !== undefined) next.wanted = clampWanted(patch.wanted)

  for (const id of asStrings(patch.excludeIds)) {
    if (knownRecipeIds.has(id) && !next.rejectedIds.includes(id)) next.rejectedIds.push(id)
  }

  return next
}

/** Recipes still on offer: within the constraints, and not already kept or turned down. */
export function offerableUnder(recipes: Recipe[], constraints: Constraints): Recipe[] {
  const excluded = new Set([...constraints.keptIds, ...constraints.rejectedIds])
  const eligible = recipes.filter(
    (r) => !excluded.has(r.id) && matchesFacets(r, constraints.facets),
  )
  // The pantry narrows last, and only while enough survives to choose from — below the floor it
  // marks matches instead of removing anything, so it can never on its own empty the menu.
  return applyPantry(eligible, constraints.pantry).recipes
}

/** How many recipes would survive if the cook also picked `value` for `key`. */
export function countWithOption(
  recipes: Recipe[],
  constraints: Constraints,
  key: FacetKey,
  value: string,
): number {
  const widened: Constraints = {
    ...constraints,
    facets: { ...constraints.facets, [key]: [value] },
  }
  return offerableUnder(recipes, widened).length
}

/**
 * Keep only the options a cook could actually choose.
 *
 * A facet chip whose value matches nothing is worse than no chip at all: it reads as a promise the
 * library can't keep, and the cook finds out only after tapping it. A widget left with fewer than
 * two live options isn't a question, so it goes too.
 *
 * Mood and time chips pass through: mood is a steer for the model rather than a filter, and the
 * time options are a fixed, deliberately coarse vocabulary.
 */
export function groundWidgets(
  widgets: Widget[],
  recipes: Recipe[],
  constraints: Constraints,
): Widget[] {
  const out: Widget[] = []

  for (const widget of widgets) {
    if (widget.kind !== 'chips') {
      out.push(widget)
      continue
    }
    if (widget.id === MOOD_WIDGET_ID || widget.id === TIME_WIDGET_ID) {
      out.push(widget)
      continue
    }
    if (!(widget.id in FACET_VOCABULARY)) continue

    const key = widget.id as FacetKey
    const counted = widget.options
      .map((option) => ({
        ...option,
        count: countWithOption(recipes, constraints, key, option.value),
      }))
      .filter((option) => option.count > 0)

    if (counted.length >= 2) out.push({ ...widget, options: counted })
  }

  return out
}

const isListPatch = (v: unknown): v is ListPatch =>
  !!v && typeof v === 'object' && ('add' in v || 'remove' in v)

function readPatch(raw: unknown): ConstraintPatch | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const input = raw as Record<string, unknown>
  const patch: ConstraintPatch = {}

  for (const key of Object.keys(FACET_VOCABULARY) as FacetKey[]) {
    if (isListPatch(input[key])) patch[key] = input[key] as ListPatch
  }
  if (input.maxMinutes === null || typeof input.maxMinutes === 'number') {
    patch.maxMinutes = input.maxMinutes as number | null
  }
  if (input.wanted !== undefined) patch.wanted = clampWanted(input.wanted)
  if (Array.isArray(input.excludeIds)) patch.excludeIds = asStrings(input.excludeIds)

  return Object.keys(patch).length ? patch : undefined
}

const VALID_INTENTS = new Set(['more', 'done', 'restart'])

function readWidget(raw: unknown, index: string[], exclude: Set<string>): Widget | null {
  if (!raw || typeof raw !== 'object') return null
  const w = raw as Record<string, unknown>

  switch (w.kind) {
    case 'chips': {
      const options = Array.isArray(w.options) ? w.options : []
      const cleaned = options
        .map((o) => o as Record<string, unknown>)
        .filter((o) => o && typeof o.value !== 'undefined')
        .map((o) => ({ label: String(o.label ?? o.value), value: String(o.value) }))
      if (!cleaned.length) return null
      return {
        kind: 'chips',
        id: String(w.id ?? ''),
        mode: w.mode === 'one' ? 'one' : 'many',
        options: cleaned,
      }
    }
    case 'counter':
      return {
        kind: 'counter',
        id: String(w.id ?? 'wanted'),
        min: MIN_WANTED,
        max: MAX_WANTED,
        value: clampWanted(w.value),
      }
    case 'recipes': {
      // The model answers with line numbers and cannot do otherwise: anything out of range,
      // duplicated, or already kept/rejected is dropped rather than trusted.
      const picks = Array.isArray(w.picks) ? w.picks : []
      const seen = new Set<string>()
      const resolved: Array<{ recipeId: string; why: string }> = []
      for (const pick of picks) {
        const p = pick as Record<string, unknown>
        const n = typeof p.n === 'number' ? p.n : Number(p.n)
        if (!Number.isInteger(n) || n < 0 || n >= index.length) continue
        const recipeId = index[n]
        if (exclude.has(recipeId) || seen.has(recipeId)) continue
        seen.add(recipeId)
        resolved.push({ recipeId, why: String(p.why ?? '').trim() })
      }
      return resolved.length ? { kind: 'recipes', picks: resolved } : null
    }
    case 'text':
      return {
        kind: 'text',
        id: String(w.id ?? 'freeText'),
        placeholder: String(w.placeholder ?? 'Say it in your own words'),
      }
    case 'actions': {
      const options = (Array.isArray(w.options) ? w.options : [])
        .map((o) => o as Record<string, unknown>)
        .filter((o) => o && VALID_INTENTS.has(String(o.intent)))
        .map((o) => ({
          label: String(o.label ?? o.intent),
          intent: String(o.intent) as 'more' | 'done' | 'restart',
        }))
      return options.length ? { kind: 'actions', options } : null
    }
    default:
      return null
  }
}

/**
 * Turn the model's JSON into a `Turn`, discarding anything malformed.
 *
 * Returns `null` when there is nothing usable, which the endpoint treats exactly like the model
 * being unavailable — the deterministic turn answers instead. Partial rubbish is dropped widget by
 * widget rather than failing the whole turn: one bad chip group shouldn't cost the cook the reply.
 */
export function parseTurn(raw: string, index: string[], exclude: string[] = []): Turn | null {
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null

  const say = String(parsed.say ?? '').trim()
  const excluded = new Set(exclude)
  const widgets = (Array.isArray(parsed.widgets) ? parsed.widgets : [])
    .map((w) => readWidget(w, index, excluded))
    .filter((w): w is Widget => w !== null)

  if (!say && !widgets.length) return null

  const patch = readPatch(parsed.patch)
  return patch ? { say, widgets, patch } : { say, widgets }
}

/**
 * The turn to show when the model is unavailable or unusable.
 *
 * Expressed in the same contract rather than as a separate screen, so the cook still gets a
 * working exchange — the three questions the wizard used to ask, and whatever the deterministic
 * ranking picked. A blank screen is a worse failure than an unexplained pick.
 */
export function degradedTurn(picks: Array<{ recipeId: string; why: string }>): Turn {
  if (picks.length) {
    return {
      say: 'Here are a few from your library — picked from what you have cooked before.',
      widgets: [
        { kind: 'recipes', picks },
        {
          kind: 'actions',
          options: [
            { label: 'Show me others', intent: 'more' },
            { label: "That's the week", intent: 'done' },
          ],
        },
      ],
    }
  }

  return {
    say: "I couldn't find anything that fits. Try widening what you asked for.",
    widgets: [
      {
        kind: 'actions',
        options: [
          { label: 'Start over', intent: 'restart' },
          { label: 'Back to the week', intent: 'done' },
        ],
      },
    ],
  }
}

/**
 * Put the pantry question on whichever turn opens the conversation.
 *
 * `openingTurn` below is only reached when the prefetch hasn't landed; the usual first turn comes
 * from the model, which knows nothing about this widget. So the widget is attached to the opening
 * turn wherever it came from — inserted *before* the actions, since "Find me meals" is the end of
 * the screen and nothing should sit under it.
 *
 * A no-op once suggestions exist, or if the turn already carries one.
 */
export function withPantryWidget(
  turn: Turn,
  options: Array<{ label: string; value: string }>,
): Turn {
  if (!options.length) return turn
  if (turn.widgets.some((w) => w.kind === 'pantry' || w.kind === 'recipes')) return turn

  const widget: Widget = { kind: 'pantry', id: PANTRY_WIDGET_ID, options }
  const actionsAt = turn.widgets.findIndex((w) => w.kind === 'actions')
  const widgets =
    actionsAt === -1
      ? [...turn.widgets, widget]
      : [...turn.widgets.slice(0, actionsAt), widget, ...turn.widgets.slice(actionsAt)]

  return { ...turn, widgets }
}

/**
 * The opening question, rendered without a model call so the screen never opens on a spinner.
 *
 * `pantryOptions` come from the caller because they are derived from the real library
 * (`commonPantryOptions`), which this module has no reason to hold. No options means no widget —
 * an empty library has nothing to offer and shouldn't pretend otherwise.
 */
export function openingTurn(
  alreadyPlanned: number,
  pantryOptions: Array<{ label: string; value: string }> = [],
): Turn {
  const say = alreadyPlanned
    ? `You have ${alreadyPlanned} planned already. How many more meals do you need?`
    : 'How many meals do you need this week?'

  return {
    say,
    widgets: [
      { kind: 'counter', id: 'wanted', min: MIN_WANTED, max: MAX_WANTED, value: 4 },
      {
        kind: 'chips',
        id: MOOD_WIDGET_ID,
        mode: 'many',
        options: [
          'something new',
          'quick weeknights',
          'comforting',
          'light and fresh',
          'feeding people',
          // "use up what we have" used to sit here and do nothing — a mood the model could read
          // but that named no actual ingredient. The pantry widget below is that idea done
          // properly, so the decoration is gone rather than left to imply a feature.
          'not much effort',
          'worth the effort',
        ].map((m) => ({ label: m, value: m })),
      },
      ...(pantryOptions.length
        ? [{ kind: 'pantry' as const, id: PANTRY_WIDGET_ID, options: pantryOptions }]
        : []),
      { kind: 'actions', options: [{ label: 'Find me meals', intent: 'more' }] },
    ],
  }
}

/** Time chips, offered from the fixed vocabulary rather than invented. */
export function timeWidget(): Widget {
  return {
    kind: 'chips',
    id: TIME_WIDGET_ID,
    mode: 'one',
    options: TIME_OPTIONS.map((t) => ({ label: t.label, value: t.id })),
  }
}

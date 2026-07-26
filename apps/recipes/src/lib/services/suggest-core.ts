/**
 * Picking a few meals for the week, the way a waiter would.
 *
 * **Why the whole library goes to the model.** The obvious build is to filter down to a handful of
 * candidates in code and let the model choose among those — that is exactly right when the
 * selection criteria are structured, as in the USDA weight table. It is wrong here. "Something
 * comforting" does not map to `protein` or `cuisine`, so a metadata filter has to guess what
 * comforting means and can drop the best answer before the model ever sees it. A waiter who knows
 * a third of the menu is a bad waiter.
 *
 * It only works because the library is small: all 413 recipes, with the facts that matter, come to
 * roughly 8,300 tokens. One call, no retrieval, nothing lost in a pre-filter.
 *
 * **The model cannot invent a recipe.** It is given numbered lines and must answer with those
 * numbers; anything outside the range is dropped. A wrong answer is a poor suggestion from the
 * cook's own library, never a dish they do not own.
 */

import type { Recipe } from '../types'
import type { CookOutcome } from '../week-review'
import { preferenceWeight } from '../week-review'
import { describeFacets, hasFacets, type RecipeFacets } from '../recipe-facets'

/** Everything known about one recipe's history with this family. */
export interface RecipeSignal {
  outcomes: CookOutcome[]
  lastCookedWeek: string | null
  timesPlanned: number
}

export interface SuggestInput {
  recipes: Recipe[]
  signals: Record<string, RecipeSignal>
  /** How many meals are still needed. */
  wanted: number
  /** What the cook typed or tapped. May be empty. */
  mood: string
  /** Already chosen for this week — the next batch is balanced against these. */
  keptIds: string[]
  /** Already offered and passed over. Do not repeat them. */
  rejectedIds: string[]
  /** What the cook narrowed by. Empty means no constraint. */
  facets?: RecipeFacets
  today?: Date
}

export interface Suggestion {
  recipeId: string
  reason: string
}

/**
 * Whether a recipe satisfies the cook's explicit narrowing.
 *
 * Facets are the one place a hard filter belongs: the cook tapped "Chicken", so a beef dish is
 * wrong no matter how good a suggestion it would otherwise be. Free text stays a steer for the
 * model — this is the part they were unambiguous about.
 *
 * Each list is additive (two proteins means either), and the lists combine (a protein AND a time).
 */
export function matchesFacets(recipe: Recipe, facets: RecipeFacets | undefined): boolean {
  if (!hasFacets(facets)) return true
  const f = facets!

  const any = (values: string[] | undefined, actual: string | undefined) => {
    if (!values?.length) return true
    const got = String(actual ?? '').toLowerCase()
    // "Main Course" should satisfy "Main" — the stored vocabulary is not fully normalised.
    return values.some((v) => got.includes(v.toLowerCase()) || v.toLowerCase().includes(got))
  }

  if (!any(f.proteins, recipe.protein)) return false
  if (!any(f.dishTypes, recipe.dishType)) return false
  if (!any(f.cuisines, recipe.cuisine)) return false
  if (!any(f.difficulties, recipe.difficulty)) return false

  if (f.maxMinutes) {
    const minutes = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0)
    // A recipe with no time recorded is not excluded — absence of data is not a slow recipe.
    if (minutes > 0 && minutes > f.maxMinutes) return false
  }

  return true
}

/** One line per recipe. Compact on purpose: this is sent in full, every request. */
export function buildMenu(
  recipes: Recipe[],
  signals: Record<string, RecipeSignal>,
  today: Date = new Date(),
): { menu: string; index: string[] } {
  const index: string[] = []
  const lines: string[] = []

  for (const recipe of recipes) {
    const signal = signals[recipe.id]
    const minutes = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0)
    const weight = signal
      ? preferenceWeight(signal.outcomes, signal.lastCookedWeek, today)
      : 0

    let history = 'never made'
    if (signal?.lastCookedWeek) history = `last made ${signal.lastCookedWeek.slice(0, 7)}`
    else if (signal?.timesPlanned) history = 'planned before'

    const verdict = signal?.outcomes.filter((o) => o !== 'skipped') ?? []
    const liked = verdict.length
      ? `, they said ${verdict[verdict.length - 1]}`
      : ''

    lines.push(
      [
        index.length,
        String(recipe.title ?? '').slice(0, 56),
        recipe.protein ?? '',
        recipe.cuisine ?? '',
        minutes ? `${minutes}m` : '',
        recipe.difficulty ?? '',
        `${history}${liked}`,
        weight ? `weight ${weight > 0 ? '+' : ''}${weight}` : '',
      ]
        .filter((part) => part !== '')
        .join('|'),
    )
    index.push(recipe.id)
  }

  return { menu: lines.join('\n'), index }
}

export function buildPrompt(input: SuggestInput, menu: string, keptTitles: string[]): string {
  const { wanted, mood, keptIds, facets } = input
  const narrowed = describeFacets(facets)

  return [
    'You help someone choose what to cook this week from recipes they already own.',
    'Think like a good waiter: read what they are in the mood for, pick a few things that fit,',
    'and say briefly why each one. Have an opinion.',
    '',
    `They need ${wanted} more meal${wanted === 1 ? '' : 's'}.`,
    mood.trim() ? `They said: "${mood.trim()}"` : 'They did not say what they feel like.',
    narrowed ? `They also asked specifically for: ${narrowed}. The list below is already limited to those, so choose freely within it.` : '',
    keptIds.length
      ? `Already chosen this week: ${keptTitles.join('; ')}. Pick things that vary from these — different proteins and effort levels, so the week is not all the same.`
      : '',
    '',
    'Their recipes, one per line:',
    'number|title|protein|cuisine|total time|difficulty|history|weight',
    '',
    'The weight is how much to favour a recipe. A positive weight means they liked it and it has',
    'been a while. A negative weight means they cooked it very recently or did not enjoy it —',
    'avoid those unless the request clearly calls for one.',
    '',
    menu,
    '',
    `Choose exactly ${wanted}. Answer with JSON only:`,
    '{"picks":[{"n":<line number>,"why":"<one short sentence, max 14 words>"}]}',
    '',
    'The "why" is for the cook, so make it concrete — mention the time, or that they have never',
    'made it, or that it balances something else they picked. Never invent a recipe: every "n"',
    'must be a line number above.',
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * Turns the model's answer into suggestions, discarding anything that isn't a real recipe.
 *
 * Duplicates, out-of-range numbers, already-kept and already-rejected recipes are all dropped
 * rather than trusted — the model is choosing, not the authority on what exists.
 */
export function parseSuggestions(
  raw: string,
  index: string[],
  exclude: string[] = [],
): Suggestion[] {
  let parsed: { picks?: Array<{ n?: unknown; why?: unknown }> }
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }

  const excluded = new Set(exclude)
  const seen = new Set<string>()
  const out: Suggestion[] = []

  for (const pick of parsed.picks ?? []) {
    const n = typeof pick.n === 'number' ? pick.n : Number(pick.n)
    if (!Number.isInteger(n) || n < 0 || n >= index.length) continue

    const recipeId = index[n]
    if (excluded.has(recipeId) || seen.has(recipeId)) continue
    seen.add(recipeId)

    const why = String(pick.why ?? '').trim()
    out.push({ recipeId, reason: why })
  }

  return out
}

/**
 * A deterministic fallback, used when the model is unavailable.
 *
 * Ranked by the same weight the model is shown, so the app still answers "give me something to
 * cook" when the AI does not — a blank screen is a worse failure than an unexplained pick.
 */
export function fallbackSuggestions(input: SuggestInput): Suggestion[] {
  const { recipes, signals, wanted, keptIds, rejectedIds, facets, today = new Date() } = input
  const excluded = new Set([...keptIds, ...rejectedIds])

  return recipes
    .filter((r) => !excluded.has(r.id) && matchesFacets(r, facets))
    .map((r) => {
      const signal = signals[r.id]
      const weight = signal ? preferenceWeight(signal.outcomes, signal.lastCookedWeek, today) : 0
      // Nudge toward the untried, which is most of the library.
      const novelty = signal?.lastCookedWeek ? 0 : 1
      return { recipe: r, score: weight + novelty }
    })
    .sort((a, b) => b.score - a.score || a.recipe.title.localeCompare(b.recipe.title))
    .slice(0, wanted)
    .map(({ recipe }) => ({
      recipeId: recipe.id,
      reason: signals[recipe.id]?.lastCookedWeek ? 'You liked this one before.' : "You haven't made this yet.",
    }))
}

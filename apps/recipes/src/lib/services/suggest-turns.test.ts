import { describe, it, expect } from 'vitest'
import {
  sanitizeConstraints,
  applyPatch,
  offerableUnder,
  countWithOption,
  groundWidgets,
  parseTurn,
  degradedTurn,
  emptyConstraints,
  MAX_WANTED,
  type Constraints,
  type Widget,
} from './suggest-turns'
import type { Recipe } from '../types'

const recipe = (over: Partial<Recipe> & { id: string }): Recipe =>
  ({
    title: `Recipe ${over.id}`,
    servings: 4,
    prepTime: 10,
    cookTime: 20,
    ingredients: [],
    steps: [],
    ...over,
  }) as Recipe

const library: Recipe[] = [
  recipe({ id: 'a', protein: 'Chicken', cuisine: 'Italian', difficulty: 'Easy' }),
  recipe({ id: 'b', protein: 'Chicken', cuisine: 'Mexican', difficulty: 'Medium' }),
  recipe({ id: 'c', protein: 'Beef', cuisine: 'American', difficulty: 'Hard' }),
  recipe({ id: 'd', protein: 'Vegetarian', cuisine: 'Indian', difficulty: 'Easy' }),
]

const withFacets = (facets: Partial<Constraints['facets']>): Constraints => ({
  ...emptyConstraints(),
  facets: { ...emptyConstraints().facets, ...facets },
})

describe('sanitizeConstraints', () => {
  it('drops facet values outside the shared vocabulary', () => {
    const c = sanitizeConstraints({ facets: { proteins: ['Chicken', 'Dragon'] } })
    expect(c.facets.proteins).toEqual(['Chicken'])
  })

  it('canonicalises case so "chicken" and "Chicken" are one value', () => {
    const c = sanitizeConstraints({ facets: { proteins: ['chicken', 'CHICKEN'] } })
    expect(c.facets.proteins).toEqual(['Chicken'])
  })

  it('clamps how many meals can be asked for', () => {
    expect(sanitizeConstraints({ wanted: 99 }).wanted).toBe(MAX_WANTED)
    expect(sanitizeConstraints({ wanted: -3 }).wanted).toBe(1)
    expect(sanitizeConstraints({ wanted: 'lots' }).wanted).toBe(4)
  })

  it('survives complete rubbish', () => {
    expect(sanitizeConstraints(null)).toEqual(emptyConstraints())
    expect(sanitizeConstraints({ facets: 'nope', keptIds: 7 }).keptIds).toEqual([])
  })
})

describe('applyPatch', () => {
  const known = new Set(['a', 'b', 'c', 'd'])

  it('adds and removes facet values the vocabulary knows', () => {
    const next = applyPatch(
      withFacets({ proteins: ['Chicken'] }),
      { proteins: { add: ['Beef'], remove: ['Chicken'] } },
      known,
    )
    expect(next.facets.proteins).toEqual(['Beef'])
  })

  it('ignores an invented facet value rather than rejecting the whole patch', () => {
    const next = applyPatch(
      emptyConstraints(),
      { proteins: { add: ['Dragon', 'Beef'] }, wanted: 6 },
      known,
    )
    expect(next.facets.proteins).toEqual(['Beef'])
    expect(next.wanted).toBe(6)
  })

  it('only excludes recipes that exist', () => {
    const next = applyPatch(emptyConstraints(), { excludeIds: ['a', 'not-a-recipe'] }, known)
    expect(next.rejectedIds).toEqual(['a'])
  })

  it('clears a time limit when told to, and clamps a silly one', () => {
    expect(applyPatch(withFacets({ maxMinutes: 30 }), { maxMinutes: null }, known).facets.maxMinutes)
      .toBeNull()
    expect(applyPatch(emptyConstraints(), { maxMinutes: -5 }, known).facets.maxMinutes).toBeNull()
  })

  it('leaves the constraints untouched when there is no patch', () => {
    const before = withFacets({ proteins: ['Chicken'] })
    expect(applyPatch(before, undefined, known)).toBe(before)
  })
})

describe('offerableUnder', () => {
  it('excludes what is kept and what was turned down', () => {
    const constraints = { ...emptyConstraints(), keptIds: ['a'], rejectedIds: ['b'] }
    expect(offerableUnder(library, constraints).map((r) => r.id)).toEqual(['c', 'd'])
  })

  it('applies the facets as a hard filter', () => {
    expect(offerableUnder(library, withFacets({ proteins: ['Chicken'] })).map((r) => r.id)).toEqual([
      'a',
      'b',
    ])
  })
})

describe('countWithOption', () => {
  it('counts what would survive if the option were chosen', () => {
    expect(countWithOption(library, emptyConstraints(), 'proteins', 'Chicken')).toBe(2)
    expect(countWithOption(library, emptyConstraints(), 'proteins', 'Pork')).toBe(0)
  })

  it('counts within the constraints already set', () => {
    const easyOnly = withFacets({ difficulties: ['Easy'] })
    // Only 'a' is both Easy and Chicken.
    expect(countWithOption(library, easyOnly, 'proteins', 'Chicken')).toBe(1)
  })
})

describe('groundWidgets', () => {
  const chips = (id: string, values: string[]): Widget => ({
    kind: 'chips',
    id,
    mode: 'many',
    options: values.map((v) => ({ label: v, value: v })),
  })

  it('drops options no recipe can satisfy', () => {
    const [widget] = groundWidgets(
      [chips('proteins', ['Chicken', 'Beef', 'Pork'])],
      library,
      emptyConstraints(),
    )
    expect(widget.kind === 'chips' && widget.options.map((o) => o.value)).toEqual([
      'Chicken',
      'Beef',
    ])
  })

  it('attaches the count, so the client can show it', () => {
    const [widget] = groundWidgets(
      [chips('proteins', ['Chicken', 'Beef'])],
      library,
      emptyConstraints(),
    )
    expect(widget.kind === 'chips' && widget.options.map((o) => o.count)).toEqual([2, 1])
  })

  it('drops a whole widget that is no longer a question', () => {
    // Only Chicken survives, and a one-option question isn't one.
    expect(groundWidgets([chips('proteins', ['Chicken', 'Pork'])], library, emptyConstraints()))
      .toEqual([])
  })

  it('lets mood and time through uncounted — they are steers, not filters', () => {
    const widgets = [chips('mood', ['comforting']), chips('time', ['quick'])]
    expect(groundWidgets(widgets, library, emptyConstraints())).toHaveLength(2)
  })

  it('drops a chips widget whose id is not a facet at all', () => {
    expect(groundWidgets([chips('vibes', ['a', 'b'])], library, emptyConstraints())).toEqual([])
  })

  it('leaves non-chip widgets alone', () => {
    const actions: Widget = { kind: 'actions', options: [{ label: 'Done', intent: 'done' }] }
    expect(groundWidgets([actions], library, emptyConstraints())).toEqual([actions])
  })
})

describe('parseTurn', () => {
  const index = ['a', 'b', 'c', 'd']

  it('resolves picks by line number', () => {
    const turn = parseTurn(
      JSON.stringify({ say: 'Here you go.', widgets: [{ kind: 'recipes', picks: [{ n: 2, why: 'Quick.' }] }] }),
      index,
    )
    expect(turn?.widgets[0]).toEqual({
      kind: 'recipes',
      picks: [{ recipeId: 'c', why: 'Quick.' }],
    })
  })

  it('discards out-of-range, duplicate and excluded picks', () => {
    const turn = parseTurn(
      JSON.stringify({
        say: 'Some ideas.',
        widgets: [
          { kind: 'recipes', picks: [{ n: 99 }, { n: 0 }, { n: 0 }, { n: 1 }] },
        ],
      }),
      index,
      ['b'],
    )
    expect(turn?.widgets[0].kind === 'recipes' && turn.widgets[0].picks.map((p) => p.recipeId))
      .toEqual(['a'])
  })

  it('drops one malformed widget without losing the rest of the turn', () => {
    const turn = parseTurn(
      JSON.stringify({
        say: 'Anything else?',
        widgets: [
          { kind: 'nonsense' },
          { kind: 'actions', options: [{ label: 'Done', intent: 'done' }] },
        ],
      }),
      index,
    )
    expect(turn?.widgets).toHaveLength(1)
    expect(turn?.say).toBe('Anything else?')
  })

  it('rejects an action whose intent is not one we handle', () => {
    const turn = parseTurn(
      JSON.stringify({
        say: 'Hi',
        widgets: [{ kind: 'actions', options: [{ label: 'Explode', intent: 'explode' }] }],
      }),
      index,
    )
    expect(turn?.widgets).toEqual([])
  })

  it('returns null on unparseable output', () => {
    expect(parseTurn('not json at all', index)).toBeNull()
    expect(parseTurn(JSON.stringify({ widgets: [] }), index)).toBeNull()
  })

  it('carries a patch through when there is one', () => {
    const turn = parseTurn(
      JSON.stringify({
        say: 'No more chicken then.',
        widgets: [],
        patch: { proteins: { remove: ['Chicken'] } },
      }),
      index,
    )
    expect(turn?.patch).toEqual({ proteins: { remove: ['Chicken'] } })
  })

  it('clamps a silly counter rather than trusting it', () => {
    const turn = parseTurn(
      JSON.stringify({ say: 'How many?', widgets: [{ kind: 'counter', value: 400 }] }),
      index,
    )
    expect(turn?.widgets[0].kind === 'counter' && turn.widgets[0].value).toBe(MAX_WANTED)
  })
})

describe('degradedTurn', () => {
  it('still offers what the deterministic ranking found', () => {
    const turn = degradedTurn([{ recipeId: 'a', why: "You haven't made this yet." }])
    expect(turn.widgets[0].kind).toBe('recipes')
    expect(turn.widgets.some((w) => w.kind === 'actions')).toBe(true)
  })

  it('says so plainly when there is nothing left to offer', () => {
    const turn = degradedTurn([])
    expect(turn.widgets.every((w) => w.kind === 'actions')).toBe(true)
    expect(turn.say).toMatch(/widening/i)
  })
})

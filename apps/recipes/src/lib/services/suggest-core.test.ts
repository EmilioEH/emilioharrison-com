import { describe, it, expect } from 'vitest'
import {
  buildMenu,
  buildPrompt,
  parseSuggestions,
  fallbackSuggestions,
  type RecipeSignal,
  type SuggestInput,
} from './suggest-core'
import type { Recipe } from '../types'

const TODAY = new Date('2026-07-22T12:00:00Z')

const recipe = (id: string, over: Partial<Recipe> = {}): Recipe =>
  ({
    id,
    title: `Recipe ${id}`,
    servings: 4,
    prepTime: 10,
    cookTime: 20,
    ingredients: [],
    steps: [],
    protein: 'Chicken',
    cuisine: 'American',
    difficulty: 'Easy',
    ...over,
  }) as Recipe

const signal = (over: Partial<RecipeSignal> = {}): RecipeSignal => ({
  outcomes: [],
  lastCookedWeek: null,
  timesPlanned: 0,
  ...over,
})

describe('buildMenu', () => {
  it('numbers every recipe and maps the numbers back to ids', () => {
    const { menu, index } = buildMenu([recipe('a'), recipe('b')], {}, TODAY)
    expect(index).toEqual(['a', 'b'])
    expect(menu.split('\n')).toHaveLength(2)
    expect(menu).toContain('0|Recipe a')
    expect(menu).toContain('1|Recipe b')
  })

  it('tells the model what the family has and has not made', () => {
    const { menu } = buildMenu(
      [recipe('a'), recipe('b')],
      { a: signal({ lastCookedWeek: '2026-02-02', outcomes: ['again'] }) },
      TODAY,
    )
    expect(menu).toContain('last made 2026-02')
    expect(menu).toContain('they said again')
    expect(menu).toContain('never made')
  })

  it('stays small enough to send in full', () => {
    // The whole design depends on this: ~30 recipes should cost well under 3k characters, so a
    // 413-recipe library lands around 8k tokens and fits in one cheap call.
    const many = Array.from({ length: 30 }, (_, i) => recipe(String(i)))
    const { menu } = buildMenu(many, {}, TODAY)
    expect(menu.length).toBeLessThan(3000)
  })
})

describe('buildPrompt', () => {
  const base: SuggestInput = {
    recipes: [],
    signals: {},
    wanted: 3,
    mood: '',
    keptIds: [],
    rejectedIds: [],
  }

  it('asks for exactly the number still needed', () => {
    expect(buildPrompt({ ...base, wanted: 2 }, 'menu', [])).toContain('They need 2 more meals')
    expect(buildPrompt({ ...base, wanted: 1 }, 'menu', [])).toContain('They need 1 more meal')
  })

  it('passes the mood through when there is one', () => {
    const prompt = buildPrompt({ ...base, mood: 'something comforting' }, 'menu', [])
    expect(prompt).toContain('something comforting')
  })

  it('says so plainly when the cook gave no steer', () => {
    expect(buildPrompt(base, 'menu', [])).toContain('did not say what they feel like')
  })

  it('asks for variety against what is already chosen', () => {
    // The reason picking happens in batches: each round is balanced against the last.
    const prompt = buildPrompt({ ...base, keptIds: ['x'] }, 'menu', ['Beef Stew'])
    expect(prompt).toContain('Beef Stew')
    expect(prompt).toMatch(/vary from these/i)
  })
})

describe('parseSuggestions', () => {
  const index = ['a', 'b', 'c']

  it('maps line numbers back to recipes', () => {
    const out = parseSuggestions('{"picks":[{"n":0,"why":"Quick."},{"n":2,"why":"New."}]}', index)
    expect(out).toEqual([
      { recipeId: 'a', reason: 'Quick.' },
      { recipeId: 'c', reason: 'New.' },
    ])
  })

  it('drops a number that is not a recipe', () => {
    // The model cannot conjure a dish the cook does not own.
    expect(parseSuggestions('{"picks":[{"n":99,"why":"x"},{"n":-1,"why":"y"}]}', index)).toEqual([])
  })

  it('drops repeats and anything already on the plan', () => {
    const out = parseSuggestions(
      '{"picks":[{"n":0,"why":"one"},{"n":0,"why":"again"},{"n":1,"why":"two"}]}',
      index,
      ['b'],
    )
    expect(out).toEqual([{ recipeId: 'a', reason: 'one' }])
  })

  it('returns nothing rather than throwing on unusable output', () => {
    expect(parseSuggestions('not json', index)).toEqual([])
    expect(parseSuggestions('{}', index)).toEqual([])
  })
})

describe('fallbackSuggestions', () => {
  const input: SuggestInput = {
    recipes: [recipe('a'), recipe('b'), recipe('c')],
    signals: {
      a: signal({ lastCookedWeek: '2026-07-13', outcomes: ['again'] }), // just cooked
      b: signal({ lastCookedWeek: '2026-01-05', outcomes: ['again'] }), // liked, long ago
    },
    wanted: 2,
    mood: '',
    keptIds: [],
    rejectedIds: [],
    today: TODAY,
  }

  it('still answers when the model is unavailable', () => {
    // A blank screen is a worse failure than an unexplained pick.
    const out = fallbackSuggestions(input)
    expect(out).toHaveLength(2)
    expect(out.every((s) => s.reason)).toBe(true)
  })

  it('prefers a liked recipe from a while ago over one cooked last week', () => {
    const picked = fallbackSuggestions(input).map((s) => s.recipeId)
    expect(picked).toContain('b')
    expect(picked).not.toContain('a')
  })

  it('never offers something already chosen or already passed over', () => {
    const out = fallbackSuggestions({ ...input, keptIds: ['b'], rejectedIds: ['c'], wanted: 3 })
    expect(out.map((s) => s.recipeId)).toEqual(['a'])
  })
})

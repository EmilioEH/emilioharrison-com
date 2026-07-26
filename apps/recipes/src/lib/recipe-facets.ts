/**
 * The facets a cook can steer by, in one place.
 *
 * These lists were written out inline in `RecipeFilters.tsx` and had already drifted: its dish-type
 * list was missing Bread, Baked Good and Dessert, which `dish-types.ts` had added precisely so
 * baked goods stopped being unfindable. Duplicated vocabulary drifting apart is the recurring
 * cause of bugs in this app, so both the library filters and the meal suggester read from here.
 *
 * Counts in the comments are from the live library on 2026-07-26 — they explain the ordering,
 * which is by how often a cook would actually reach for the option.
 */

import { DISH_TYPE_OPTIONS } from './dish-types'
import type { Recipe } from './types'

/** Ordered by how much of the library each covers: Chicken 124, Vegetarian 88, Pork 74, Beef 56. */
export const PROTEIN_OPTIONS = [
  'Chicken',
  'Beef',
  'Pork',
  'Seafood',
  'Fish',
  'Vegetarian',
  'Vegan',
  'Other',
] as const

export const MEAL_TYPE_OPTIONS = [
  'Breakfast',
  'Brunch',
  'Lunch',
  'Dinner',
  'Snack',
  'Dessert',
] as const

/** The library holds 84 distinct cuisines; these are the ones with enough recipes to filter by. */
export const CUISINE_OPTIONS = [
  'American',
  'Italian',
  'Mediterranean',
  'Mexican',
  'Asian',
  'French',
  'Indian',
] as const

export const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard'] as const

export { DISH_TYPE_OPTIONS }

/**
 * Time as a cook thinks about it, not as a number.
 *
 * The median recipe is 46 minutes and 84 are under 30, so "quick" is a real category here rather
 * than a token gesture.
 */
export const TIME_OPTIONS = [
  { id: 'quick', label: 'Under 30 min', maxMinutes: 30 },
  { id: 'medium', label: 'Under an hour', maxMinutes: 60 },
  { id: 'any', label: 'No rush', maxMinutes: null },
] as const

export type TimeOptionId = (typeof TIME_OPTIONS)[number]['id']

/** What the cook chose to steer by. Every list is additive — picking two proteins means either. */
export interface RecipeFacets {
  proteins?: string[]
  dishTypes?: string[]
  cuisines?: string[]
  difficulties?: string[]
  maxMinutes?: number | null
}

/** True when the cook narrowed anything at all. */
export function hasFacets(facets: RecipeFacets | undefined): boolean {
  if (!facets) return false
  return Boolean(
    facets.proteins?.length ||
      facets.dishTypes?.length ||
      facets.cuisines?.length ||
      facets.difficulties?.length ||
      facets.maxMinutes,
  )
}

/** A short human summary of the choices, for the collapsed step. */
export function describeFacets(facets: RecipeFacets | undefined): string {
  if (!facets) return ''
  const parts: string[] = []
  if (facets.proteins?.length) parts.push(facets.proteins.join(', '))
  if (facets.dishTypes?.length) parts.push(facets.dishTypes.join(', '))
  if (facets.cuisines?.length) parts.push(facets.cuisines.join(', '))
  if (facets.difficulties?.length) parts.push(facets.difficulties.join(', '))
  if (facets.maxMinutes) parts.push(`under ${facets.maxMinutes} min`)
  return parts.join(' · ')
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
    // A recipe with nothing recorded for this field is not a match. It used to be one for
    // *everything*: the substring test below is bidirectional, and `'chicken'.includes('')` is
    // true, so tapping Chicken returned every recipe with no protein set. That is the opposite of
    // what a hard filter is for. The time facet's tolerance of missing data is deliberate and
    // different — a recipe with no time recorded is genuinely not known to be slow.
    if (!got) return false
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

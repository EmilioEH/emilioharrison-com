import { useEffect, useRef } from 'react'
import { needsGroceryRegeneration, type GroceryScopeEntry } from '../../../lib/grocery-signature'
import { triggerGroceryGeneration } from '../../../lib/services/grocery-service'
import type { GroceryList, Recipe } from '../../../lib/types'

interface AutoGroceryArgs {
  /** Only the grocery tab generates; the plan tab must not spend an AI call in the background. */
  active: boolean
  signedIn: boolean
  /** The family has finished loading — it is what decides the list's scope, and so its id. */
  familyReady: boolean
  scopeId: string | null
  listId: string | null
  weekStart: string
  recipes: Pick<Recipe, 'id'>[]
  /** The same recipes plus the servings chosen for each — what the signature compares. A recipe
   * cooked for six is a different shopping requirement from the same recipe cooked for four. */
  scope: GroceryScopeEntry[]
  /** The subscribed document, and whether a snapshot has actually arrived for `listId`. */
  list: GroceryList | null
  resolved: boolean
  readError: boolean
  /** Generation already under way, or timed out — don't start a second one on top. */
  processing: boolean
  stuck: boolean
}

/**
 * Decides when this week's Smart grocery list should be (re)generated.
 *
 * The rule it replaces was "is there a document? if not, generate", asked while the Firestore
 * subscription was still in flight. That answered "no" on nearly every page open, so the list
 * rebuilt itself constantly — and because rebuilding used to overwrite the document, each rebuild
 * threw away the items the cook had ticked off, deleted or typed in by hand.
 *
 * Now nothing happens until the subscription has actually reported, and the stored list carries
 * the recipes it was built from, so the comparison is against the week rather than against the
 * absence of data. Removing a recipe registers as a change too, which the old in-memory flag
 * never managed.
 */
export function useAutoGroceryGeneration({
  active,
  signedIn,
  familyReady,
  scopeId,
  listId,
  weekStart,
  recipes,
  scope,
  list,
  resolved,
  readError,
  processing,
  stuck,
}: AutoGroceryArgs) {
  // A read error is the one place a guess is still warranted, so it is capped at one per list per
  // session. A family list that does not exist yet fails the security rules' existence-dependent
  // clauses, so the read errors instead of reporting "no document" — and generating is precisely
  // what creates the document that makes every later read succeed. Safe to keep only because
  // generation now merges onto the existing list instead of replacing it: a wrong guess costs an
  // AI call, not the cook's work.
  const forcedAfterReadError = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!active || !signedIn || !familyReady || !scopeId) return
    if (processing || stuck || recipes.length === 0) return

    if (readError) {
      if (listId && !forcedAfterReadError.current.has(listId)) {
        forcedAfterReadError.current.add(listId)
        triggerGroceryGeneration(weekStart, recipes, scopeId)
      }
      return
    }

    if (needsGroceryRegeneration({ resolved, list, currentRecipeIds: scope })) {
      triggerGroceryGeneration(weekStart, recipes, scopeId)
    }
  }, [
    active,
    signedIn,
    familyReady,
    scopeId,
    listId,
    weekStart,
    recipes,
    scope,
    list,
    resolved,
    readError,
    processing,
    stuck,
  ])
}

import type { GroceryList, ShoppableIngredient } from './types'

/**
 * The two pure rules that keep a week's grocery list from rebuilding itself, and from throwing
 * away what the cook did to it. Shared by the Cloudflare route, the VM worker and the client, so
 * all three agree on what "this list is out of date" and "this item was the cook's" mean.
 */

/** One recipe's contribution to a week's shopping, as the signature sees it. */
export interface GroceryScopeEntry {
  id: string
  /** The count chosen for this week, when the cook has changed it. */
  servings?: number
}

/**
 * The signature of a week's shopping scope: sorted and de-duplicated, so it depends only on
 * *what* has to be bought — never on the order recipes were added or a duplicate entry.
 *
 * A recipe cooked for a different number of people is a different shopping requirement, so the
 * count is part of the entry (`id@6`). A recipe at its own written servings is just `id`, which
 * keeps signatures written before servings existed comparing equal instead of triggering a
 * regeneration for every list in the world.
 */
export function groceryListSignature(entries: readonly (string | GroceryScopeEntry)[]): string[] {
  const tokens = entries
    .map((entry) => (typeof entry === 'string' ? { id: entry } : entry))
    .filter((entry) => typeof entry?.id === 'string' && entry.id.length > 0)
    .map((entry) =>
      typeof entry.servings === 'number' && Number.isFinite(entry.servings)
        ? `${entry.id}@${entry.servings}`
        : entry.id,
    )
  return Array.from(new Set(tokens)).sort()
}

/**
 * Does this stored list still match the week?
 *
 * `undefined` means "the answer isn't known yet" — either the list hasn't loaded or it predates
 * the signature field — and the caller must not read that as either a match or a mismatch without
 * deciding what to do about it. `needsGroceryRegeneration` below is that decision.
 */
export function signaturesMatch(
  stored: readonly string[] | undefined,
  current: readonly (string | GroceryScopeEntry)[],
): boolean | undefined {
  if (!Array.isArray(stored)) return undefined
  const a = groceryListSignature(stored)
  const b = groceryListSignature(current)
  return a.length === b.length && a.every((id, i) => id === b[i])
}

/**
 * Should the list for this week be generated?
 *
 * `resolved` is the load state of the Firestore subscription, and it is the whole point: the
 * previous test asked "is there a document?" while the subscription was still in flight, saw
 * `null`, and generated a list that already existed. Nothing is generated until the subscription
 * has actually reported.
 */
export function needsGroceryRegeneration(args: {
  resolved: boolean
  list: Pick<GroceryList, 'sourceRecipeIds'> | null
  currentRecipeIds: readonly (string | GroceryScopeEntry)[]
}): boolean {
  const { resolved, list, currentRecipeIds } = args
  if (!resolved) return false
  if (currentRecipeIds.length === 0) return false
  if (!list) return true
  // A list written before signatures existed: regenerate once, which stamps a signature and
  // stops it happening again.
  return signaturesMatch(list.sourceRecipeIds, currentRecipeIds) !== true
}

const itemKey = (item: ShoppableIngredient) =>
  `${item.name.toLowerCase().trim()}|${(item.purchaseUnit || '').toLowerCase().trim()}`

/**
 * Fold what the cook did to the old list onto a freshly generated one.
 *
 * Regeneration used to replace `ingredients` wholesale, which discarded three things that only
 * ever live on that document: items typed in by hand, `archivedAt` (ticked off) and
 * `unneededThisWeek`. The AI's amounts win — that is what was just recomputed — but the cook's
 * additions and their marks survive.
 *
 * Matching is by name + purchase unit, the same key `api/grocery/items.ts` uses when merging a
 * manual item into the list, so the two agree on what counts as "the same item".
 */
export function mergeGroceryIngredients(
  previous: readonly ShoppableIngredient[] | undefined,
  generated: readonly ShoppableIngredient[],
): ShoppableIngredient[] {
  const old = new Map((previous ?? []).map((item) => [itemKey(item), item]))

  const merged = generated.map((item) => {
    const prior = old.get(itemKey(item))
    if (!prior) return item
    old.delete(itemKey(item))
    return {
      ...item,
      ...(prior.archivedAt ? { archivedAt: prior.archivedAt } : {}),
      ...(prior.unneededThisWeek ? { unneededThisWeek: prior.unneededThisWeek } : {}),
    }
  })

  // Whatever the cook added by hand has no counterpart in the generated list, so it would
  // otherwise simply vanish. Items the AI produced last time and not this time are dropped —
  // their recipe left the week, which is the correct outcome.
  const manualLeftovers = Array.from(old.values()).filter((item) => item.isManual)

  return [...merged, ...manualLeftovers]
}

# Field Feedback (2026-08-02) — Implementation Plan

> **Created**: 2026-08-02
> **Status**: Not started — plan only
> **Branch**: Feature work should branch from `main`
> **Source**: Seven pieces of feedback from real use, diagnosed against the code on 2026-08-02

---

## Overview

Seven complaints from one session of real use. Diagnosed, they are not seven bugs — they are three
kinds of problem, plus two features that were never built.

1. **The app doesn't say what it did.** Tapping `+` on a recipe card produces no visible change,
   and the week it was added to is invisible and unchangeable from the library. The bottom tab
   says "This Week" even when the active week is next week.
2. **The app quietly destroys work.** The grocery list decides it needs rebuilding by asking "is
   there a list?" before the list has finished loading, so it rebuilds one that already exists —
   and rebuilding overwrites the document that holds ticked-off, deleted and hand-added items.
3. **Two features answer the same question differently.** The week review asks in four taps; the
   recipe page asks in five stars. Both write to the same place with the same `source` tag, so
   they cannot be told apart afterwards and the average mixes two incompatible scales.
4. **Two things were never built at all:** changing servings, and letting the meal suggester use
   ingredients the cook already has.

The seventh — a microphone-in-use notification — has no cause in this codebase (see
[Explicitly Not Doing](#explicitly-not-doing)).

---

## Key Decisions

### 1. The grocery list remembers what it was built from

The stored list gains the sorted set of recipe ids it was generated for. "Does this list need
rebuilding?" becomes a comparison against the current week, not a guess from the absence of a
document.

**Why:** the current test cannot distinguish "there is no list" from "the list has not loaded
yet", and the in-memory `$groceryNeedsRegen` flag only ever covered _adding_ a recipe — removing
one never marked the list stale. A signature answers both directions correctly and survives a
reload.

**Consequence:** `$groceryNeedsRegen` becomes dead and is deleted rather than left as a second,
weaker source of truth.

### 2. Servings live on the week plan, not on the recipe

A serving count chosen for this week is stored on the family's week-plan entry for that recipe. The
recipe document is never rewritten.

**Why:** cooking for six this week must not change the recipe for everyone forever. It also keeps
the existing grocery contract intact — the client still sends only recipe ids, and the server reads
the plan itself. That contract exists because a previous version trusted client-side recipe data
and silently produced empty grocery lists.

**Rejected alternative:** encoding the count in the id sent to the grocery endpoint
(`recipeId:6`). It works as transport, but the number still has to be stored somewhere or it is
lost on reopen and unknown to the rest of the family — and once it is stored, the server can read
it directly and the suffix is redundant.

### 3. Ratings are verdicts, not numbers

`skipped | disliked | ok | loved`. The week review asks all four ("Didn't make it" is an answer,
and it is what marks a meal as dealt with so the prompt stops asking). The recipe page asks the
three verdicts only.

**Why:** a three-point scale cannot be averaged, so "4.3 ★" has to go regardless — and the two
existing entry points already disagree about what a 4 means.

### 4. Icons only where they change a decision

Loved and disliked get a mark on the library card. "It's okay" and unrated get nothing.

**Why:** most of a 413-recipe library will be unrated or unremarkable. A mark on every card is the
same mistake as the chef-hat placeholder that was removed from these cards — decoration that costs
space and tells the reader nothing. The rare mark is the one that gets noticed, and "we didn't like
this" is the one that actually prevents a bad plan.

**Household verdict:** each person's _most recent_ verdict counts once; loved + disliked renders as
mixed. Counts and names live on the recipe page, never on the card.

### 5. Pantry matching filters in code, with a floor

An ingredient the cook says they have is an exact test on a normalised name, so code does it — the
same rule that sends the whole menu to the model for "something comforting" (fuzzy) sends a
filtered menu for "uses chicken thighs" (exact).

**Why a floor:** filtering hard on five ingredients can leave three recipes, which produces worse
suggestions than no filter at all and can trip the "I couldn't find anything" path. So: filter
while enough survive; below the threshold, keep the whole library and mark the matches instead.

### 6. The Smart list must move to the normalised amounts before servings can scale

The Raw list was rebuilt on the normalised `quantity`/`unit` fields (PR #92). The Smart list was
not — `formatRecipesForPrompt` still prefers `structuredIngredients` and sends its free-text
`amount` to the model.

**Why it blocks servings:** you cannot multiply a string. This is also a correctness fix in its own
right: `structuredIngredients` is the drifted field (AI-rewritten names, 311 unit spellings), which
is exactly why the Raw list stopped using it.

---

## Phase 1: The grocery list stops rebuilding itself, and stops wiping work

**Goal:** no regeneration unless the week's recipes actually changed, and no regeneration destroys
what the cook did to the list.

### Tasks

1. Add `sourceRecipeIds: string[]` (sorted) to `GroceryList` in `lib/types.ts`; write it in **both**
   paths of `pages/api/generate-grocery-list.ts` — the worker-enqueue path and the legacy
   `waitUntil` path.
2. Make "not loaded yet" distinguishable from "does not exist" in `lib/firestoreHooks.ts`. Today
   `loading` initialises to `!!(path && db && auth?.currentUser)`, and Firebase auth restores
   asynchronously — so on open there is a window with `data: null, loading: false`. Report a
   definite null only after a snapshot has arrived.
3. Hold generation until the scope is final. `listId` is `${familyId ?? uid}_${week}`, and
   `$currentFamily` resolves after mount, so the subscription path flips mid-session and produces a
   second false "no document" window.
4. Replace the trigger test in `WeekWorkspace.tsx` (the auto-generate effect) with: generate only
   when the subscription has resolved **and** either there is no document or its
   `sourceRecipeIds` differs from this week's recipe ids.
5. Delete `$groceryNeedsRegen` from `lib/weekStore.ts` and its consumers — the signature supersedes
   it, and it never covered removal.
6. Stop the destructive write. `generate-grocery-list.ts` currently calls `setDocument` with
   `ingredients: []` before generating, which discards manually added items, `archivedAt`
   (ticked off) and `unneededThisWeek` — all of which `api/grocery/items.ts` stores on that same
   document. Write status/progress with `updateDocument`, keep the previous ingredients visible
   while generating, and merge the cook's items and flags onto the new result.

### Tests

- Unit: signature comparison — same set in a different order is not a change; add and remove both
  are.
- Unit: a regeneration preserves manual items, `archivedAt` and `unneededThisWeek`.
- Playwright: open the week, open the grocery tab, reload — no second generation fires.

### Considerations for future sessions

The stuck-detector timings (`grocery-stuck-detection.ts`) are sized for the VM worker's 120s
budget. Nothing here changes them, but a slower first paint caused by task 2 must not be mistaken
for a stuck job.

---

## Phase 2: The `+` says what it did, and to which week

**Goal:** tapping `+` produces an immediate, visible change, and the week being planned is on
screen and changeable from the library.

### Tasks

1. `RecipeCard.tsx`: the add button reflects state — a check when planned, a plus when not. The
   card already computes `isPlanned` and only uses it to decide whether to show the ⋮ menu.
2. Add `triggerHaptic('light')` on the tap (`lib/haptics.ts` already exists and is unused here).
3. Make it optimistic. `handleAddToWeek` in `RecipeManager.tsx` awaits a round trip before anything
   changes; flip the state first and revert on failure — `addRecipeToWeek` already returns a
   boolean for exactly this purpose.
4. `RecipeLibrary.tsx`: drop `.filter((p) => p.isCurrentWeek)` from both call sites. It throws away
   the planned-week badge for every week except the current one, so adding to next week currently
   produces _no_ visible response at all. `getPlannedWeeksForRecipe` already returns the right
   labels ("This week", "Next week", "Aug 18").
5. Show the target week in the library — a chip reading "Adding to: This week ▾" that opens the
   existing `CalendarPicker` (already a self-contained modal).
6. `BottomTabBar.tsx`: the label follows the active week instead of being hard-coded "This Week",
   which is currently wrong whenever the active week is not this one.

### Tests

- Playwright: with the active week set to next week, adding from the library shows the "Next week"
  badge and the tab label agrees.
- Playwright: a failed add reverts the button.

---

## Phase 3: One rating, three verdicts

**Goal:** the two rating surfaces ask the same question in the same words, and the answer is stored
as a verdict rather than a number on a scale that no longer exists.

**Do not write any migration before the audit in task 1 is read.** A migration's own report proves
only self-consistency.

### Tasks

1. **Audit first.** A script alongside `scripts/audit-ingredients.ts` that counts reviews across
   `families/*/recipeData/*`, broken down by `source`, `rating`, and whether they carry
   `comment`/`photoUrl` — currently the only signal distinguishing the two entry points, since both
   post `source: 'quick'`. A stored `4` means "Good" from the week review and reads as positive from
   the star form; the mapping must be decided from the real counts, and if the pile is small it
   should be mapped by hand.
2. Rename `CookOutcome` in `lib/week-review.ts` to `skipped | disliked | ok | loved`. Same four
   slots, so this is a rename, not a new shape.
3. Add `outcome` to `Review` in `lib/types.ts`. Keep writing `rating` for one release so a rollback
   is possible, then remove it.
4. Fix the source tag at the point of writing: the recipe page posts `source: 'detail'`, the week
   review posts `source: 'week-review'`. This is what makes the two distinguishable from here on.
5. `WeekReviewPrompt.tsx`: four chips with icons. `Chip` already accepts a `ReactNode` label, so no
   component change is needed.
6. `RecipeReviews.tsx`: replace the five-star picker (and `hoverRating`) with the three verdicts.
7. Display:
   - `OverviewMode.tsx` — the average becomes the household verdict (latest per person, combined).
   - `RecipeCard.tsx` — loved / disliked / mixed only; nothing for `ok` or unrated; no counts.
   - `RecipeReviews.tsx` — per-review stars become the verdict icon; counts and names live here.
   - Every icon carries a text label for screen readers.
8. Readers: `outcomeForRating` in `pages/api/week/suggest.ts` disappears (it exists only to reverse
   the number mapping); `preferenceWeight` in `lib/week-review.ts` maps the renamed values; the
   `rating < 1 || rating > 5` validation in `pages/api/recipes/[id]/reviews.ts` and
   `reviews/[reviewId].ts` accepts the verdict set.

### Considerations for future sessions

`skipped` is what marks a meal as answered so the review stops asking. It must survive the rename —
removing it would leave un-cooked meals permanently pending, and the only escape would be "Don't
ask about this week", which discards the whole week.

---

## Phase 4: The Smart list reads the normalised amounts

**Goal:** the AI grocery list is built from the clean numeric amounts, not the drifted field.
Prerequisite for Phase 5, and a correctness fix on its own.

### Tasks

1. `formatRecipesForPrompt` in `lib/api-utils.ts`: prefer `ingredients` with numeric `quantity` +
   canonical `unit`; fall back to `structuredIngredients`, then to raw text. This is the same
   choice `grocery-utils.ts` made for the Raw list in PR #92.
2. Keep `structuredIngredients` for the category lookup only, matching how the Raw list uses it.
3. Verify against a real week's list before Phase 5 begins — compare Smart output before and after
   on the same recipes.

### Considerations for future sessions

`api-utils.ts` is inside the Stryker mutation-testing scope; its tests must stay green.
`grocery-core.ts` runs in the VM worker's import graph — `systemctl --user restart
recipe-worker.service` after changing it.

---

## Phase 5: Servings that reach the shopping list

**Goal:** choosing "cooking for 6" scales the recipe on screen and buys for six.

**Depends on:** Phase 4 (numeric amounts on the Smart path) and Phase 1 (a signature that a
servings change can invalidate).

### Tasks

1. Store `servings` on the week-plan entry (`families/{id}/recipeData/{recipeId}.weekPlan`), written
   by `POST /api/recipes/[id]/week-plan`. Absent means the recipe's own servings.
2. A pure, unit-tested scaling helper in `lib/`, used by both the recipe view and the grocery path.
   Rules: scale `quantity` only; a row with no numeric quantity ("to taste", "1 large lemon") passes
   through untouched rather than being guessed at; `gramsForIngredient` scales with it.
3. Recipe detail: a servings stepper that rescales the displayed amounts. The stored recipe is not
   modified.
4. `generate-grocery-list.ts` reads the week-plan servings server-side — it already re-fetches the
   recipes, so it can read the plan the same way. The client keeps sending ids only.
5. `buildRawShoppableIngredients` takes the same factor so both lists agree.
6. A servings change must alter the Phase 1 signature so the list regenerates.

### Considerations for future sessions

Amounts written into instruction prose ("add the 2 cups of stock") are plain text in `steps[]` and
are **not** rewritten. If that reads as a bug in use, the honest fix is a note in the UI, not a
find-and-replace over instructions.

---

## Phase 6: The suggester knows what's in the fridge

**Goal:** "I already have chicken thighs and spinach" changes what gets suggested.

### Tasks

1. `Constraints` in `lib/services/suggest-turns.ts` gains `pantry: string[]`, sanitised like every
   other field, surfaced as removable chips.
2. An opening step before suggestions: chips of the library's most common ingredient names
   (`groupIngredientNames` in `lib/ingredient-names.ts` already derives them) plus free text. This
   is a deliberate exception to "taps for narrowing, words only after suggestions exist" — document
   it where that rule is stated, because it is the one place typing genuinely comes first.
3. Match with `ingredientKey()` on both sides — it already collapses "garlic cloves" → "garlic" and
   "extra virgin olive oil" → "olive oil".
4. Extend `offerableUnder` with the pantry test. The menu is already built from its output and the
   facet filter already runs there, so no new plumbing is required.
5. **The floor.** Filter only while enough recipes survive (start at 25, tune against real
   matches). Below that, keep the whole library and put "uses N of yours" on the menu line in
   `buildMenu` (~4 extra tokens per recipe). The pantry must never on its own trigger the
   `exhausted` path.
6. Let near-misses through the filter — a recipe one ingredient short is often the most useful
   suggestion — flagged so the model can say what is missing.
7. `buildConversationPreamble` explains what the marker means.
8. The "use up what we have" mood chip either drives this or is removed; it is currently decoration.

### Considerations for future sessions

`listAccessibleRecipes` returns **full** recipe documents, so the endpoint already holds every
ingredient in memory — no new query, no extra fetch.

Sending every ingredient of all 413 recipes was rejected: ~5,250 names roughly triples the
~8,300-token menu on every turn, and hands the model a counting job code does exactly.

---

## File Change Summary

### New files

| File                         | Purpose                                                            |
| ---------------------------- | ------------------------------------------------------------------ |
| `scripts/audit-reviews.ts`   | Phase 3 — count and classify existing reviews before any migration |
| `scripts/migrate-reviews.ts` | Phase 3 — verdict migration, `--write` gated, idempotent           |
| `src/lib/servings-scale.ts`  | Phase 5 — the scaling rules, pure and unit-tested                  |

### Modified files

| File                                                                   | Phases                                                         |
| ---------------------------------------------------------------------- | -------------------------------------------------------------- |
| `src/lib/types.ts`                                                     | 1, 3, 5 — list signature, `Review.outcome`, week-plan servings |
| `src/pages/api/generate-grocery-list.ts`                               | 1, 5 — signature, non-destructive write, servings              |
| `src/lib/firestoreHooks.ts`                                            | 1 — resolved vs. not-yet-loaded                                |
| `src/components/recipe-manager/week-planner/WeekWorkspace.tsx`         | 1 — trigger test                                               |
| `src/lib/weekStore.ts`                                                 | 1, 2, 5 — delete regen flag, servings on the plan              |
| `src/components/recipe-manager/RecipeCard.tsx`                         | 2, 3 — button state, verdict icon                              |
| `src/components/recipe-manager/RecipeLibrary.tsx`                      | 2 — stop discarding the badge                                  |
| `src/components/recipe-manager/RecipeManager.tsx`                      | 2 — optimistic add                                             |
| `src/components/recipe-manager/BottomTabBar.tsx`                       | 2 — honest label                                               |
| `src/lib/week-review.ts`                                               | 3 — outcome rename, weighting                                  |
| `src/components/recipe-manager/week-planner/WeekReviewPrompt.tsx`      | 3 — four chips with icons                                      |
| `src/components/recipe-details/RecipeReviews.tsx`                      | 3 — verdicts, source tag                                       |
| `src/components/recipe-details/OverviewMode.tsx`                       | 3, 5 — household verdict, servings stepper                     |
| `src/pages/api/recipes/[id]/reviews.ts`, `reviews/[reviewId].ts`       | 3 — validation, source                                         |
| `src/pages/api/week/suggest.ts`                                        | 3, 6 — outcomes directly, pantry                               |
| `src/lib/api-utils.ts`                                                 | 4 — normalised amounts on the Smart path                       |
| `src/lib/grocery-utils.ts`                                             | 5 — scale factor                                               |
| `src/lib/services/suggest-turns.ts`, `suggest-core.ts`                 | 6 — pantry constraint, filter, menu marker                     |
| `src/components/recipe-manager/week-planner/SuggesterConversation.tsx` | 6 — opening step                                               |
| `README.md`                                                            | after any phase that changes architecture                      |

---

## Explicitly Not Doing

- **The microphone.** No microphone code exists in this app, in any version — no `getUserMedia`, no
  `mediaDevices`, no speech API, no autofocused input, and nothing in git history. The only
  `getUserMedia` reference in the entire bundle is dead code inside `gifshot`, which `heic2any`
  bundles for GIF output, in a chunk that only loads when converting a HEIC photo. An installed PWA
  runs inside Chrome, and Android attributes microphone use to the foreground app, so a neighbouring
  tab is the likely source. Owner has deferred this. If it recurs, the cheap disproof is a
  `Permissions-Policy: microphone=()` response header — the app currently sets no headers at all
  (no `public/_headers`, nothing in `middleware.ts` or the gateway worker).
- **Normalising `structuredIngredients` itself.** Phase 4 routes around it; the field survives for
  categories only.
- **Rewriting amounts inside instruction text** when servings change (see Phase 5).
- **Day-level assignment within a week.** Out of scope; the week remains the unit.

---

## Unrelated finding, flagged not fixed

`heic2any` is listed in `apps/recipes/package.json` but does not appear in `package-lock.json` and
is not present in `node_modules`. A clean `npm ci` would not install it, and HEIC photo uploads
would fail at runtime. Worth a one-line lockfile fix on its own, separate from this work.

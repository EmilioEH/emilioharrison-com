# Chefboard Design Review — March 2026

**Scope:** Post-restructuring review following the introduction of `BottomTabBar`
(Library / This Week), simplification of `RecipeHeader`, and removal of
`WeekContextBar`.

**Evaluation axes:** Information architecture · Styling coherence · Interaction
coherence

---

## Part 1 — Findings

---

### 1. Information Architecture

---

#### IA-1 · WeekSelectorHeader is a duplicate / orphaned component

**Severity: Medium**
**File:** `src/components/recipe-manager/week-planner/WeekSelectorHeader.tsx`

`WeekSelectorHeader` is a complete standalone implementation of the week header
— sticky bar, This/Next week toggles, Calendar button, Grocery button,
date-range label, and meal count — that already exists verbatim as inline JSX
inside `WeekWorkspace` (lines 315–395). If it is not currently imported
anywhere it is dead code left from the restructuring. If it is imported
elsewhere, two implementations will silently diverge.

**Correct behaviour:** Run a codebase-wide import search. Delete if orphaned.

---

#### IA-2 · "Add recipe" from week tab loses day context

**Severity: Medium**
**Files:** `src/components/recipe-manager/RecipeManager.tsx:636`,
`src/components/recipe-manager/week-planner/WeekWorkspace.tsx:405`

Tapping "Add a recipe" on an empty day in `WeekPlanView` calls
`onAddRecipe={() => onClose()}`, which resolves to `setView('library')`. The
user is silently dropped into the library with no record of which day they
intended to fill. After saving, the week tab does not reopen.

**Correct behaviour:** The empty-day CTA should carry the target day as context
and return the user to the week tab after saving.

---

#### IA-3 · `onShare` in WeekPlanView is a dead prop

**Severity: Low**
**File:** `src/components/recipe-manager/week-planner/WeekPlanView.tsx:309`

`onShare` is received as a prop but aliased to `_onShare` and never used.
Recipe sharing is inaccessible from within the plan view, blocking the "share
with family" user job for already-planned recipes.

**Correct behaviour:** Either thread the handler through to day cards, or
remove the prop entirely to eliminate the false affordance.

---

#### IA-4 · No visual link between active cooking session and week plan

**Severity: Medium**
**File:** `src/components/recipe-manager/RecipeManager.tsx:724–733`

`CookingStatusIndicator` renders for `view !== 'detail'`, so the cooking
mini-player can overlay the week plan. There is no connection between the active
session and the matching day card — the user cannot see at a glance which day's
recipe they are currently cooking.

**Correct behaviour:** Surface a "Cooking now" badge on the matching day card
when a session is active for that recipe ID.

---

### 2. Styling Coherence

---

#### S-1 · GroceryList uses seven phantom design tokens

**Severity: High**
**File:** `src/components/recipe-manager/grocery/GroceryList.tsx`

The following class names reference tokens that do not exist in `global.css` or
`tailwind.config.js`. Tailwind silently ignores unknown utilities, so every
affected element has no background, border, or colour.

| Line(s)       | Phantom class             | Replace with                                         |
| ------------- | ------------------------- | ---------------------------------------------------- |
| 127, 142, 143 | `bg-card-variant`         | `bg-muted`                                           |
| 153           | `bg-card-container`       | `bg-muted/30`                                        |
| 183           | `bg-card-container-low`   | `bg-card`                                            |
| 183           | `border-border-variant`   | `border-border`                                      |
| 193           | `border-border-variant`   | `border-border`                                      |
| 194           | `bg-card-container-high`  | _(remove — `opacity-50` alone achieves the dimming)_ |
| 238           | `text-foreground-variant` | `text-muted-foreground`                              |
| 280           | `border-border-variant`   | `border-border`                                      |
| 314           | `text-gray-300`           | `text-muted-foreground/50`                           |

---

#### S-2 · LibraryRecipeCard hardcoded whites break dark mode

**Severity: High**
**File:** `src/components/recipe-manager/library/LibraryRecipeCard.tsx`

| Line | Current                       | Replace with                                  |
| ---- | ----------------------------- | --------------------------------------------- |
| 37   | `border-gray-400 bg-white/80` | `border-muted-foreground/30 bg-background/80` |
| 102  | `bg-white/50`                 | `bg-secondary/50`                             |

---

#### S-3 · DetailHeader favourite button uses light-only tinting

**Severity: Medium**
**File:** `src/components/recipe-details/DetailHeader.tsx:47`

`bg-red-50 hover:bg-red-100` are near-white in light mode and invisible in dark
mode.

**Correct values:** `bg-red-500/10 hover:bg-red-500/20` — opacity-based tinting
that works on any surface colour.

---

#### S-4 · Sync notification action buttons hardcode white

**Severity: Medium**
**File:** `src/components/recipe-manager/RecipeManager.tsx:790,795`

`bg-white/20 hover:bg-white/30 text-white/70 hover:text-white` — hardcoded
white against `bg-primary`. If `--primary` is ever a light value these become
illegible.

**Correct values:**
`bg-primary-foreground/20 hover:bg-primary-foreground/30`
`text-primary-foreground/70 hover:text-primary-foreground`

---

#### S-5 · RecipeLibrary empty state uses raw Tailwind grey

**Severity: Medium**
**File:** `src/components/recipe-manager/RecipeLibrary.tsx:158`

`text-gray-400` → `text-muted-foreground`

---

#### S-6 · GroceryList fallback uses raw Tailwind grey

**Severity: Low**
**File:** `src/components/recipe-manager/grocery/GroceryList.tsx:314`

`text-gray-300` on the `ShoppingBasket` icon → `text-muted-foreground/50`

---

#### S-7 · Selection bar uses raw RGBA custom shadow

**Severity: Low**
**File:** `src/components/recipe-manager/RecipeManager.tsx:695`

`shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]` → remove (the existing
`border-t border-border` provides sufficient separation) or replace with
`shadow-md`.

---

#### S-8 · RecipeLibrary itemVariants uses tween, not spring

**Severity: Medium**
**File:** `src/components/recipe-manager/RecipeLibrary.tsx:28–37`

The design system mandates `type: 'spring', bounce: 0` for list item entrance
animations. `type: 'tween', duration: 0.2` is the primary surface animation in
the app — every recipe card entry fires it.

```ts
// Current
transition: { type: 'tween', duration: 0.2 }

// Correct
transition: { type: 'spring', bounce: 0, duration: 0.3 }
```

---

#### S-9 · Toast motion.divs default to tween

**Severity: Low**
**File:** `src/components/recipe-manager/RecipeManager.tsx:757–762,846–851`

Both the family sync notification and `ReminderToast` `motion.div` elements
animate `y`/`opacity` with no `transition` prop, causing Framer Motion to use
tween easing.

**Correct value:** Add `transition={{ type: 'spring', bounce: 0, duration: 0.4 }}`
to both.

---

### 3. Interaction Coherence

---

#### I-1 · "Add to Week" touch target is 24 px — less than half the minimum

**Severity: High**
**File:** `src/components/recipe-manager/RecipeCard.tsx:241–258`

The "Add to Week" button wraps a `Badge` with explicit class `h-6 w-6` (24 px).
The 44 px minimum (MIT Touch Lab) is violated by 20 px on the highest-traffic
planning action in the app.

**Correct behaviour:** Replace the badge-as-button pattern with a proper
`h-11 w-11 rounded-full` button containing a `Plus` icon.

```tsx
<button
  onClick={(e) => {
    e.stopPropagation()
    onToggleThisWeek(recipe.id)
  }}
  aria-label="Add to Week"
  className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-accent hover:text-foreground focus:outline-none active:scale-95"
>
  <Plus className="h-4 w-4" />
</button>
```

---

#### I-2 · RecipeCard plannedDates are stale in React.memo

**Severity: High**
**File:** `src/components/recipe-manager/RecipeCard.tsx:60–96`,
`src/components/recipe-manager/RecipeLibrary.tsx`

`getPlannedDatesForRecipe` is called inside `React.memo`. When `weekStore`
changes, `RecipeLibrary` re-renders (it subscribes), but `memo` blocks the card
from re-running because the `recipe` prop reference is unchanged. "Planned" day
badges are stale after any plan modification. The bug is fully documented in the
component's own comments.

**Correct behaviour:** Compute `plannedDates` in `RecipeLibrary` (which already
subscribes) and pass it as a prop:

```tsx
// RecipeLibrary — in the recipe map:
<RecipeCard
  plannedDates={getPlannedDatesForRecipe(recipe.id).filter((p) => p.isCurrentWeek)}
  // ...
/>

// RecipeCard — remove internal getPlannedDatesForRecipe call and the ~35-line
// stale-state comment block. Consume the prop directly.
```

---

#### I-3 · RecipeManagerView error state shows a spinner icon

**Severity: Medium**
**File:** `src/components/recipe-manager/RecipeManagerView.tsx:94`

A `Loader2` spinning icon inside the `destructive/10` error container signals
"still loading" rather than "something went wrong", violating heuristic 1
(visibility of system status).

**Correct behaviour:** Replace `Loader2` with `AlertCircle`.

---

#### I-4 · WeekWorkspace header buttons are 32 px

**Severity: Medium**
**File:** `src/components/recipe-manager/week-planner/WeekWorkspace.tsx`

| Line    | Element              | Current   | Correct     |
| ------- | -------------------- | --------- | ----------- |
| 321     | Minimize/Back button | `h-8 w-8` | `h-11 w-11` |
| 362     | Calendar button      | `h-8 w-8` | `h-11 w-11` |
| 462–477 | Refresh icon button  | `h-8 w-8` | `h-11 w-11` |
| 482–490 | Share icon button    | `h-8 w-8` | `h-11 w-11` |
| 493–500 | Copy icon button     | `h-8 w-8` | `h-11 w-11` |

---

#### I-5 · RecipeControlBar filter button is 40 px

**Severity: Medium**
**File:** `src/components/recipe-manager/RecipeControlBar.tsx:70`

`h-10 w-10` → `h-11 w-11`

---

#### I-6 · GlobalBurgerMenu items have no touch feedback

**Severity: Medium**
**File:** `src/components/layout/GlobalBurgerMenu.tsx:105–234`

All menu item buttons rely solely on `hover:bg-accent`. Touch devices do not
fire `:hover`, so every tap is visually silent.

**Correct behaviour:** Add `active:bg-accent` to each menu item button's
className. Optionally wrap in `motion.button whileTap={{ scale: 0.98 }}`.

---

#### I-7 · WeekPlanView swipe gesture has no visible affordance

**Severity: Medium**
**File:** `src/components/recipe-manager/week-planner/WeekPlanView.tsx`

Swipe right = cook, swipe left = action menu. No visual hint exists. Design
system rule: gestures must always pair with a visible control.

**Correct behaviour:** Add three horizontal drag-handle lines to the right edge
of each `SwipeableRecipeCard`:

```tsx
<div className="flex shrink-0 flex-col gap-0.5 pr-1 text-muted-foreground/30">
  <div className="h-0.5 w-4 rounded-full bg-current" />
  <div className="h-0.5 w-4 rounded-full bg-current" />
  <div className="h-0.5 w-4 rounded-full bg-current" />
</div>
```

---

#### I-8 · ReminderToast dismiss button has no touch target

**Severity: Medium**
**File:** `src/components/recipe-manager/RecipeManager.tsx:860–868`

Bare `<button>` with a `size-4` icon and no padding — approximately 16 px.

**Correct behaviour:**

```tsx
<button
  onClick={...}
  className="flex h-11 w-11 items-center justify-center rounded-full
             text-muted-foreground hover:text-foreground hover:bg-accent
             active:scale-95 transition-all"
  aria-label="Dismiss reminder"
>
  <X className="h-4 w-4" />
</button>
```

---

#### I-9 · RecipeCard management button is 32 px

**Severity: Low**
**File:** `src/components/recipe-manager/RecipeCard.tsx:270`

`h-8 w-8` → `h-11 w-11` (visible only in week-management context)

---

## Part 2 — Implementation Plan

Issues are grouped to minimise file conflicts between parallel agents.

---

### Agent A — GroceryList phantom tokens

**Files touched:** `GroceryList.tsx` only
**Fixes:** S-1, S-6

Replace all phantom token classes per the table in S-1. Replace `text-gray-300`
with `text-muted-foreground/50` at line 314. Run a final grep for `card-variant`,
`card-container`, `border-variant`, `foreground-variant` to confirm no survivors.

---

### Agent B — RecipeCard + RecipeLibrary

**Files touched:** `RecipeCard.tsx`, `RecipeLibrary.tsx`
**Fixes:** I-1, I-2, I-9, S-5, S-8

1. **I-1:** Replace `Badge`-as-button with `h-11 w-11 rounded-full` button (lines 241–258).
2. **I-2:** Add `plannedDates: PlannedDate[]` prop to `RecipeCardProps`. Remove the
   internal `getPlannedDatesForRecipe` call and the ~35-line stale-state comment
   block. In `RecipeLibrary`, compute `plannedDates` per recipe inside the map
   (the component already subscribes to `allPlannedRecipes`) and pass as prop.
   Apply to all three `<RecipeCard>` render sites (search results, filtered list,
   selection mode does not show badges so can pass empty array).
3. **I-9:** Change management button from `h-8 w-8` to `h-11 w-11`.
4. **S-5:** Change `text-gray-400` to `text-muted-foreground` on empty state (line 158).
5. **S-8:** Change `itemVariants` transition from `type: 'tween', duration: 0.2` to
   `type: 'spring', bounce: 0, duration: 0.3`.

---

### Agent C — LibraryRecipeCard + DetailHeader

**Files touched:** `library/LibraryRecipeCard.tsx`, `recipe-details/DetailHeader.tsx`
**Fixes:** S-2, S-3

1. **S-2 line 37:** `border-gray-400 bg-white/80` → `border-muted-foreground/30 bg-background/80`
2. **S-2 line 102:** `bg-white/50` → `bg-secondary/50`
3. **S-3 line 47:** `bg-red-50 hover:bg-red-100` → `bg-red-500/10 hover:bg-red-500/20`

---

### Agent D — RecipeManager.tsx consolidation

**Files touched:** `RecipeManager.tsx` only
**Fixes:** S-4, S-7, S-9, I-8

1. **S-4 lines 790, 795:** Replace `bg-white/20`, `hover:bg-white/30`, `text-white/70`,
   `hover:text-white` with `primary-foreground` equivalents.
2. **S-7 line 695:** Remove `shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]` from selection
   bar (or replace with `shadow-md`).
3. **S-9 lines 757–762:** Add `transition={{ type: 'spring', bounce: 0, duration: 0.4 }}`
   to sync notification `motion.div`.
4. **S-9 lines 846–851:** Add `transition={{ type: 'spring', bounce: 0, duration: 0.4 }}`
   to `ReminderToast` `motion.div`.
5. **I-8 lines 860–868:** Wrap dismiss `X` button in `h-11 w-11` touch target (see
   code snippet in I-8).

---

### Agent E — WeekWorkspace + RecipeControlBar + RecipeManagerView

**Files touched:** `week-planner/WeekWorkspace.tsx`, `RecipeControlBar.tsx`,
`RecipeManagerView.tsx`
**Fixes:** I-4, I-5, I-3

1. **I-4:** In `WeekWorkspace`, change all five `h-8 w-8` icon buttons to `h-11 w-11`
   (Minimize, Calendar, Refresh, Share, Copy).
2. **I-5:** In `RecipeControlBar`, change filter button from `h-10 w-10` to
   `h-11 w-11`.
3. **I-3:** In `RecipeManagerView` error block (line ~94), replace `Loader2` with
   `AlertCircle`. Ensure `AlertCircle` is imported from `lucide-react`.

---

### Agent F — GlobalBurgerMenu + WeekPlanView + WeekSelectorHeader

**Files touched:** `layout/GlobalBurgerMenu.tsx`,
`week-planner/WeekPlanView.tsx`, `week-planner/WeekSelectorHeader.tsx`
**Fixes:** I-6, I-7, IA-1, IA-3

1. **I-6:** Add `active:bg-accent` to every menu item `<button>` in
   `GlobalBurgerMenu` (approximately 10 instances sharing the same base class
   pattern).
2. **I-7:** Add a drag-handle affordance (three `h-0.5 w-4 rounded-full bg-current`
   divs) inside `SwipeableRecipeCard`, to the right of the recipe info column.
3. **IA-1:** Run `grep -r "WeekSelectorHeader" src/` — if no active imports are
   found, delete `WeekSelectorHeader.tsx`. If imports exist, leave the file and
   add a `// TODO: reconcile with WeekWorkspace inline header` comment.
4. **IA-3:** In `WeekPlanView`, rename `_onShare` back to `onShare` and thread it
   into `SwipeableRecipeCard` as an additional swipe-left action (Share button
   alongside Move and Delete), **or** remove the prop from `WeekPlanViewProps`
   and its pass-through in `WeekWorkspace` if sharing from the plan view is out
   of scope.

---

### Top 5 by Impact

| #   | Fix                                   | Why first                                                                  |
| --- | ------------------------------------- | -------------------------------------------------------------------------- |
| 1   | S-1 GroceryList phantom tokens        | Entire grocery tab is visually broken — missing backgrounds and borders    |
| 2   | I-1 Add to Week 24 px target          | Core planning action present on every card but nearly untappable on mobile |
| 3   | I-2 Stale plannedDates in memo        | "Planned" badges show wrong state after plan changes — trust-breaking      |
| 4   | S-2 LibraryRecipeCard hardcoded white | Dark mode broken for this card variant                                     |
| 5   | S-8 tween→spring on RecipeLibrary     | Wrong animation type on the highest-frequency animation in the app         |

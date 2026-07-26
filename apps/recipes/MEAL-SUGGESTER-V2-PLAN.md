# Meal Suggester V2 (Conversational) + Week Review Fixes — Implementation Plan

> **Updated**: 2026-07-26
> **Status**: Planning Complete — Ready for Phase 1
> **Branch**: Feature work should branch from `main`
> **Supersedes**: the stepped-wizard suggester shipped in PRs #102–#104

---

## Overview

The two features at the top of the week plan — "How did last week go?" (`WeekReviewPrompt`) and
"Help me pick this week" (`MealSuggester`) — work, but a review on 2026-07-26 found them usable
rather than useful. Three classes of problem:

1. **Silent failures.** Four separate paths lose the cook's input without saying so — a partial
   review silently records the rest as "Didn't make it" and closes the week forever, a failed
   review save is indistinguishable from a successful one, a failed "Add to week" still increments
   the counter, and the suggester drops any suggestion it can't resolve locally.
2. **A one-way exchange.** The suggester's ask button disappears after the first request
   (`MealSuggester.tsx:341`), so changing an answer is a dead end. The only re-ask is "Show me
   others", which permanently rejects everything on screen — including cards you were still
   considering.
3. **A form pretending to be a conversation.** Step 3 is thirty static filter chips, which is
   precisely what the design brief said it wasn't, and the primary action sits below all of them.

The fix is to make the exchange actually conversational: **the model chooses the next question and
the options in it, taps drive the narrowing, and a text composer appears after the first
suggestions so the cook can react to something concrete.** "Too much chicken" is only sayable once
you have been shown three chickens — which is why the composer is deliberately not available before
that point.

---

## Key Architectural Decisions

### 1. Generative UI from a closed widget vocabulary — not generated markup

The model returns a typed `Turn` the client knows how to render. It never returns HTML or JSX.

**Why:** a strict CSP, a PWA saved to the home screen, and no runtime JSX compiler all rule out
free-form markup, and none of the value requires it. The model choosing *which question to ask and
what to offer* is the whole feature; how a recipe card looks is not its business.

**Trade-off accepted:** new interaction shapes require a client release, not just a prompt change.

### 2. Code owns the state; the model owns the question

The typed constraint object (`RecipeFacets` + `wanted` + `kept` + `rejected`) stays the single
source of truth. Widget answers write into it. The conversation is replayed to the model for
context, but filtering, exclusion and the deterministic fallback all read the typed state.

**Why:** `matchesFacets` and `fallbackSuggestions` keep working unchanged, and a model that goes off
the rails cannot corrupt what gets filtered. It also makes the constraint object a lossless
compaction of the transcript — which is what lets history replay stay capped (see decision 5).

### 3. Every offered option must be grounded in the real library

After the model proposes chips, the server counts how many recipes each option matches under the
constraints so far, drops zero-count options, and drops the whole widget if fewer than two survive.

**Why:** this is the difference between feeling smart and feeling stupid. An ungrounded model will
offer "Thai" and "Under 20 minutes" to a library that has neither. Today's static chips at least
come from `recipe-facets.ts`, where counts were checked by hand — dynamic options must earn the
same guarantee. Same discipline as `parseSuggestions`, extended from picks to UI.

### 4. Free text materialises as a visible, removable chip

A feedback turn may return a `ConstraintPatch` alongside its reply. The server validates it against
the known vocabularies, applies it to the typed state, and the client renders the result as a
removable chip ("no chicken ✕").

**Why:** the failure mode of a chat is a black box — you type a sentence, results change, and you
have no idea what the app now believes about you. Nothing invisible may accumulate.

### 5. No streaming in V1

With `thinkingBudget: 0` on `GEMINI_TEXT_MODEL` over ~8,300 menu tokens, a turn should land in
1–2s. Streaming structured output means parsing partial JSON and adding a second NDJSON contract to
an app whose first one took PRs #65–#68 to stabilise.

**Instead:** prefetch turn 1 when the "Help me pick this week" card mounts, keep previous turns on
screen during a request, and show a typing indicator. Revisit only if measured turn latency exceeds
~3s.

### 6. The current wizard becomes the degraded path

When the model is unavailable, the server returns a static `Turn` expressing today's three steps as
widgets, and picks come from `fallbackSuggestions`. The fallback is expressed in the same contract
rather than being a separate code path — same argument as Raw being the fallback for the Smart
grocery list.

---

## The Turn Contract

New module: `src/lib/services/suggest-turns.ts` (pure — no Firestore, no Gemini, fully unit-testable).

```typescript
export type Widget =
  | { kind: 'chips'; id: string; mode: 'one' | 'many'
      options: Array<{ label: string; value: string; count: number }> }
  | { kind: 'counter'; id: string; min: number; max: number; value: number }
  | { kind: 'recipes'; picks: Array<{ n: number; why: string }> }
  | { kind: 'text'; id: string; placeholder: string }
  | { kind: 'actions'; options: Array<{ label: string; intent: 'more' | 'done' | 'restart' }> }

export interface Turn {
  /** One or two sentences, in the waiter's voice. */
  say: string
  widgets: Widget[]
  /** Proposed edit to the typed state. Server validates before applying. */
  patch?: ConstraintPatch
}

export type ConstraintPatch = {
  proteins?: { add?: string[]; remove?: string[] }
  dishTypes?: { add?: string[]; remove?: string[] }
  cuisines?: { add?: string[]; remove?: string[] }
  difficulties?: { add?: string[]; remove?: string[] }
  maxMinutes?: number | null
  excludeIds?: string[]
  wanted?: number
}

/** What the cook has decided so far. The transcript is context; this is the truth. */
export interface Constraints {
  wanted: number
  mood: string[]
  facets: RecipeFacets
  keptIds: string[]
  rejectedIds: string[]
}
```

**Request/response shape** for `POST /api/week/suggest`:

```typescript
// Request
{ conversation: ConversationEntry[], constraints: Constraints }
// Response
{ success: true, turn: Turn, constraints: Constraints, degraded?: boolean, exhausted?: boolean }
```

The server returns the *post-patch* constraints so the client never derives them independently.

**Composer visibility is a client rule, not a model decision:** the text composer appears once a
`recipes` widget has been rendered at least once, and stays thereafter. The model may still emit a
`text` widget mid-narrowing when typing genuinely helps, but it cannot summon the persistent
composer early.

---

## Prompt Structure

`buildPrompt` currently places the varying parts (wanted, mood, kept) *before* the ~8,300-token
menu. Harmless for a one-shot call; fatal for a multi-turn one, because a stable prefix is what
makes implicit caching hit.

Split into:

- `buildMenuBlock(recipes, signals)` — byte-identical across every turn in a session, emitted first.
- `buildTurnPrompt(conversation, constraints)` — the varying tail.

Verify with `usageMetadata` on the response that cached tokens are actually counted, rather than
assuming. Note that turn count now multiplies request volume: `SUGGEST_RATE_LIMIT` (currently 60/hr)
is per-turn, not per-session.

**History replay:** cap at the last ~6 entries. A previous suggestion turn must replay as an ordered
list with titles and facts, not opaque ids, or ordinal references ("not the second one") cannot
resolve:

```
Offered: 1. Buzhenina, Roasted Garlic Pork (Pork, 75m)
         2. Sheet Pan Tandoori Chicken (Chicken, 40m)
```

---

## Phase 1: Stop Losing the Cook's Input

> **Goal**: Close the four silent-failure paths. Must land before any conversational work — a
> conversation that silently shows 3 of 5 requested meals reads as broken in a way a form does not.
>
> **Risk**: Low. Bug fixes with clear correct behaviour; one touches an access rule, so review it
> against `recipe-access.ts` carefully.

### Tasks

| #   | Task | File(s) | Status | Notes |
| --- | ---- | ------- | ------ | ----- |
| 1.1 | Extract shared recipe-visibility query | `src/lib/recipe-access.ts` | `[ ]` | Lift the `createdBy IN [me, ...family] UNION createdBy == null` logic out of `pages/api/recipes/index.ts:150-165` into `listAccessibleRecipes(userId)`. |
| 1.2 | Fix suggester scoping bug | `src/pages/api/week/suggest.ts:81` | `[ ]` | `\|\| familyId` is truthy for anyone in a family, making the filter a no-op — the model currently sees every recipe in the database, including other families'. Replace with 1.1. |
| 1.3 | Drop the full-collection scan | `src/pages/api/week/suggest.ts:80` | `[ ]` | `db.getCollection('recipes')` on every ask. Comes free with 1.1; see PERFORMANCE-PLAN.md for why the list endpoint avoids it. |
| 1.4 | Surface unresolvable suggestions | `MealSuggester.tsx:364` | `[ ]` | `byId.get(...) → return null` silently renders nothing. Count them; if any, re-ask for the shortfall or tell the cook. |
| 1.5 | Check the review save response | `WeekWorkspace.tsx:109-123` | `[ ]` | No `res.ok` check and no `try`/`catch`. A 400 (no family) or 500 clears the prompt as if it saved; a network error throws unhandled. Keep the screen open and show the error. |
| 1.6 | Stop defaulting unanswered to `skipped` | `WeekReviewPrompt.tsx:45` | `[ ]` | Submit only what was answered. "Save 2 of 5" must not record 3 × "Didn't make it". |
| 1.7 | Partial reviews stay open | `src/pages/api/week/review.ts:131-139` | `[ ]` | Accept `partial: true`; only add to `reviewedWeeks` when every recipe was answered or the cook explicitly dismisses. Add an explicit "Don't ask about this week" action. |
| 1.8 | Honour the add-to-week result | `MealSuggester.tsx:210`, `WeekWorkspace.tsx:566` | `[ ]` | `addRecipeToWeek` returns `false` on failure and the boolean is discarded; the card is already gone and the counter already incremented. Roll back and report. |
| 1.9 | Tests | `tests/meal-planner.spec.ts`, new unit tests | `[ ]` | Cover: partial save keeps the week open, failed save keeps the screen, failed add restores the card, out-of-library suggestion is surfaced not swallowed. |

### Considerations for Future Sessions

- 1.2 is also a privacy issue, not only a usefulness one — it is the reason a suggestion can
  reference a recipe the cook does not own and the card then renders as nothing.
- 1.6/1.7 change what a "reviewed week" means. Existing `reviewedWeeks` entries stay valid; only
  newly-partial weeks behave differently.

---

## Phase 2: Touch Targets and Screen Chrome

> **Goal**: Land the shared chip component before the conversation starts generating chips
> dynamically, and make the week's full screens actually full screens.
>
> **Risk**: Low, but it touches `RecipeManager`'s tab-bar rendering — verify on a real phone.

### Tasks

| #   | Task | File(s) | Status | Notes |
| --- | ---- | ------- | ------ | ----- |
| 2.1 | Shared `Chip` component | `src/components/ui/Chip.tsx` (new) | `[ ]` | `min-h-11` per the 44px rule in `.agent/rules/04-ios-webkit.md`. The identical `px-3 py-1.5 text-sm` string is currently written twice (`WeekReviewPrompt.tsx:82`, `MealSuggester.tsx:63`) at ~30px tall. |
| 2.2 | Adopt in both week screens | `WeekReviewPrompt.tsx`, `MealSuggester.tsx` | `[ ]` | `RecipeFilters.tsx` is a deliberate follow-up, not this phase. |
| 2.3 | Collapsed step rows to 44px | `MealSuggester.tsx:98-108` | `[ ]` | `py-1` gives a ~28px reopen target. |
| 2.4 | Step "Next" as a real button | `MealSuggester.tsx:278-284` | `[ ]` | No horizontal padding — the target is only as wide as the word. |
| 2.5 | Hide the tab bar under a week overlay | `weekStore.ts`, `RecipeManager.tsx:476` | `[ ]` | Add a `$weekOverlayOpen` atom set by `WeekWorkspace`. `BottomTabBar` (`fixed z-50`, later in DOM) currently paints over `WeekScreen` (`absolute z-50`) — one tap discards the whole exchange. |
| 2.6 | Viewport meta for the keyboard | `src/layouts/RecipeLayout.astro:29` | `[ ]` | Add `interactive-widget=resizes-content`. Do **not** touch `user-scalable`/`maximum-scale` (forbidden by CLAUDE.md). Needed by Phase 5. |
| 2.7 | Header and padding cleanup | `WeekScreen.tsx:44-49`, `WeekPlanView.tsx:280` | `[ ]` | Title/subtitle read as unrelated lines; `pb-24` sits inside a container that already has `pb-tab-bar` (~216px dead space). |

---

## Phase 3: Turn Contract and Server

> **Goal**: A validated, grounded, testable turn engine behind the existing endpoint. No UI work.
>
> **Risk**: Medium — this is where model output meets a typed contract. All validators are pure and
> unit-tested with no model in the loop.

### Tasks

| #   | Task | File(s) | Status | Notes |
| --- | ---- | ------- | ------ | ----- |
| 3.1 | Turn/Widget/Patch types + guards | `src/lib/services/suggest-turns.ts` (new) | `[ ]` | Pure module. Reject anything not matching the shape rather than coercing. |
| 3.2 | Option grounding | `src/lib/services/suggest-turns.ts` | `[ ]` | `countMatching()` per option under current constraints; drop zeros; drop the widget if <2 survive. Decision 3. |
| 3.3 | Patch validation + apply | `src/lib/services/suggest-turns.ts` | `[ ]` | Values must exist in `recipe-facets.ts` vocabularies. `excludeIds` must be real recipe ids. Clamp `wanted` to 1..`MAX_WANTED`. |
| 3.4 | Split the prompt for caching | `src/lib/services/suggest-core.ts:131` | `[ ]` | `buildMenuBlock()` first (stable), `buildTurnPrompt()` last. Confirm cached tokens via `usageMetadata`. |
| 3.5 | Gemini response schema | `src/pages/api/week/suggest.ts:126-133` | `[ ]` | Explicit `responseSchema` for `Turn`. Keep `temperature: 0.8` for pick variety. |
| 3.6 | New endpoint request/response shape | `src/pages/api/week/suggest.ts` | `[ ]` | Accept `{ conversation, constraints }`; return `{ turn, constraints }`. Only `MealSuggester` calls this, so no compatibility shim needed. |
| 3.7 | Degraded turn | `src/pages/api/week/suggest.ts:142` | `[ ]` | Express today's three wizard steps as a static `Turn`; picks from `fallbackSuggestions`. Decision 6. |
| 3.8 | Exhaustion guard | `src/pages/api/week/suggest.ts:109` | `[ ]` | After applying a patch, if the pool drops below `wanted`, say so rather than returning a short set. |
| 3.9 | Rate limit review | `src/pages/api/week/suggest.ts:27` | `[ ]` | 60/hr is now per-turn. Raise deliberately. |
| 3.10 | Unit tests | `src/lib/services/suggest-turns.test.ts` (new) | `[ ]` | Ungrounded option dropped; widget with 1 survivor dropped; unknown protein in a patch rejected; out-of-range `wanted` clamped; malformed turn rejected. |

### Considerations for Future Sessions

- The prompt is the riskiest part, as it was in the grocery work. Budget iteration time for getting
  the model to ask *one* good question per turn rather than dumping every remaining facet.
- The model must be told to act rather than interrogate: a waiter does not ask three clarifying
  questions before bringing anything.

---

## Phase 4: The Transcript (Taps Only)

> **Goal**: Replace the fixed three-step wizard with a model-driven transcript. Tap interactions
> only — the composer lands in Phase 5.
>
> **Risk**: Medium. Rewrite of `MealSuggester`; E2E selectors change.

### Tasks

| #   | Task | File(s) | Status | Notes |
| --- | ---- | ------- | ------ | ----- |
| 4.1 | Conversation component | `week-planner/SuggesterConversation.tsx` (new) | `[ ]` | Replaces `MealSuggester.tsx`. Renders `Turn[]`; one renderer per widget kind. |
| 4.2 | Visible constraint chips | `week-planner/ConstraintBar.tsx` (new) | `[ ]` | Current constraints, each removable. Removing one appends a new turn. |
| 4.3 | Prefetch turn 1 | `WeekPlanView.tsx:302` | `[ ]` | Fire on mount of the "Help me pick this week" card so the screen opens with a real question, not a spinner. |
| 4.4 | Keep prior turns during load | — | `[ ]` | Today `{!loading && suggestions.map(...)}` blanks the screen every round. Append a typing indicator instead. |
| 4.5 | Old widgets append, never mutate | — | `[ ]` | Tapping an earlier answer adds a new turn. This is what kills the current dead end where changing an answer does nothing. |
| 4.6 | Per-card dismiss | — | `[ ]` | ✕ on a card adds to `rejectedIds` locally, no model call. Replaces batch `rejectCurrent`, which discards cards the cook was still considering. |
| 4.7 | Kept meals as transcript rows | — | `[ ]` | "Added Buzhenina to the week", with un-keep in the same row. There is currently no way to undo a keep. |
| 4.8 | An ending | — | `[ ]` | `actions` widget with `done` returns to the plan. Today the only button after filling the week is still "Show me others". |
| 4.9 | Scroll behaviour | — | `[ ]` | Auto-scroll to the newest turn unless the cook has scrolled up. |
| 4.10 | Playwright with mocked turns | `tests/meal-planner.spec.ts` | `[ ]` | Existing specs drive `getByRole('button', { name: 'comforting' })`, which is meaningless with dynamic options. Assert against fixed turn payloads. |

### Considerations for Future Sessions

- `wanted` semantics need fixing here: `stillNeeded = wanted - kept.length` (`MealSuggester.tsx:155`)
  ignores what is already on the plan, and `Math.max(1, stillNeeded || wanted)` (line 183) requests a
  full new batch once the week is full. The model should ask "you have 3 already — how many more?"
- Opening a recipe from a suggestion currently unmounts the whole workspace
  (`RecipeManager.tsx:462` → `view: 'detail'`), losing the exchange. Needs a peek sheet rather than a
  route change. Scope this explicitly; it may warrant its own PR.

---

## Phase 5: Feedback Composer

> **Goal**: After the first suggestions, let the cook say what is wrong in words, and have that
> become visible state.
>
> **Risk**: Medium — keyboard handling on iOS standalone is the historical trouble spot.

### Tasks

| #   | Task | File(s) | Status | Notes |
| --- | ---- | ------- | ------ | ----- |
| 5.1 | Composer, gated client-side | `week-planner/SuggesterComposer.tsx` (new) | `[ ]` | Appears once a `recipes` widget has rendered; persists after. Not model-controlled. |
| 5.2 | Teaching placeholder | — | `[ ]` | "Too heavy? Not enough veg? Say so." — not "Type a message". |
| 5.3 | Cook bubble register | `SuggesterConversation.tsx` | `[ ]` | Right-aligned bubble for typed text, distinct from the collapsed-answer register used by taps. |
| 5.4 | Patch → chip | `ConstraintBar.tsx` | `[ ]` | "too much chicken" produces a visible, removable **no chicken ✕**. Decision 4. |
| 5.5 | Keyboard handling | `SuggesterComposer.tsx` | `[ ]` | Pin above `env(safe-area-inset-bottom)`; on focus, scroll the last suggestion turn into view — the keyboard otherwise covers the exact cards being discussed. |
| 5.6 | Honest degradation | — | `[ ]` | If the model is down, do not pretend to have understood the sentence: say so and fall back under existing constraints. |
| 5.7 | History cap | `suggest.ts` | `[ ]` | Replay ~6 entries; constraints carry the rest losslessly. |
| 5.8 | E2E | `tests/meal-planner.spec.ts` | `[ ]` | Typed feedback → mocked patch turn → chip appears → chip removable. |

---

## Phase 6: Signal Quality and the Week Review

> **Goal**: Make the data the suggester reads actually reflect what happened, and finish the review
> screen's UX.
>
> **Risk**: Low-to-medium. 6.4 introduces a new Firestore document shape.

### Tasks

| #   | Task | File(s) | Status | Notes |
| --- | ---- | ------- | ------ | ----- |
| 6.1 | Fix the `meh` double-count | `src/pages/api/week/suggest.ts:91-94` | `[ ]` | A "meh" writes both a `cookingHistory` entry (read back as `'good'`, +1) and a 2-star review (`'meh'`, −2), netting −1 instead of −2. Also asymmetric: a manual 2-star counts, a manual 5-star does not. |
| 6.2 | Fix the empty-facet match | `src/lib/services/suggest-core.ts:65-69` | `[ ]` | `'chicken'.includes('')` is `true`, so every recipe with no protein recorded matches every protein filter. The time facet handles absent data deliberately; the string facets do the opposite by accident. |
| 6.3 | Write `lastCooked` | `src/pages/api/week/review.ts` | `[ ]` | Still never set anywhere, so `RecipeReviews.tsx:205`'s "Last: …" line never appears despite the review now recording cooks. |
| 6.4 | Record weeks as weeks | `families/{id}/weekPlans/{weekStart}` (new) | `[ ]` | The review reconstructs last week from `weekPlan.assignedDate` — one mutable value per recipe. Re-plan or remove a recipe and it silently drops out of last week's review. |
| 6.5 | Floor the review backlog | `src/lib/week-review.ts:42` | `[ ]` | `weekAwaitingReview` walks backwards one unreviewed week at a time forever. With six months of planning it will ask about April. Ignore/auto-close anything older than ~3 weeks. |
| 6.6 | Batch the review writes | `src/pages/api/week/review.ts:93-129` | `[ ]` | Sequential `getDocument` + `setDocument` per recipe (~12 round trips for a five-meal week) behind a "Saving…" button. Full-document overwrites also clobber a concurrent family member's write. |
| 6.7 | Review screen UX | `WeekReviewPrompt.tsx` | `[ ]` | Thumbnails (a week-old meal recalled from a title alone); the disabled "Save 0 of 2" grey slab as the default state; pin the action; allow clearing an answer; deduplicate the copy the entry card already says. |
| 6.8 | Surface the no-family case | `src/pages/api/week/review.ts:33` | `[ ]` | Returns `pending: null` — the feature silently does not exist and never says why. |

---

## File Change Summary

### New Files

| File | Purpose |
| ---- | ------- |
| `src/lib/services/suggest-turns.ts` | Turn/Widget/Patch types, grounding, patch validation (pure) |
| `src/lib/services/suggest-turns.test.ts` | Unit tests for the above |
| `src/components/ui/Chip.tsx` | Shared 44px chip |
| `src/components/recipe-manager/week-planner/SuggesterConversation.tsx` | Transcript renderer |
| `src/components/recipe-manager/week-planner/SuggesterComposer.tsx` | Feedback composer |
| `src/components/recipe-manager/week-planner/ConstraintBar.tsx` | Visible, removable constraints |

### Modified Files

| File | Change |
| ---- | ------ |
| `src/pages/api/week/suggest.ts` | Turn-based contract, scoping fix, grounding, degraded turn, rate limit |
| `src/pages/api/week/review.ts` | Partial saves, `lastCooked`, batched writes, week records |
| `src/lib/services/suggest-core.ts` | Prompt split for caching; empty-facet match fix |
| `src/lib/recipe-access.ts` | New `listAccessibleRecipes(userId)` |
| `src/lib/week-review.ts` | Backlog floor |
| `src/lib/weekStore.ts` | `$weekOverlayOpen` atom |
| `src/components/recipe-manager/RecipeManager.tsx` | Hide tab bar under a week overlay |
| `src/components/recipe-manager/week-planner/MealSuggester.tsx` | Replaced by `SuggesterConversation` |
| `src/components/recipe-manager/week-planner/WeekReviewPrompt.tsx` | Partial saves, chips, thumbnails |
| `src/components/recipe-manager/week-planner/WeekWorkspace.tsx` | Response checking, overlay flag |
| `src/components/recipe-manager/week-planner/WeekScreen.tsx` | Header alignment, padding |
| `tests/meal-planner.spec.ts` | Mocked-turn specs |

---

## Explicitly Not Doing

- **Free-form generated markup.** Decision 1.
- **Streaming.** Decision 5 — revisit if measured turn latency exceeds ~3s.
- **Cross-session learning from feedback.** "No chicken" is session-scoped. Suggestions stay generic
  until roughly six weeks of reviews accumulate; planning history carries it until then.
- **Per-day meal assignment.** `assignedDate` remains the week's Monday (`weekStore.ts:126`).
- **Migrating `RecipeFilters.tsx` to the shared chip.** Follow-up, to keep Phase 2 small.

---

## Open Questions

1. **Peek sheet vs. route change** for opening a recipe from a suggestion (Phase 4 considerations).
   Own PR, or folded into Phase 4?
2. **How aggressive should a patch be?** Does "too much chicken" exclude chicken outright, or
   downweight it? Excluding is legible and undoable; downweighting is closer to what a waiter does.
   Starting position: exclude, because the chip makes it visible and reversible.
3. **`SUGGEST_RATE_LIMIT` ceiling** once turns are per-request rather than per-session.

---

## Session Log

| Date | Session | Outcome |
| ---- | ------- | ------- |
| 2026-07-26 | Review of the week-plan review + suggester | ~25 findings across silent failures, one-way exchange, filter wall, touch targets, and scoring. Design agreed: closed widget vocabulary, taps first, composer after suggestions. This plan written. |

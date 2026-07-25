# Investigation + Redesign Plan: Recipe Import (Photo + Link)

Status: **Phases 1-4 shipped** (PRs #65, #66, #67). **Phase 5 (client-side) in progress** — see
below.

Written after a single evening produced seven separate import/enhancement bug reports
(undefined ingredients, description-in-instructions, silent enhancement no-op, 3000-character
title, lost instructions on a legible photo, `<highlight>` tags rendered literally, hung requests
with no retry) and each was fixed as its own PR. The request behind this doc: stop chasing
individual symptoms and find out why they keep appearing.

## The actual problem, stated plainly

**There are two entirely separate "parse a recipe from a photo" implementations in this
codebase, and nobody decided that on purpose.**

- **Initial import** (`parse-recipe.ts`): OpenRouter/qwen, a 3-phase pipeline (OCR ingredients +
  OCR instructions in parallel, then a text-only structuring pass), streamed as NDJSON, merged
  client-side with `Object.assign`.
- **Re-parse during Enhancement/Refresh** (`ai-parser.ts`'s `executeAiParse` +
  `IMAGE_SYSTEM_PROMPT`): Gemini, one call, structured output via `responseSchema`.

They share almost nothing — not the provider, not the prompt, not the number of calls, not the
response-shape guarantees. Tonight's title-pollution fix went into `IMAGE_SYSTEM_PROMPT`
(`ai-parser.ts`) because that's the path the reproduction happened to hit (Enhancement, re-parsing
an existing recipe's photo). **A fresh photo import today can still produce the exact same
3000-character polluted title** — the fix never reaches that path, and neither does the
`isPlausibleTitle` merge guard, for a second, independent reason below. Two people (or two future
sessions) fixing "the same bug" in good faith would edit two different files and both believe it
was fixed everywhere.

That's the headline structural cause. Underneath it, four more:

**1. "The call didn't throw" and "the result is usable" are treated as the same fact.**
Grocery generation, background Enhancement, and (until tonight) instruction OCR all shipped
`status: complete` for a result that was empty, wrong-shaped, or self-narrating nonsense. Every
"silent success" bug this session — the 0-item grocery lists, the enhancement no-op, the
undefined ingredients — is this same gap wearing a different costume.

**2. Reliability fixes were bolted onto call sites one at a time, not established as a policy.**
Retry-on-empty exists in `grocery-core.ts` and `enhancement-core.ts`. Retry-on-transient-error
exists only in `enhancement-core.ts`, and only above a 60s budget. Instruction OCR retries once.
**The photo-import structuring phase (phase 3) has zero retry. The entire URL/JSON-LD/Reddit/
pasted-text path has zero retry, anywhere.** There's no single answer to "does this AI call retry
on failure" — it depends which file you're reading.

**3. The merge-safety layer protects some writes and not others.** `mergeAiRecipeUpdate`
(`recipe-merge.ts`) owns `isPlausibleTitle`, `stripLeadingDescriptionEcho`, and the
never-overwrite-a-populated-array-with-empty guard — but it's only called by Refresh and
Enhancement. **A brand-new photo import never touches it.** `RecipeEditor.tsx`'s
`handleRecipeParsed` merges the parsed result with a raw `{...prev, ...parsed}` spread — no
guards at all. Separately, `normalizeIngredients`/`normalizeSteps` in `parse-recipe.ts` protect
the *photo* import path specifically, but `buildTextRecipeStream` (URL, JSON-LD, Reddit, pasted
text — four of five import sources) calls none of it.

**4. Five independent prompt surfaces define what a "Recipe" JSON should look like**
(`IMAGE_SYSTEM_PROMPT`, `TEXT_SYSTEM_PROMPT`, `URL_SYSTEM_PROMPT`, `JSON_LD_SYSTEM_PROMPT`, plus
the inline phase-3 structuring prompt in `parse-recipe.ts`). Tonight's rules drifted from the
actual target style (step count, "why" placement) without anyone deciding to diverge — they just
each evolved separately. There's also no logging: `ai_error_logs` sat completely empty through
every failure tonight because the VM worker never calls `logAiError`, so none of this is
measurable without a live debugging session like this one.

## What it should look like instead

**Two providers where there's a real reason (see below), one validation layer, one retry
policy — regardless of source.**

```
                    ┌─────────────────────────────────────┐
  URL ───────────────┤   gather raw content (per-source,   │
  JSON-LD ───────────┤   this part legitimately differs)   ├──────┐
  pasted text ───────┤                                     │      │
                    └─────────────────────────────────────┘      │
                                                                    │  plain text
                    ┌─────────────────────────────────────┐      │
  photo ────────────┤   OCR ingredients + instructions       │      │
                    │   (OpenRouter/qwen — stays put,        │      │
                    │    see copyright note below)           │      │
                    └──────────────┬──────────────────────┘      │
                                    │  OCR'd text                  │
                                    ▼                              ▼
                    ┌──────────────────────┐    ┌──────────────────────┐
                    │  structure (OpenRouter) │    │  structure (Gemini)   │
                    │  same shared RULES text,│    │  same shared RULES     │
                    │  photo path only        │    │  text + responseSchema│
                    └──────────┬───────────┘    └──────────┬───────────┘
                                │  raw AI result                          │
                                └───────────────┬──────────────────────┘
                                                    ▼
                    ┌─────────────────────────────────────┐
                    │   ONE validation/normalization layer  │
                    │   - shape guarantee (never a string    │
                    │     where an object is expected)       │
                    │   - title plausibility                 │
                    │   - description/step classification    │
                    │   - "did this actually produce          │
                    │     something" check                   │
                    └──────────────┬──────────────────────┘
                                    │  a Recipe the editor can trust
                                    ▼
                    ┌─────────────────────────────────────┐
                    │   ONE retry policy wraps the call      │
                    │   above: transient error → retry;      │
                    │   validation failure → retry once;     │
                    │   still bad → real error, not success   │
                    └─────────────────────────────────────┘
```

The "gather raw content" step is genuinely source-specific (fetching a URL vs. reading image
bytes vs. transcribing a photo via OCR) and should stay that way — that's not where tonight's
bugs came from. Everything downstream of "I have raw content, now make it a Recipe" should be one
code path with one set of guarantees, used by import *and* Refresh *and* Enhancement.

### On the photo pipeline specifically

The 3-phase OCR-then-structure design (separate ingredient/instruction transcription, then a
text-only structuring pass) is a reasonable choice — cheaper than vision-model structuring, and
it's why instruction OCR could be retried in isolation tonight without re-doing everything. Worth
keeping. What's not worth keeping is that its *output* (the structured Recipe) is produced by a
prompt nobody shares with the other four sources.

## What moves vs. stays

| Piece | Change |
|---|---|
| Per-source content gathering (URL fetch, JSON-LD extraction, Reddit, image OCR phases 1+2) | Unchanged — genuinely source-specific |
| "Structure raw content into a Recipe" | **Merged** — import and Refresh/Enhancement currently each have their own; becomes one call, one prompt, one schema |
| Provider for structuring | **Decided explicitly, once** — currently import uses OpenRouter/qwen, Enhancement uses Gemini, with no stated reason they differ |
| Ingredient/step shape normalization | **Applies to every source**, not just photo import |
| Title plausibility check | **Applies to every source**, including fresh imports (currently doesn't) |
| Description/step classification | **Applies to every source** |
| Retry policy (transient errors, empty/invalid results) | **One implementation**, wrapping every AI call site — currently reinvented per bug, several sites have none |
| Client-side merge (`RecipeEditor.handleRecipeParsed`, `importer/api.ts`) | Routes through the same validated-result contract `mergeAiRecipeUpdate` already provides for Refresh/Enhancement, instead of a raw spread |
| VM worker error logging | **Added** — `logAiError` currently only fires from Cloudflare-side code; the worker's failures (tonight's AbortErrors, the enhancement no-ops) are invisible outside journald |

## Resolved (owner made the call; documenting why for the next person)

- **Provider stays split — this was deliberate, not drift.** OpenRouter/qwen was chosen for photo
  OCR specifically because **Gemini refuses to process some photographed recipes on copyright
  grounds** — a real constraint from building this feature originally, invisible in the code (no
  comment recorded it, which is how it nearly got "fixed away" here). The raw OCR phases
  (transcribing ingredient/instruction text from image bytes) stay on OpenRouter. Whether
  restructuring already-*extracted plain text* through Gemini carries the same refusal risk is
  untested; treated as risky until shown otherwise, so photo import's structuring stays on
  OpenRouter too rather than assumed safe to move.
- **What still unifies despite the provider split:** the prompt *rules* (shared text fragments,
  not a shared schema object — Gemini's `responseSchema` and OpenRouter's `response_format:
  json_object` aren't the same mechanism, but the instructions can be identical), the validation
  layer (operates on the result, not on how it was produced — fully provider-agnostic), and the
  retry policy (a text-pattern check on the thrown error, generic enough to cover both SDKs).
- **Photo pipeline keeps its 3-phase shape** (OCR ingredients + OCR instructions in parallel, then
  structure) rather than being collapsed into the shared Gemini structuring call — that
  collapse is exactly the change the copyright constraint rules out.
- **Validation conservatism** (shape guarantees are unambiguous; a title-length threshold is a
  judgment call) — going with the thresholds already shipped tonight (120 chars,
  commentary-phrase matching) since they're tested against the two real corrupted titles, rather
  than re-litigating the exact number.

## Suggested phasing

1. **Unify the structuring prompt/schema** across all five sources (photo phase-3, URL, JSON-LD,
   Reddit, text, and Refresh/Enhancement's image re-parse) into one shared module. Biggest
   single fix for "the same bug appears twice" — no behavior change to the call sites yet.
2. **One validation layer**, applied at every call site, replacing the current patchwork
   (`normalizeIngredients`/`normalizeSteps` in `parse-recipe.ts`, `isPlausibleTitle`/
   `stripLeadingDescriptionEcho` in `recipe-merge.ts`) with a single contract both import and
   merge use.
3. **One retry policy**, wrapping every AI call site instead of the current ad hoc per-bug
   retries.
4. **VM worker error logging**, so the next incident is a query instead of a live debugging
   session.

Each phase is independently shippable. None require the others to land first, though 2 is much
easier to do well once 1 removes the duplicate prompts it would otherwise need to fix in five
places.

## Phase 5: the client-side half (added after a follow-up survey)

Phases 1-4 covered every server-side call site. Two gaps flagged in this doc from the start were
deliberately left for later ("less urgent... the client should rarely receive un-validated data
going forward") — a follow-up survey of the whole app for the next "chasing patches" candidate
turned up hard evidence that it's time to close them:

- **`importer/api.ts`'s `parseRecipe()` is the single most complex function in the codebase** —
  ESLint's cognitive-complexity check flags it at **52** (the limit is 15; the next-highest
  function anywhere in the app is 27). It owns the NDJSON stream-reading loop, per-line JSON
  parsing, progress-message lookup (duplicated verbatim in the `!res.body` fallback path,
  `parseNdjsonLines`), and the stream-error salvage logic, all in one function with deep nesting.
  This is exactly the shape of code a future bug hides in undetected.
- **`RecipeEditor.tsx`'s `handleRecipeParsed` still merges via a raw `{...prev, ...parsed}`
  spread**, same as noted in the original investigation — no title/ingredient/step validation at
  the last point before an AI result becomes saved form state. Server-side normalization (Phase 2)
  makes this much lower-risk than when first flagged, but it's still the one AI-result write path
  in the app with no defense-in-depth at all.

**Scope for this phase:**
1. Refactor `parseRecipe()` — extract the streaming-read loop, per-line merge logic, and progress
   lookup into small named functions, deduplicating the progress-message array between the
   streaming and non-streaming paths. Pure refactor: all four existing salvage/abort/success tests
   in `api.test.ts` must keep passing unchanged, proving behavior didn't shift.
2. Apply the same `recipe-result-validation.ts` functions already used server-side
   (`extractPlausibleTitle`, `normalizeIngredients`, `normalizeSteps`) at the `handleRecipeParsed`
   merge boundary — not `mergeAiRecipeUpdate` (that's a merge-onto-*existing*-recipe operation;
   `AiImporter` only renders for new recipes, the same "no fallback to an original" case Phase 2's
   `extractPlausibleTitle` was built for).

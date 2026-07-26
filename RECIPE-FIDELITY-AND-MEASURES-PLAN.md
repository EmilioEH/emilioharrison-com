# Plan: Faithful Recipes and Standardized Measures

Status: **Phases 1, 3, 4, 5, 6 and 7 done (PRs #81, #83–#97). Phase 2 not started.**

Phase 3 note: normalising the units turned out to require undoing a corruption this document
didn't know about — on ~19% of ingredients the amount and the name had been concatenated by an
earlier import, with 728 holding the whole measurement inside `name` and 240 repeating it. The
parser reconstructs the printed line and de-duplicates it before splitting. Every ingredient now
stores that line verbatim in `original`, which is what makes the migration re-runnable: four
rounds of parser fixes were applied to already-migrated records without a restore.

Written after Emilio's wife used the app and reported that recipes were "significantly altering
the title" and that Smart View was "super weird and inaccurate". Investigating that turned into a
broader decision about what the app should do to a recipe when it imports one.

Every number in this document was measured against the live library on 2026-07-25, not estimated.

## The principle

> **Transcribe the source. Derive the shopping list.**

A recipe is a document. Reproducing it faithfully is the whole job, and anything invented there is
corruption — it silently replaces what the cookbook said with something that only looks like it.

A grocery list is a judgment. "You need one head of garlic" appears nowhere on the page; producing
it is the entire point. Invention there is the feature.

That line explains why the AI is being removed from one place and kept in another, and it is the
test to apply to any future feature: is this reproducing something, or deriving something?

## What was actually wrong

**The "Kenji-style" enhancement was rewriting recipes.** Comparing stored recipes against the
printed pages they came from:

| | |
|---|---|
| Printed | "Sift the flour and salt into a large bowl." |
| Stored (styled) | "**Begin by** sifting the **all-purpose** flour and **kosher** salt into a large bowl." |

The page never said all-purpose or kosher. Across the library the styled version **condensed the
step list on 196 recipes**, merging distinct instructions together.

**It wasn't only the background job.** Only **11 of 413** recipes ever ran background enhancement,
yet **410 carry styled content** — because the same styling rules were spliced into the *import*
prompts. Every recipe was styled at the moment it was imported.

**Titles were being rewritten because the prompt said to.** `TITLE_RULE` demanded "a short noun
phrase, ideally under 60 characters". A real title in the library is *"Salted Butter and Chocolate
Chunk Shortbread, or Why Would I Make Another Chocolate Chip Cookie Ever Again?"* — 105 characters.
The model was obeying instructions. (Fixed in PR #80.)

**Descriptions were invented outright.** Buzhenina's page opens "Buzhenina is a simple roasted pork
tenderloin stuffed with garlic that is usually served cold, thinly sliced, as part of a larger
zakuski…". The app stored "A classic, succulent roasted pork tenderloin, traditionally infused with
garlic and served either warm or chilled as part of a festive holiday spread." Same meaning,
entirely different words, none of them the author's.

## What can and cannot be recovered

| Situation | Count | Recoverable? |
|---|---|---|
| Plain `steps` differ from styled — faithful text preserved underneath | **344** | Yes, immediately, by not rendering the styled version |
| Plain `steps` identical to styled — no faithful version stored | **66** | Only by re-importing from the source photo |
| Ran background enhancement (has a `previousVersion` snapshot) | 11 | Yes, but the snapshot only rewinds one step |

Titles and descriptions are **not** retroactively fixable — the prompt fix applies to new imports.
Existing recipes keep their merged titles and invented blurbs until re-imported.

A full backup of every field this plan deletes was taken before any change:
`/root/backups/enhanced-fields-*.json` (410 recipes, 3.2 MB).

## Standardized measures

Emilio's decision: show real weight conversions in the recipe detail view, not merely consistent
notation. "1 cup all-purpose flour (125g)".

### Why the old approach failed, and why a table is different

The removed styling rule told the model to "ALWAYS provide volume AND mass" — computed inline, per
recipe. So the same ingredient got different answers in different recipes, and the conversions
ended up jammed into the `unit` field (`cup (226g)`, `cup (approx 4 fl oz / 118ml)`, `cup (2
sticks/226g)` are all real stored values).

A shared table fixes this structurally: **the AI helps build the table once; code applies it every
time.** Flour is always 125g per cup, everywhere, forever. Correcting one entry corrects every
recipe. Nothing calls a model at import or display time.

### The state of the data today

- **5,251** structured ingredients across 413 recipes
- **277 distinct unit values** — roughly 8 real units wearing ~25 spellings (`cup`/`cups`,
  `tsp`/`teaspoon`/`teaspoons`, `tbsp`/`tablespoon`/`tablespoons`/`Tbsp`, `g`/`gram`/`grams`,
  `oz`/`ounce`/`ounces`, `lb`/`pound`/`pounds`, `ml`/`mL`/`milliliter`, `clove`/`cloves`)
- Plus non-units (`medium`, `large`, `bunch`, `head`), imprecise ones (`pinch` ×100, `to taste`
  ×88, `as needed` ×41), and cases where the *ingredient* landed in the unit slot (`lemon`,
  `onion`, `eggs`, `radish`)
- **54%** of ingredients are measured by volume — the only ones a weight table helps. The rest are
  already weights or counts.
- **1,484** distinct ingredient names, but heavily duplicated: `garlic` (107) and `garlic cloves`
  (84) are separate entries, as are `olive oil` / `extra virgin olive oil`, and salt appears as
  `kosher salt`, `salt`, `fine sea salt`, `table salt`

### Unit families determine what is convertible

| Family | Units | Convertible |
|---|---|---|
| Volume | tsp, tbsp, cup, ml, l, fl oz | Exactly, for free |
| Weight | g, kg, oz, lb | Exactly, for free |
| Count | piece, clove, bunch, head, can | Only within itself |
| Imprecise | pinch, dash, to taste | Not at all — and must not pretend |

Volume ↔ weight is **not** generically convertible: a cup of flour is 125g, a cup of sugar 200g.
That crossing is exactly what the weight table provides, per ingredient.

### USDA FoodData Central: verified, with a caveat

The API is live, free, and returns what we need — `foodPortions` gives `1 cup → 125.0 g` for
all-purpose flour. But **naive first-result search matching is dangerously wrong.** Probing eight
real library ingredients:

| Ingredient | Matched to | |
|---|---|---|
| granulated sugar | Sugars, granulated → 1 cup = 200g | correct |
| parmesan cheese | Cheese, parmesan, grated → 1 cup = 100g | correct |
| garlic | Garlic, raw → 1 tsp = 2.8g | correct |
| cilantro | Coriander (cilantro) leaves, raw | correct |
| **kosher salt** | *Pickles, cucumber, dill or kosher dill* | **wrong** |
| **unsalted butter** | *Pretzels, soft, unsalted* | **wrong** |
| **chicken broth** | *Chicken, canned, no broth* | **wrong** |
| extra virgin olive oil | *Oil, corn, peanut, and olive* | wrong record, right number by luck |

Three of eight wrong, including the #2 and #4 most-used ingredients in the library. A wrong weight
is worse than a missing one — it looks authoritative. **The table must be reviewed by a human
before it is trusted.** That review is one-time and roughly 600 lines after dedupe.

## Architecture

```
  photo / URL
       │
       ▼
  ┌──────────────────────────────┐
  │ read the source              │   unchanged
  └──────────────┬───────────────┘
                 ▼
  ┌──────────────────────────────┐
  │ TRANSCRIBE into our types    │   no rewriting, no invention,
  │ title · description · steps  │   no merging of steps
  │ ingredients                  │
  └──────────────┬───────────────┘
                 ▼
  ┌──────────────────────────────┐
  │ normalise units (code)       │   teaspoons → tsp
  └──────────────┬───────────────┘
                 ▼
  ┌──────────────────────────────┐
  │ saved recipe                 │
  └───────┬──────────────┬───────┘
          │              │
          ▼              ▼
  ┌───────────────┐  ┌──────────────────────────────┐
  │ RECIPE VIEW   │  │ GROCERY LIST                 │
  │ printed text  │  │ derived, not transcribed:    │
  │ + weight from │  │ combine across recipes, then │
  │   the table   │  │ AI → purchasable units       │
  │ (deterministic│  │ (6 cloves → 1 head garlic)   │
  └───────────────┘  └──────────────────────────────┘
```

## What moves vs stays

| Piece | Change |
|---|---|
| Reading the source (OCR / URL fetch) | Unchanged |
| Import prompt styling rules | **Removed** — replaced by a fidelity rule (PR #81) |
| Background enhancement job | **Removed** (PR #81) |
| Smart View toggle and enhanced render branches | **Removed** (PR #81) |
| Stored `structuredSteps` / `ingredientGroups` / `stepGroups` | **Deleted** — backed up first |
| `structuredIngredients` | **Kept** — the grocery list depends on it; not part of the styling |
| Unit values | **Normalised** to a closed vocabulary, in code |
| Ingredient names | **Deduplicated** into a manifest |
| Weight conversions | **New** — static table, USDA-sourced, human-reviewed |
| Grocery purchasable-unit conversion | **Kept** — this is derivation, and the AI belongs here |

## Phasing

1. **Remove Smart View and the enhancement.** *(PR #81, in flight.)* Immediately restores faithful
   text on 344 recipes.
2. **Delete the stored styled fields.** Backup already taken. Leaves 66 recipes unchanged since
   they have no faithful version — see open questions.
3. **Normalise units.** *(Done — PRs #83–#90, applied to all 413 recipes.)* Closed vocabulary;
   ~25 spellings collapse to ~8 units. Pure code, deterministic, no AI. Also strips the polluted
   `cup (226g)` values into a separate note field. **89.6%** of ingredients now carry a numeric
   `quantity` and **83.9%** a canonical `unit`; every one keeps its printed line in `original`.
   Applies to the display `ingredients` only — `structuredIngredients`, which the grocery list
   reads, still holds 311 unit spellings and is out of step with the display data on 56 recipes.
   Rebuilding it from the same parser is the obvious next step and is not done.
4. **Deduplicate ingredient names** *(Done — PR #94.)* — collapsed to 1,352 entries, of which 665
   are measured by volume at least once and therefore need a weight. The rest are always weighed
   or always counted and need no conversion.
5. **Build the weight table — in full, upfront, as a committed file.** *(Done — PR #97.)* 419
   entries covering 2,674 of 3,856 volume-measured ingredient uses. Three of this document's
   assumptions turned out to be wrong and are corrected under "Matching an ingredient" below.
6. **Show conversions in the recipe view.** *(Done — PR #95.)* Deterministic lookup. Silent when
   the ingredient isn't in the table, is already weighed, or is counted — never a guessed number.
   Kosher salt is the case that proves it: USDA has no kosher salt record, so it shows nothing
   rather than table salt's 292 g/cup.
7. **Grocery aggregation.** *(Done — PR #96.)* Combines within unit families (2 tbsp + ¼ cup oil
   = 6 tbsp); the existing AI pass still converts to purchasable units. Counts, imprecise amounts
   and cross-family pairs are deliberately left alone.

Phases 3 and 4 carry most of the value and need no AI at all. Phase 5 is where the API and the
review step live.

## Building the table

**Built once, in full, and committed to the repo as a static file. No API call ever happens at
import or display time.**

An earlier draft had this filling lazily — miss the table, queue a background lookup, cache the
result. That was wrong, for four reasons:

- **Unreviewed entries reach production.** A background job resolving "kosher salt" to the pickle
  record, with nobody looking, is exactly the failure this table exists to prevent.
- **Errors are only visible in aggregate.** "Kosher salt: 155g/cup" looks plausible alone. Sorted
  beside "table salt: 288g" and "granulated sugar: 200g" it is obviously wrong. Reviewing entries
  one at a time as they trickle in cannot catch this.
- **It keeps the API in production** — a key to manage, rate limits, a background job, and a
  failure path when USDA is down. A committed file has none of that, and can be diffed, corrected
  by hand, and reviewed in a PR like any other code.
- **Lazy work never finishes.** ~600 ingredients is a bounded job with an end state.

**Scope it further:** only ingredients that actually appear with a *volume* unit need an entry.
Anything always weighed or always counted needs no conversion. Since 54% of ingredients are
volume-measured, the real table is well under 600 rows.

**New ingredients later:** show no conversion and log the miss. Batch-add and review periodically.
Never guess at runtime.

### Matching an ingredient to the right USDA record

> **Corrected after building it (PR #94/#97).** Three of the assumptions below did not survive
> contact with the API:
>
> 1. **Stripping cooking modifiers (layer 2) makes matching worse, not better.** Searching
>    "unsalted butter" as-is returns *Butter, stick, unsalted*; stripped to "butter" it returns
>    *Clarified butter (ghee)*. Same for olive oil and granulated sugar. Search the full name.
> 2. **Restricting to `SR Legacy`/`Foundation` (layer 1) is not one choice but two.** Only
>    SR Legacy carries cup portions — Foundation gives all-purpose flour as 30g/RACC against
>    SR Legacy's 125g/cup. Search both, take the weight from SR Legacy.
> 3. **Layer 3 is not optional.** A scored keyword heuristic still matched "chicken broth" to
>    *Chicken, canned, no broth*. The model choosing among real candidates fixed every case.
>
> A fourth problem this document didn't anticipate: USDA has **no kosher salt record at all**, so
> every salt matched table salt at 292 g/cup — roughly double. The generator now drops any entry
> whose name carries a density-changing variety word the matched record lacks.


The API's data is sound; its search is not (see the probe above — 3 of 8 wrong). Layered
mitigation, in order:

1. **Restrict to the `SR Legacy` / `Foundation` datasets.** The default search returns `Branded`
   supermarket listings, which are far noisier.
2. **Strip cooking modifiers before searching** — "kosher salt" → "salt", "unsalted butter" →
   "butter". Untested hypothesis: those modifiers are what dragged the queries into pickles and
   pretzels. Cheap to validate, and if it works it removes most of the LLM calls below.
3. **Let an LLM choose among the top candidates**, rather than trusting search ranking. Given
   `["Pickles, cucumber, dill or kosher dill", "Salt, table", "Salt, kosher"]` a model picks
   correctly; a keyword ranker never will. Note it is *selecting between real measured records*,
   not inventing a number.
4. **Cross-check to focus the review.** Ask the model roughly what a cup of the ingredient should
   weigh and compare against the USDA figure. Agreement corroborates; large divergence flags. The
   pickle case fails loudly — model says salt ≈ 290g/cup, the bad record says 155g. This turns
   Phase 5's review from "eyeball 600 rows" into "check the ~10% that were flagged".

**Practical note:** `DEMO_KEY` is rate-limited within a handful of requests. A free registered key
allows 1,000/hour; at two calls per ingredient the full build is comfortably a single batch.

## Open questions

- **The 66 recipes with no faithful text.** Re-import from the source photo (365 recipes have one),
  or accept them as-is? Re-OCR is the only recovery, and OCR drops words on curved pages — see the
  tesseract findings below.
- **Titles and descriptions on existing recipes** stay wrong until re-imported. Is a bulk re-import
  worth it, or only for recipes that visibly bother her?
- **Title vs subtitle.** A page may print "BUZHENINA" over "GARLIC-ROASTED PORK TENDERLOIN" *and*
  have an intro paragraph. Two of those want to be the description. Decide: subtitle joins the
  title, gets its own field, or is dropped.
- **Imprecise amounts** (`pinch`, `to taste`) have no number. Confirm they should appear on the
  grocery list as their own line rather than being given an invented quantity.

## Considered and rejected

**Replacing the LLM OCR with tesseract**, to cut cost. Tested against three real cookbook photos:
tesseract transcribed all three *titles* perfectly and read upright columns cleanly, but on curved
pages it **drops words** from the italic left column ("My mom would often pull out these garlicky"
became "uld often pull out these garlicky"). Preprocessing and column isolation both failed to
recover them. Since an LLM cleanup pass cannot restore words that were never captured — it would
confabulate them — this would trade one class of error for a worse one. Revisit only with page
dewarping.

**A cheaper alternative exists and is not yet done:** photo import currently sends the same image
to the vision model **twice** (once for ingredients, once for instructions). Since image input
dominates token cost, merging those into a single call roughly halves the vision cost with no
accuracy risk. This is the better cost lever and should be picked up separately.

# Plan: Faithful Recipes and Standardized Measures

Status: **Phase 1 in flight (PR #81). Phases 2-7 not started.**

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
3. **Normalise units.** Closed vocabulary; ~25 spellings collapse to ~8 units. Pure code,
   deterministic, no AI. Also strips the polluted `cup (226g)` values into a separate note field.
   Immediately improves grocery grouping on all existing recipes, with no reprocessing.
4. **Deduplicate ingredient names** — 1,484 raw names into ~600 real ingredients. This is the piece
   with the actual thinking in it; everything downstream depends on it being right.
5. **Build the weight table.** LLM selects the correct USDA record per ingredient (it knows kosher
   salt is not a pickle); the API supplies the measured gram weight; **Emilio reviews the table
   once**. Stored static.
6. **Show conversions in the recipe view.** Deterministic lookup. Silent when the ingredient isn't
   in the table, is already weighed, or is counted — never a guessed number.
7. **Grocery aggregation.** Combine within unit families (2 tbsp + ¼ cup oil = 6 tbsp), then the
   existing AI pass converts to purchasable units. Verify the Smart list already does the garlic
   case correctly before changing anything.

Phases 3 and 4 carry most of the value and need no AI at all. Phase 5 is where the API and the
review step live.

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

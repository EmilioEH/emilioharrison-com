# Plan: Bulk photo import — many photos, one recipe each, in the background

Status: **SHIPPED 2026-08-02.** All six phases are done and live: pick several photos, they are
read on the VM worker while the app is closed, and a badge on the Add button brings you back to a
review list. What follows is the plan as it was written plus a record of what each phase actually
did — including where the build departed from the proposal.

Written 2026-08-01 from a design conversation with Emilio. Decisions taken during that
conversation are recorded below as decided; everything else is proposal. The risks the first draft
listed as "verify before building" were then **actually measured on the VM** — see "Spike
results" — which killed one assumption, confirmed two, and surfaced a new blocker (structuring
flakiness) that reordered the phases.

## The requirement, and the one constraint that shapes everything

The ask: pick several photos at once and get one recipe per photo.

The decisive detail is not the count. Asked how many photos a batch would hold, Emilio said "a
dozen or so — up to 15". Asked how the review should work, he said:

> "I want to be able to start this process go do something else in my phone, come back later to
> check status, when it's done and I come back there's a review flow for me."

**That rules out doing the work in the browser at any batch size.** Phone browsers suspend
JavaScript and cancel in-flight `fetch` calls when the user switches apps or the screen locks. A
client-side loop over `/api/parse-recipe` — which would otherwise be the cheap answer for 15
photos — dies the moment he leaves the app. Background execution is a hard requirement, so the
work belongs on the VM worker.

## Decisions already taken (2026-08-01)

| Question                  | Decision                                                                                                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Batch size to design for  | Up to ~15 photos                                                                                                                                                                               |
| Two-page spreads          | **Manual grouping** — user marks photos as belonging to one recipe before submitting. Not model-inferred: a wrong auto-grouping silently welds two recipes together, which is worse than none. |
| Where the work runs       | **VM worker** (forced by the requirement above)                                                                                                                                                |
| "It's done" signal        | **Badge on the add button.** No push notifications, no Signal message.                                                                                                                         |
| Where parsed results live | **On the job doc, not as draft recipes.** A recipe is created only when reviewed and accepted.                                                                                                 |
| OpenRouter key on the VM  | **Approved.** Already provisioned at `/root/.recipe-worker.env` as `OPENROUTER_API_KEY` (root-owned, 600).                                                                                     |

That last one is a deliberate deviation from `BACKGROUND-JOBS-VM-PLAN.md`, which states the VM
needs "**not** the OpenRouter key (that stays on Cloudflare)". Photo parsing is the one job that
needs it, and backgrounding photo parsing is the whole feature. Noted here so the contradiction
is a recorded decision rather than a later surprise.

## Why this is cheaper than it looks

Photos already land in **Firebase Storage** (`/api/uploads/index.ts` writes to
`${projectId}.firebasestorage.app`). The worker already holds the Firebase service account and
already speaks `firebase-admin`. So it can read the photos directly — **no new network path, no
public exposure, no inbound port**, preserving the property the VM plan was built around.

Two other pieces already exist and are reused as-is: the transactional claim pattern in
`firestore-store.ts` (so a restart or a second worker can't double-run a job) and the stuck-job
reaper.

## What moves vs. stays

| Piece                                     | Runs on       | Notes                                                                                   |
| ----------------------------------------- | ------------- | --------------------------------------------------------------------------------------- |
| Photo upload (`/api/uploads`)             | Cloudflare    | unchanged                                                                               |
| Single-photo import (`/api/parse-recipe`) | Cloudflare    | **stays.** In-request, client holds the connection. Still the right path for one photo. |
| URL import                                | Cloudflare    | unchanged                                                                               |
| Batch enqueue (new)                       | Cloudflare    | writes job docs, returns `202` immediately                                              |
| **Batch photo parsing (new)**             | **VM worker** | the actual feature                                                                      |
| Grocery generation                        | VM worker     | unchanged                                                                               |
| Background enhancement                    | —             | already removed; see the dead-code note at the end                                      |

## Data model

Two new collections. Keeping them out of `recipes` is what stops unreviewed OCR reaching the
library — which matters more now that background enhancement is gone and _nothing_ cleans up
after the transcription.

`import_batches/{batchId}`

```
createdBy, createdAt
status: 'pending' | 'processing' | 'complete' | 'partial' | 'failed'
total, completed, failed        // counters for the badge
reviewedCount                   // drives "still needs your attention"
```

`import_jobs/{jobId}`

```
batchId, createdBy, createdAt
photoKeys: string[]             // one entry, or several for a grouped spread (page order)
status: 'pending' | 'processing' | 'complete' | 'error'
claimedAt                       // reaper input
parsedRecipe: Recipe | null     // the result, held here until accepted
partialFailure?: 'instructions' // existing signal from the parse pipeline
error?: string
reviewState: 'unreviewed' | 'accepted' | 'discarded'
savedRecipeId?: string          // set on accept
```

The badge is a count of jobs with `status: 'complete'` and `reviewState: 'unreviewed'`.

## The real engineering work: factoring the parse pipeline

`parse-recipe.ts` is written against Cloudflare — it builds its client with
`createOpenRouterClient(locals)` and its output is a `ReadableStream` of NDJSON aimed at a
browser. The worker wants neither.

Partial groundwork already exists: `runImageOcrPhases` and `buildImageRecipeStream` are already
exported, and `runPhase`/`runPhaseAttempt` are already provider-agnostic apart from the injected
client.

**Target:** a shared `parse-photo-core.ts` exporting something like

```ts
parsePhotosToRecipe(client: OpenAI, photos: PhotoSource[], opts): Promise<Recipe>
```

with NDJSON streaming reduced to a thin wrapper inside the Cloudflare route. This mirrors exactly
how `grocery-core.ts` is already shared with the worker, and it is the single most important part
of this plan: **doing it any other way recreates the two-independent-photo-parsers problem that
`IMPORT-PIPELINE-V2-PLAN.md` was written to end.** (`enhancement-core.ts` was the other example
until it was deleted with the rest of the enhancement code — see the last section.)

Multi-page grouping falls out naturally, though not the way an older reading of this file suggests.
The pipeline is **one OCR call per photo** — the page is transcribed in a single request returning
ingredients, steps and headnote together, which are then split into the `_p:1`/`_p:2` payloads the
NDJSON contract expects — followed by one text-only structuring pass. So a spread becomes: OCR each
photo, concatenate the transcribed text in page order, structure once. The prompts need a line
about continuation pages so the model doesn't treat page 2 as a whole recipe.

## Spike results — measured on the VM, 2026-08-01

These were run before any implementation, against the real bucket, the real key and the app's own
exported functions. Scripts are not committed; they lived in a scratchpad.

**1. The worker CAN read Firebase Storage. ✅ (the load-bearing assumption)**
Using the existing service account from `/root/.recipe-worker.env`, against
`recipes-app-fc6f1.firebasestorage.app`: `bucket.exists()` true, `getFiles()` listed objects,
and `download()` returned a valid JPEG (`ffd8ffe0`). No new credential or scope needed.

**2. The parse pipeline already runs in plain Node. ✅ (much cheaper than planned)**
`runImageOcrPhases` and `buildImageRecipeStream` were imported _directly out of the Astro route_
and executed under `tsx` with no modification. `createOpenRouterClient` already falls back to
`process.env.OPENROUTER_API_KEY` (`api-helpers.ts:93-95`). The route's Cloudflare coupling is
thinner than assumed — phase 1 is a genuine extraction, not a rewrite.

**3. OpenRouter key works from this box.** `/api/v1/key` → 200, not free tier, $10 cap on the key.

**4. Real timings (configured ceilings in brackets):**

| Stage                             | Observed | Ceiling |
| --------------------------------- | -------- | ------- |
| OCR (single call)                 | 32–50s   | 100s    |
| Full pipeline (OCR + structuring) | 70–108s  | 160s    |
| 3 photos in parallel, wall clock  | 101s     | —       |

**A 15-photo batch at concurrency 3 is therefore roughly 8–9 minutes** as the code stands today.
No user is holding a phone still for that — the background design is settled either way. (With
the reasoning fix in finding 7 this drops to roughly **3–4 minutes**, which is still far too long
to hold a phone browser open.)

**5. `WORKER_JOB_TIMEOUT_MS` (120s) is genuinely too tight — now measured, not inferred.** One
observed successful parse took **108.1s**, inside a 120s budget by twelve seconds. Import jobs need
their own budget (suggest 300s), not a bump to the shared one. Finding 7 buys a lot of headroom
back, but the separate budget is still right: retries compound.

**6. Concurrency 3 is fine. ✅** Three full pipelines in parallel produced no 429s, no throttling,
no transport errors from OpenRouter.

**7. ⚠️ The flakiness is a TIMEOUT, and the cause is the model's dynamic reasoning.**
This is the most important finding, and it is a bug in the current single-photo import — not
something specific to bulk.

The "Beef and Potato Empanadas" photo (26 ingredients) failed structuring in the parallel run, so
it was re-run alone, twice: one success at 108.1s, one failure at 94.7s. Note the arithmetic on
the failure — OCR took 34.7s, total was 94.7s, so **phase 3 died at exactly 60.0s =
`STRUCTURE_TIMEOUT_MS`.** Not a model failure. A stopwatch.

Phase 3 was then run 4× against fixed OCR input, capturing what the pipeline throws away:

|                   | reasoning on (current)            | reasoning off              |
| ----------------- | --------------------------------- | -------------------------- |
| latency           | 18.5s / 54.9s / **67.3s** / 52.5s | 12.5 / 12.9 / 13.7 / 12.4s |
| completion tokens | 3656–9913                         | 2321–2716                  |
| JSON valid        | every time                        | every time                 |

`finish_reason` was `stop` and the JSON parsed on _every_ attempt — so it was never truncation,
never malformed output, never `STRUCTURE_MAX_TOKENS`. The 67.3s run simply exceeded the 60s budget.
Most of those tokens were reasoning tokens.

The same test on the OCR call (which was the bigger cost):

|               | reasoning on (current)     | reasoning off       |
| ------------- | -------------------------- | ------------------- |
| latency       | **177.5s** / 47.4s / 49.2s | 25.4 / 28.4 / 27.5s |
| transcription | 34 ing/4 steps, 26/8, 28/8 | 26/8, 26/8, 26/8    |

The 177.5s run **exceeded `OCR_TIMEOUT_MS` (100s)** and would have failed in production. And note
the third column: with reasoning on, one run invented 8 extra ingredients and merged the steps
down to 4. With reasoning off the transcription was **byte-identical across all three runs**.

**Reasoning is costing speed.** Disabling it makes the pipeline roughly 2–4× faster and removes
the timeout failures. The "and fidelity" half of this conclusion came from three runs of this one
recipe and **did not survive the wider sweep — see finding 8**; transcription is not deterministic
either way. Read finding 8 before quoting the transcription column above.

**This repo already knows this lesson.** `CLAUDE.md` records it for the other provider: Gemini
calls set `thinkingConfig: { thinkingBudget: 0 }` because "flash models' default dynamic thinking
adds tens of seconds of pre-output latency these budgets can't afford." The OpenRouter path never
had the equivalent applied. Adding `reasoning: { enabled: false }` to the OpenRouter calls closes
that gap.

Consequences:

- **Ship the reasoning fix on its own, before any of this.** It makes today's single-photo import
  faster and more faithful, independent of bulk import.
- Automatic per-job retry is still worth having for genuine transient failures, but it is a
  safety net, not the cure it looked like before this was diagnosed.
- Caveat on scope: this is one photo, three runs per arm. The signal is strong and consistent, but
  validate across a sample of the library before shipping — see phase 2.

**8. Fraction misreads are real, but NOT caused by image resolution (hypothesis tested and rejected).**

Finding 7's first pass suggested reasoning-off transcribed _more faithfully_, on the strength of
three runs of one recipe. **A wider sweep across 8 library photos (2 runs per arm) does not
support that as stated, and the strong version of the claim is withdrawn.**

Sweep aggregate:

|                                | reasoning ON | reasoning OFF |
| ------------------------------ | ------------ | ------------- |
| mean OCR latency               | 33.2s        | **19.3s**     |
| max OCR latency                | 55.6s        | **30.4s**     |
| self-consistent across 2 runs  | 1/8          | **3/8**       |
| photos where the arms differed | 6/8          |               |

The latency result is unambiguous and is the justification for the change. Accuracy is more
nuanced than either of my earlier claims, and breaks into three distinct categories:

**(a) Most differences are cosmetic, not accuracy.** Reasoning-on tends to emit ASCII fractions,
reasoning-off Unicode ones — `4 1/2 cups` vs `4½ cups`, `110g flour 3/4 cup` vs `110g flour ¾ cup`.
Same value, different glyphs. **This is worth its own attention**: downstream
`structuredIngredients` parsing and the unit vocabulary from PR #83 have to cope with both forms,
and nothing currently pins which one the model returns.

**(b) Where there is a real difference, reasoning-ON is noisier.** It repeatedly promoted section
headers into the ingredient list — `"SOUP"`, `"FOR SERVING"`, `"Staple Ingredients: Vegetable oil
Table salt Pepper"` — which reasoning-off did not. So off is somewhat _cleaner_, just not for the
reason originally claimed.

**(c) Both arms misread small fractions, and neither is trustworthy there.** On the "Roasted Pork
Chops" page, checked against the photograph by eye:

| printed on the page          | reasoning ON | reasoning OFF |
| ---------------------------- | ------------ | ------------- |
| `¾ teaspoon dried` rosemary  | ⅓ ✗          | ⅔ ✗           |
| chops `1 to 1½ inches` thick | 1½ ✓         | 1¾ ✗          |
| `¼ teaspoon sugar`           | ¾ ✗          | ¼ ✓           |

Each arm got one right and one wrong. **Neither is reliable on vulgar fractions**, and ¼ vs ¾
teaspoon is a real cooking error that lands silently in the library. Note that only 1/8 and 3/8
photos were self-consistent even within a single arm — so this is not "one setting reads it
correctly", it is "the glyph is a coin flip for both".

**The resolution hypothesis was tested and NOT supported.** The obvious suspect was the pre-upload
downscale: `AiImporter.tsx` calls `processImage(originalFile, 1024, 0.7)`, overriding that helper's
own 1920/0.8 defaults, so a stored page is only 768×1024 and a `¼` glyph is a handful of pixels.

Tested 2026-08-01 on a supplied photo of a different page (Chorizo/Black Bean Tacos, 864×1189),
OCR'd 3× at native size and 3× after being put through the app's exact downscale (744×1024 @ q70),
grading three known fractions — `1½ tsp kosher salt`, `1½ cups black beans`, `½ tsp of the salt`:

| variant                     | fractions correct |
| --------------------------- | ----------------- |
| native 864×1189             | 8/9               |
| app-downscaled 744×1024 @70 | **9/9**           |

The downscaled image did **as well or better**. The one miss was on the _native_ image, which read
`½ teaspoon of the salt` as `1½ teaspoon`. (A first pass scored this 9/9 for both because the
grading regex matched `1½` as a substring of the expected `½` — the corrected tally is above.)

So the downscale is not the driver, and raising the image ceiling should **not** be prioritised on
current evidence. What most likely separates the two pages is the photograph and the typography,
not the pixel budget: the pork-chops page is a glossy spread shot at an angle with small, tightly
kerned fractions in a narrow column; the tacos page is flatter, larger-set and evenly lit.

Caveat that keeps this open rather than closed: the supplied photo was already compressed to
864×1189 by the upload path, so the resolution contrast tested was only 1189 vs 1024 on the long
edge. It does **not** rule out a benefit when a true ~4000px phone original is crushed to 1024. That
needs an uncompressed original to test, which has to come off the phone directly.

Practical read: fraction accuracy is **page-dependent and not fixable by a settings change**. If it
matters (¼ vs ¾ teaspoon does), the useful lever is in the product, not the pipeline — e.g. flagging
numerics for review on import rather than presenting them as certain. That fits the review-flow work
this plan already proposes.

Remaining ideas if it is picked up again:

- Re-run the same A/B with a **genuinely uncompressed original** straight off the phone (~4000px),
  which is the only untested case. If it helps, raise the ceiling **for the OCR copy specifically**
  — the display image and card thumbnail can stay small. Note the 9 MB payload guard in
  `useAiImporter.ts` and the 10 MB cap in `/api/uploads`.
- Grade against pages that actually fail (glossy, angled, small-set fractions like the pork-chops
  spread), not pages that already pass. The tacos page was correct in every configuration, so it
  cannot distinguish between them.
- Whatever the cause, misread fractions are a **latent data-quality problem in the existing
  library**, not just a future-imports problem — which connects this to the re-import work
  regardless of whether the resolution lever turns out to matter.

**9. Cost is negligible.** Settled OpenRouter usage across the spike runs was **$0.005863** for
roughly six parses — about **$0.001 per photo**, so a 15-photo batch costs **one to two cents**.
(An earlier reading of $0.000145/photo was taken before OpenRouter's usage figure had settled;
the $0.001 number is the honest one.) This reframes the rate limit below: it is not protecting
meaningful money, only guarding against a runaway loop.

## Concurrency

`index.ts` currently fires `void runEnhancementForDoc(...)` per changed doc with no cap. That is
harmless today (the enhancement queue is dead, and grocery lists arrive one at a time), but a
15-job import batch would fan out to 15 simultaneous parse pipelines on a 4-vCPU box.

Spike 6 confirms **3 is safe**. Use a worker-side limit of 3 when the listener dispatches import
jobs. Ordering does not matter; total throughput does.

## Remaining prerequisite

**The worker has no `openai` dependency.** `parse-recipe.ts` imports `OpenAI`; the worker's
`package.json` lists only `@google/genai`, `cheerio`, `firebase-admin`. Needs adding. (The spikes
resolved it via the hoisted root `node_modules`, which the worker does not use at runtime.)

## Rate limiting

`PARSE_RATE_LIMIT = 20` per hour (`parse-recipe.ts:51`) is the app's own guardrail, added in
`ba2c476` "Add reliability and cost guardrails to the AI pipeline" — **not** an OpenRouter limit.
OpenRouter publishes no request cap for paid models; only `:free` variants are capped.

It is enforced in the Cloudflare route, so **the worker path bypasses it entirely** — bulk import
would have no spend ceiling at all. That must be a decision, not an accident.

Proposal: a separate batch-level limit at enqueue time (say **6 batches/hour**), leaving the
per-photo limit alone for the single-photo path. A 15-photo sitting then works, while a runaway
loop still hits a wall.

Sizing note from the measured cost (~$0.001/photo): six 15-photo batches an hour is about **9
cents an hour** at the ceiling. The limit exists to stop a bug looping forever, not to ration
ordinary use — so err generous. Whatever number is chosen, retries must count against it, since
the flakiness above means real usage is roughly 1.3× the photo count.

## Failure modes the UI has to show

- **Per-job failure is now normal, not exceptional — this is measured, not predicted.** Spike 7
  observed structuring failing on 2 of 3 attempts for one dense recipe. With 15 photos, expect
  several failures per batch before retries. The current single-photo flow raises a blocking
  `alert()` for partial failure (`useAiImporter.ts:103`); fifteen sequential modals would be
  intolerable. Per-card status plus **retry-this-one** (re-enqueue a single job without redoing
  the batch), on top of the worker-side automatic retry.
- **A job that exhausts its retries must fail loudly on its card**, with the photo still attached
  so it can be retried later or re-photographed. Never a silently missing recipe: the user picked
  15 photos and must be able to account for all 15.
- **Worker offline.** Jobs sit `pending` forever — the reaper only rescues stuck _claims_, not a
  worker that never claims. Background enhancement pausing was tolerable; imports silently never
  happening is not. Needs a visible "queued — import service offline" state, driven by a worker
  heartbeat doc or a staleness threshold on `createdAt`.
  **Built** as the staleness threshold (`PENDING_STALE_MS`, 3 minutes, in `import-batches.ts`) —
  no heartbeat doc was needed, since a job that no one has claimed is itself the signal.

## Client work

- `PhotoUploader.tsx:44,56` — add `multiple` to the file inputs.
- `AiImporter.tsx:46-48` — `handleFileChange` reads `files[0]`; must handle the whole list.
  Optimise/upload with a concurrency cap: 15 photos currently means 30 uploads
  (`processImage` + `createThumbnail` each), all on the main thread, which will visibly jank a
  phone.
- Selection screen: thumbnails, remove, and **group/ungroup** for spreads.
- Badge on the add button, from the batch counters.
- **Review flow.** A results list — thumbnail, parsed title, status — opening the existing
  `RecipeEditor` per card. Accepting creates the recipe and marks the job `accepted`.
- **Gotcha:** `RecipeEditor.tsx:250` renders `{!recipe.id && <AiImporter …/>}`. A parsed-but-
  unaccepted recipe has no `id`, so the importer would render _inside_ the review form. Needs an
  explicit prop rather than relying on `recipe.id`.

## Phases

0. ~~Spikes~~ — **done 2026-08-01**, results above. Storage access, Node compatibility, timings,
   concurrency, cost and the flakiness rate are all now measured rather than assumed.
1. ~~**Extract `parse-photo-core.ts`**~~ — **done 2026-08-01.** `src/lib/services/parse-photo-core.ts`
   now holds every model call, prompt and validation step; `api/parse-recipe.ts` is auth, rate
   limiting and the NDJSON wrapper. No behaviour change on the single-photo path — the prompt a
   lone photo gets is byte-identical, and the streamed `_p: 1/2/3` + `_t` contract is unchanged.

   What it exports: `transcribePhotos(client, photos[])` (one call per page, concatenated in page
   order — a lone photo skips the continuation-page wording entirely), `structureRecipeFromOcr`,
   `structureRecipeFromText`, and `parsePhotosToRecipe(client, photos)` for callers with no stream
   to feed — that last one is what phase 3's worker job calls. It throws `PhotoParseError` with a
   `stage` of `transcribe` or `structure` rather than returning half a recipe.

   Two deviations from what this section originally proposed:
   - The signature is `parsePhotosToRecipe(...): Promise<ParsedRecipeFields>`, not `Promise<Recipe>`.
     What comes back is the model's fields after normalization — no id, no createdBy, no timestamps
     — so calling it a `Recipe` would have been a lie the worker then had to work around.
   - Multi-page grouping landed here rather than waiting for phase 5, because it is three lines
     inside the transcription loop and the alternative is a second entry point later. The client
     still can't send a group; nothing calls it with more than one photo yet.

   Starting facts from before the extraction, all verified 2026-08-01 (`runImageOcrPhases` and
   `buildImageRecipeStream` are the names the pre-extraction code used):
   - `runImageOcrPhases`, `buildImageRecipeStream` and `buildTextRecipeStream` are already exported
     from `parse-recipe.ts`, and all three route through `runPhase`/`runPhaseAttempt`.
   - `createOpenRouterClient` (`api-helpers.ts:93-95`) already falls back to
     `process.env.OPENROUTER_API_KEY`, so it works in plain Node with no change.
   - OCR is **one** model call now (page → ingredients + steps + headnote, then split into the
     `_p:1`/`_p:2` payloads the NDJSON contract expects), not the two the older docs describe.
   - `runPhaseAttempt` sets `reasoning: { enabled: false }` and there are tests asserting it on all
     three paths — carry it through the extraction or imports get slow and start timing out again.
   - `buildTextRecipeStream(client, contentPart, prompt, style?, signal?)` — the third argument is
     required; omitting it type-errors but still passes vitest.

2. **Disable reasoning on the OpenRouter calls, then retry + import-specific timeout.**
   **Done.** The reasoning half shipped separately in #112 ahead of the extraction, as this said
   it should; per-job retry and the import-specific timeout landed with phase 3 (a whole-job
   budget of 300s and one automatic retry per job). Original wording follows. Add `reasoning: { enabled: false }` to the OCR and structuring calls, matching
   what the Gemini path already does with `thinkingBudget: 0`. Validate across a sample of real
   library photos (not just the empanadas page) comparing transcription against the printed page,
   since finding 7's evidence is three runs on one recipe. Expect: ~2–4× faster imports, the
   timeout failures gone, and more faithful transcription. Then add per-job retry and the
   import-specific timeout as the safety net.
3. ~~**Worker import job**~~ — **done 2026-08-02.** `openai` dep, types, store methods, runner,
   config, concurrency cap, reaper coverage. The worker now listens on `import_jobs`, claims each
   pending doc transactionally, reads its photos out of Firebase Storage with the service account
   it already held, runs `parsePhotosToRecipe`, and writes the result to the job doc.

   Verified end-to-end against the real bucket and the real key, not just against fakes:
   a real uploaded page parsed in **23.3s** (13 ingredients, 8 steps, plausible title), the job
   landed `complete`/`unreviewed` with its claim stamp cleared, and the batch moved to
   `complete 1/0`. The failure path was run too — a missing photo key fails the job in 0.8s with
   "Photo is no longer in storage (…)" and moves the batch to `failed 0/1`, rather than blaming
   the model for a storage problem.

   Decisions made while building it:
   - **One job budget covering both attempts** (`WORKER_IMPORT_JOB_TIMEOUT_MS`, default 300s),
     not one per attempt. Two 5-minute attempts could outlive the reaper's 10-minute deadline,
     and a job the reaper has already failed must not still be running.
   - **`partialFailure` is lifted off the recipe** onto the job doc, so it can't ride along into
     the saved recipe when the card is accepted.
   - **Batch counters move inside the job's transaction.** Three jobs finishing at once (the
     concurrency cap) would otherwise race on a read-modify-write of the batch, and the badge
     would disagree with the jobs it counts. The reaper goes through the same finisher, so an
     abandoned job can't leave its batch stuck at `processing` forever.
   - **An empty `photoKeys` fails at claim time** rather than being carried through the pipeline
     to reach the same conclusion more slowly.

   Not done here, and still owed: the **"import service offline"** state. Jobs sit `pending`
   forever if the worker is down — the reaper only rescues stuck _claims_, not a worker that
   never claims. That needs a heartbeat doc or a staleness threshold on `createdAt`, and it is
   most naturally built with the client work that has to display it.

4. ~~**Cloudflare enqueue endpoint** + batch rate limit~~ — **done 2026-08-02.**
   `POST /api/imports` writes the batch and its jobs and returns `202`; `GET /api/imports` returns
   the caller's outstanding jobs plus the counts the badge needs; `POST /api/imports/{jobId}`
   records accept/discard/retry. Limit: **6 batches/hour** per user, deliberately generous — at
   ~$0.001 a photo the ceiling is about nine cents an hour, and the limit exists to stop a bug
   looping, not to ration use.

   Two things worth knowing:
   - **Photo keys are authorization, not just formatting.** `/api/uploads` mints keys as
     `{userId}-{timestamp}-{uuid}.{ext}`, so the enqueue endpoint requires every submitted key to
     start with the caller's own id. Without that check a caller could queue a job that makes the
     worker read someone else's photo out of Storage.
   - **Reads are polled, not subscribed.** `firestore.rules` denies client reads on everything
     except `grocery_lists`, and the app is otherwise API-first. The client refetches on mount, on
     tab focus, and every 8s while something is actually in progress.

5. ~~**Client: selection, grouping, submit**~~ — **done 2026-08-02.** The gallery input takes
   `multiple`; picking **one** photo still runs the existing in-request parse untouched, picking
   more switches to the batch flow. Photos upload three at a time and appear as they land.

   Grouping is one tap: each photo is its own recipe, and **Same recipe** marks a photo as the
   continuation of the one above it. Chosen over a select-then-group gesture because the spread
   case is always adjacent pages, and because a mis-grouping is invisible until you cook from it.

6. ~~**Client: badge + review flow**~~ — **done 2026-08-02.** A count on the Add button, which
   still adds — the way through is a banner at the top of the New Recipe sheet, so the badge never
   costs the user the action they actually came for. The review screen lists every card with its
   photo: finished ones open the existing `RecipeEditor` and save through the same path as any
   other new recipe, failed ones say why and offer another go, and a queue nothing has picked up
   for three minutes says the import service looks offline.

   The `RecipeEditor.tsx` gotcha this plan predicted was real: it decided whether to show the
   importer from `recipe.id`, and a parsed-but-unaccepted card has no id, so the importer rendered
   _inside_ the review form. It now takes an explicit `showImporter` prop.

Phase 2 is newly promoted: the flakiness spike turned "nice to have" into "the feature does not
work acceptably without it".

## Added after shipping

**Time estimate (2026-08-02).** Asked for during the first live test. `describeTimeRemaining` in
`import-batches.ts` derives it from two measured numbers — ~23s per photo end to end, three at a
time — rounded up to 30s per photo so the estimate comes in early rather than late. Shown on the
"being read" panel and again on the review screen while work is outstanding. Deliberately coarse
("about 3 minutes", never a ticking countdown): a countdown invites the user to sit and watch it,
which is the opposite of the point. **If `WORKER_IMPORT_CONCURRENCY` is retuned, the constant in
`import-batches.ts` has to move with it** or the estimate silently drifts.

## Explicitly out of scope

- Model-inferred photo grouping (decided against).
- Push/Signal notification when a batch finishes — the badge is the agreed signal.
- Bulk URL import.
- Changing the single-photo path's UX. It stays as-is.

## Related dead code — DONE, do not re-plan this

The leftovers of background enhancement were removed in **#114** (app side) and **#115** (worker
side) on 2026-08-01, ahead of this feature rather than during phase 3.

Gone: `api/recipes/[id]/enhance.ts`, `recipe-enhancement-job.ts`, `triggerBackgroundEnhancement`,
`ENHANCE_RATE_LIMIT`, `tests/dual-process.spec.ts`, `enhancement-core.ts`, the worker's enhancement
listener, `claimEnhancement`/`completeEnhancement`/`failEnhancement`, `reapStuckEnhancements`, and
`runEnhancementForDoc`. The running worker was restarted and came up clean on the new code.

Still present **on purpose**: `enhancementStatus`/`enhancementError` on the `Recipe` type and
`RecipeDetail`'s status poll. Existing Firestore documents still carry those values; dropping the
field removes our ability to read stored data, not the data.

Phase 3 therefore edits a worker whose store and listener are already down to grocery only —
`WorkerStore` has three methods left, and the reaper sweeps one queue.

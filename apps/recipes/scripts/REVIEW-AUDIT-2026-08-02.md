# Review audit — 2026-08-02

Output of `npx tsx scripts/audit-reviews.ts` against live Firestore, read before writing the
verdict migration (per APP-FEEDBACK-2026-08-PLAN.md, Phase 3 task 1).

## What is there

- **31 reviews**, all carrying `source: 'quick'` — confirming the two entry points are
  indistinguishable by their source tag, which is why the tag is being fixed at the point of
  writing.
- No review carries an `outcome` yet. No review carries a `difficulty`.
- 4 carry a comment, 6 carry a photo. Both survive the migration untouched.

Ratings present:

| rating | count |
| --- | --- |
| 5 | 10 |
| 4 | 13 |
| 3 | 2 |
| 2 | 6 |
| 1 | 0 |

## The one thing that decides the mapping

The week review shipped **2026-07-26** (`fc80325`). Splitting the 31 reviews on that date:

- **Before** (the five-star picker on the recipe page): values `{3, 4, 5}`
- **On/after** (the four-tap week review, `OUTCOME_RATING = {meh: 2, good: 4, again: 5}`):
  values `{2, 4, 5}`

So each value maps the same way whichever surface produced it:

| stored | week review said | star picker said | verdict |
| --- | --- | --- | --- |
| 5 | "Make it again" | 5 of 5 | `loved` |
| 4 | "Good" | 4 of 5 | `ok` |
| 3 | *(cannot produce)* | 3 of 5 | `ok` |
| 2 | "Meh" | 2 of 5 | `disliked` |
| 1 | *(cannot produce)* | 1 of 5 | `disliked` |

**This is the finding that licenses a rule-based migration.** The worry the plan raised — that a
stored `4` means two different things and the record cannot say which — turns out not to bite:
both readings of `4` land on `ok`, and both readings of `2` land on `disliked`. The only values
where the two scales could have disagreed (`1` and `3`) are produced by one surface only, and `1`
does not occur at all.

`loved` is deliberately reserved for the top mark of both scales. Reading a 4-star review as
"loved" would invent enthusiasm that neither surface recorded — "Good" is not "make it again".

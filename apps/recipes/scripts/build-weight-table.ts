/**
 * Phase 5: builds the ingredient weight table from USDA FoodData Central.
 *
 * Run once, reviewed by a human, and committed. Nothing calls this at import or display time —
 * see "Building the table" in RECIPE-FIDELITY-AND-MEASURES-PLAN.md for why lazy population was
 * rejected.
 *
 * **Two corrections to the plan, both established by probing the live API first:**
 *
 * 1. The plan proposes stripping cooking modifiers before searching ("kosher salt" -> "salt") as
 *    an untested hypothesis. It is wrong, and actively harmful. Searching as-is returns
 *    "Butter, stick, unsalted" and "Oil, olive, extra virgin"; stripping returns
 *    "Butter, Clarified butter (ghee)" and "Oil, corn, peanut, and olive". Full names are kept.
 *
 * 2. Only **SR Legacy** records carry cup portions. Foundation records mostly have a single RACC
 *    portion and no cup at all — all-purpose flour returns 30g/RACC there, against SR Legacy's
 *    125g/cup, which is the figure the plan cites. Both datasets are searched, because Foundation
 *    often ranks the *right food* higher, but a cup weight can only come from SR Legacy.
 *
 * 3. Keyword ranking is not sufficient, which the plan predicted and a scored heuristic then
 *    confirmed: it matched "chicken broth" to *Chicken, canned, no broth* and "unsalted butter"
 *    to *Pretzels, soft, unsalted*. A model picks among the real candidates instead — it is
 *    selecting between measured records, never inventing a number.
 *
 * Every row is written with the alternatives it was chosen from and a plausibility check, so the
 * human review the plan requires has something to review.
 *
 * Resumable: writes progress after every ingredient, and skips anything already resolved.
 */
import fs from 'node:fs'

const MANIFEST = process.argv[2]
const OUT = process.argv[3]
if (!MANIFEST || !OUT) {
  console.error('usage: build-weight-table.ts <manifest.json> <out.json> [limit]')
  process.exit(1)
}
const LIMIT = process.argv[4] ? Number(process.argv[4]) : Infinity

const API_KEY = fs
  .readFileSync('/root/.usda.env', 'utf8')
  .split('\n')
  .find((l) => l.includes('USDA') && l.includes('='))!
  .split('=')[1]
  .trim()
  .replace(/^['"]|['"]$/g, '')

const GEMINI_KEY = fs
  .readFileSync('/root/.recipe-worker.env', 'utf8')
  .split('\n')
  .find((l) => l.startsWith('GEMINI_API_KEY='))!
  .slice('GEMINI_API_KEY='.length)
  .trim()
  .replace(/^['"]|['"]$/g, '')
const GEMINI_MODEL = 'gemini-3.1-flash-lite'
const CHOOSER_BATCH = 15

/** The free key allows 1,000 requests an hour; this stays comfortably inside that. */
const REQUEST_INTERVAL_MS = 3800
let lastRequest = 0

async function throttled<T>(url: string): Promise<T | null> {
  const wait = REQUEST_INTERVAL_MS - (Date.now() - lastRequest)
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastRequest = Date.now()

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url)
    if (res.ok) return (await res.json()) as T
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 60_000))
      continue
    }
    return null
  }
  return null
}

interface Candidate { fdcId: number; description: string; dataType?: string }

async function search(query: string): Promise<Candidate[]> {
  const url = new URL('https://api.nal.usda.gov/fdc/v1/foods/search')
  url.searchParams.set('api_key', API_KEY)
  url.searchParams.set('query', query)
  // Both datasets: Foundation often ranks the right food higher, SR Legacy is the only one that
  // carries cup portions. The chooser is told which is which.
  url.searchParams.set('dataType', 'SR Legacy,Foundation')
  url.searchParams.set('pageSize', '10')
  const body = await throttled<{ foods?: Candidate[] }>(url.toString())
  return body?.foods ?? []
}

/**
 * Asks the model which candidate is the ingredient, in batches.
 *
 * It only ever returns an index into a list of real USDA records, or -1 for "none of these" —
 * so a wrong answer is a wrong *record*, never a wrong number. That is the distinction the plan
 * draws between selecting and inventing.
 */
async function chooseCandidates(
  batch: Array<{ name: string; candidates: Candidate[] }>,
): Promise<number[]> {
  const listing = batch
    .map((item, i) =>
      `${i}. "${item.name}"\n` +
      item.candidates.map((c, j) => `     [${j}] ${c.description} (${c.dataType})`).join('\n'),
    )
    .join('\n')

  const prompt =
    'For each numbered recipe ingredient below, choose which USDA food record describes the same ' +
    'food. Prefer "SR Legacy" records when more than one fits, because only those carry cup ' +
    'weights. Choose -1 if none of the records is the same food.\n\n' +
    'Judge the food itself, not the wording: "chicken broth" is a broth or bouillon, NOT canned ' +
    'chicken meat; "unsalted butter" is butter, NOT an unsalted snack.\n\n' +
    `${listing}\n\n` +
    `Return JSON: {"choices": [{"ingredient": 0, "record": 2}, ...]} with one entry per ingredient.`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0, thinkingConfig: { thinkingBudget: 0 } },
      }),
    },
  )
  if (!res.ok) {
    console.error(`  [chooser] ${res.status} ${res.statusText} — falling back to the top result`)
    return batch.map(() => 0)
  }
  const body = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  try {
    const parsed = JSON.parse(text) as { choices?: Array<{ ingredient: number; record: number }> }
    const picks = batch.map(() => -1)
    for (const c of parsed.choices ?? []) {
      if (c.ingredient >= 0 && c.ingredient < batch.length) picks[c.ingredient] = c.record
    }
    return picks
  } catch {
    console.error('  [chooser] unparseable response — falling back to the top result')
    return batch.map(() => 0)
  }
}

/** Words that carry no discriminating power when comparing a name to a USDA description. */
const NOISE = new Set([
  'fresh', 'freshly', 'chopped', 'minced', 'diced', 'sliced', 'grated', 'shredded', 'ground',
  'and', 'or', 'the', 'for', 'with', 'plus', 'more', 'into', 'cut', 'raw', 'large', 'small',
  'medium', 'whole', 'about',
])

const tokens = (text: string) =>
  text.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2 && !NOISE.has(w))

/**
 * Scores a candidate against the ingredient name.
 *
 * USDA descriptions lead with the food's identity and trail with qualifiers — "Salt, table",
 * "Oil, olive, extra virgin" — so a match on the leading term counts for much more than a match
 * further along. That ordering is what separates "Salt, table" from
 * "Pickles, cucumber, dill or kosher dill" for the query "kosher salt".
 */
function score(name: string, description: string): number {
  const wanted = tokens(name)
  const parts = description.toLowerCase().split(',').map((p) => p.trim())
  let total = 0
  for (const word of wanted) {
    const index = parts.findIndex((p) => p.split(/[^a-z]+/).includes(word))
    if (index === 0) total += 10
    else if (index > 0) total += 4 - Math.min(index, 3)
  }
  // A description whose head noun matches nothing we asked for is a different food.
  const headMatched = wanted.some((w) => parts[0]?.split(/[^a-z]+/).includes(w))
  return headMatched ? total : total - 12
}

interface Portion { amount?: number; gramWeight?: number; modifier?: string; measureUnit?: { name?: string } }

/**
 * How many of each portion make a cup. A record that gives only tablespoons still pins down the
 * density — butter and grated parmesan are both measured that way and would otherwise be missed
 * despite having been matched to exactly the right record.
 */
const PER_CUP: Array<[RegExp, number]> = [
  [/\bcup\b/, 1],
  [/\bfl(?:uid)?\s*oz\b/, 8],
  [/\btbsp\b|\btablespoons?\b/, 16],
  [/\btsp\b|\bteaspoons?\b/, 48],
]

/** Grams for one cup, from the portion list. SR Legacy puts the measure in `modifier`. */
async function cupWeight(fdcId: number): Promise<{ grams: number; portion: string } | null> {
  const body = await throttled<{ foodPortions?: Portion[] }>(
    `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${API_KEY}`,
  )
  for (const [pattern, perCup] of PER_CUP) {
    for (const p of body?.foodPortions ?? []) {
      const label = `${p.modifier ?? ''} ${p.measureUnit?.name ?? ''}`.toLowerCase()
      if (!pattern.test(label)) continue
      // Skip fractional or qualified measures ("1/2 cup, chopped") — only a plain one is usable.
      if (/\d\s*\/\s*\d/.test(label)) continue
      const amount = p.amount ?? 1
      if (!p.gramWeight || amount <= 0) continue
      const grams = (p.gramWeight / amount) * perCup
      return { grams: Math.round(grams * 10) / 10, portion: `${label.trim()} ×${perCup}` }
    }
  }
  return null
}

interface Row {
  key: string
  display: string
  count: number
  fdcId?: number
  matched?: string
  gramsPerCup?: number
  portion?: string
  status: 'ok' | 'no-candidate' | 'no-cup-portion' | 'low-confidence'
  score?: number
  alternatives?: string[]
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) as Array<{
  key: string; display: string; count: number; needsWeight: boolean
}>
const targets = manifest.filter((m) => m.needsWeight).slice(0, LIMIT)

const existing: Row[] = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : []
const done = new Map(existing.map((r) => [r.key, r]))

console.log(`${targets.length} ingredients need a weight; ${done.size} already resolved`)

// Searches run one at a time (rate limit), then a whole batch is handed to the chooser at once.
for (let offset = 0; offset < targets.length; offset += CHOOSER_BATCH) {
  const slice = targets.filter((t) => !done.has(t.key)).slice(0, CHOOSER_BATCH)
  if (!slice.length) break

  const withCandidates: Array<{ item: (typeof targets)[number]; candidates: Candidate[] }> = []
  for (const item of slice) {
    withCandidates.push({ item, candidates: await search(item.display) })
  }

  const choosable = withCandidates.filter((w) => w.candidates.length > 0)
  const picks = choosable.length
    ? await chooseCandidates(choosable.map((w) => ({ name: w.item.display, candidates: w.candidates })))
    : []

  for (const [i, entry] of withCandidates.entries()) {
    const { item, candidates } = entry
    let row: Row

    if (!candidates.length) {
      row = { key: item.key, display: item.display, count: item.count, status: 'no-candidate' }
    } else {
      const choiceIndex = picks[choosable.indexOf(entry)] ?? -1
      const chosen = choiceIndex >= 0 ? candidates[choiceIndex] : undefined

      if (!chosen) {
        row = {
          key: item.key, display: item.display, count: item.count, status: 'low-confidence',
          alternatives: candidates.slice(0, 4).map((c) => c.description),
        }
      } else {
        const cup = await cupWeight(chosen.fdcId)
        row = {
          key: item.key,
          display: item.display,
          count: item.count,
          fdcId: chosen.fdcId,
          matched: chosen.description,
          score: score(item.display, chosen.description),
          alternatives: candidates.filter((c) => c.fdcId !== chosen.fdcId).slice(0, 3).map((c) => c.description),
          ...(cup ? { gramsPerCup: cup.grams, portion: cup.portion } : {}),
          status: cup ? 'ok' : 'no-cup-portion',
        }
      }
    }

    done.set(item.key, row)
    void i
  }

  fs.writeFileSync(OUT, JSON.stringify([...done.values()], null, 1))
  const ok = [...done.values()].filter((r) => r.status === 'ok').length
  console.log(`  ${done.size}/${targets.length}  (${ok} with a cup weight)  last: ${slice[slice.length - 1].display.slice(0, 32)}`)
}

const rows = [...done.values()]
const by = (s: string) => rows.filter((r) => r.status === s).length
console.log(`\ndone. ${rows.length} ingredients`)
console.log(`  ok             ${by('ok')}`)
console.log(`  no cup portion ${by('no-cup-portion')}`)
console.log(`  low confidence ${by('low-confidence')}`)
console.log(`  no candidate   ${by('no-candidate')}`)
process.exit(0)

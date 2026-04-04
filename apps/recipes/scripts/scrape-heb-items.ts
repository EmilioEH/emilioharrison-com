/**
 * One-time script: uses Gemini to generate a comprehensive H-E-B Manor #811
 * grocery suggestion list and outputs src/lib/grocery-suggestions.ts
 *
 * H-E-B's GraphQL endpoint is protected by Incapsula and can't be hit
 * server-side, so we ask Gemini to produce realistic product names, approximate
 * prices, and the correct aisle assignments for Manor store #811.
 *
 * Run: npx tsx scripts/scrape-heb-items.ts
 */

import { GoogleGenAI, Type as SchemaType } from '@google/genai'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_FILE = path.resolve(__dirname, '../src/lib/grocery-suggestions.ts')
const ENV_PATH = path.resolve(__dirname, '../.env.local')

// Load API key
let GEMINI_API_KEY = process.env.GEMINI_API_KEY
if (!GEMINI_API_KEY && fs.existsSync(ENV_PATH)) {
  const envContent = fs.readFileSync(ENV_PATH, 'utf-8')
  const match = envContent.match(/GEMINI_API_KEY=(.+)/)
  if (match) GEMINI_API_KEY = match[1].trim()
}
if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY not found in env or .env.local')
  process.exit(1)
}

const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

// ─── 19-category taxonomy (H-E-B Manor #811 shopping path) ─────────────────
// Shopping order follows the store layout: left entrance → perimeter → interior
// aisles left-to-right → right wall aisles top-to-bottom → dairy → frozen

const PROMPT = `
You are a grocery product database for H-E-B store #811 in Manor, TX.

Generate a comprehensive JSON array of ~350 common grocery items that a typical
family would buy at this H-E-B. Use actual H-E-B product names where possible
(H-E-B brand, Central Market brand, or national brands they carry).

Use EXACTLY these 19 categories in the output, and assign each item to the
category that matches where it's found in H-E-B Manor #811:

Categories and their H-E-B Manor aisle numbers:
1. "Produce" — left entrance perimeter (no aisle number)
2. "Seafood" — left perimeter (no aisle number)
3. "Meat" — back-left perimeter (no aisle number)
4. "Deli & Prepared" — left perimeter (no aisle number)
5. "Bakery & Bread" — aisle 4 for packaged bread/tortillas; perimeter for fresh bakery
6. "Beer & Wine" — interior left area near bakery (no aisle number)
7. "Pantry & Condiments" — aisles 4–5 (peanut butter, jelly, salsa, condiments, rice, beans)
8. "Canned & Dry Goods" — aisle 6 (soups, canned beans/veggies/tomatoes, pasta, mac & cheese)
9. "Baking & Spices" — aisle 7 (flour, sugar, oil, spices, baking supplies)
10. "Breakfast & Cereal" — aisle 8 (cereal, oatmeal, syrup, granola, dried fruit)
11. "Snacks" — aisles 9–10 (chips, crackers, cookies, popcorn, nuts, snack bars)
12. "Beverages" — aisles 11–12 and 22–24 (soda, water, juice, coffee, sports drinks, energy drinks)
13. "Paper & Household" — aisles 25–28 (paper towels, TP, trash bags, dish soap, laundry, cleaners)
14. "Pet" — aisles 29–30 (dog food, cat food, cat litter, treats)
15. "Baby" — aisle 31 (formula, diapers, wipes, baby food)
16. "Personal Care" — aisles 32–35 (shampoo, deodorant, soap, skin care, hair care)
17. "Health & Pharmacy" — aisles 36–38 (vitamins, first aid, OTC medicine, dental)
18. "Dairy & Eggs" — right-back perimeter (no aisle number)
19. "Frozen Foods" — front-center frozen section (no aisle number)

For each item, provide:
- name: specific product name (e.g. "H-E-B Large White Eggs" not just "eggs")
- brand: brand name (e.g. "H-E-B", "Central Market", "Lay's")
- category: one of the 19 categories above (exact string match)
- aisle: integer aisle number if applicable, omit/null for perimeter departments
- hebPrice: realistic approximate price in USD (e.g. 2.49)
- hebPriceUnit: unit string (e.g. "each", "lb", "oz", "dozen", "pack")

Aim for ~350 total items distributed across all categories. Emphasize staples
that appear on most family shopping lists. Include H-E-B private label items.

Return ONLY a JSON array, no other text.
`

const SCHEMA = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      name: { type: SchemaType.STRING },
      brand: { type: SchemaType.STRING },
      category: { type: SchemaType.STRING },
      aisle: { type: SchemaType.NUMBER },
      hebPrice: { type: SchemaType.NUMBER },
      hebPriceUnit: { type: SchemaType.STRING },
    },
    required: ['name', 'brand', 'category', 'hebPrice', 'hebPriceUnit'],
  },
}

interface RawItem {
  name: string
  brand: string
  category: string
  aisle?: number | null
  hebPrice: number
  hebPriceUnit: string
}

const CATEGORY_ORDER: Record<string, number> = {
  Produce: 1,
  Seafood: 2,
  Meat: 3,
  'Deli & Prepared': 4,
  'Bakery & Bread': 5,
  'Beer & Wine': 6,
  'Pantry & Condiments': 7,
  'Canned & Dry Goods': 8,
  'Baking & Spices': 9,
  'Breakfast & Cereal': 10,
  Snacks: 11,
  Beverages: 12,
  'Paper & Household': 13,
  Pet: 14,
  Baby: 15,
  'Personal Care': 16,
  'Health & Pharmacy': 17,
  'Dairy & Eggs': 18,
  'Frozen Foods': 19,
}

async function main() {
  console.log('Asking Gemini to generate H-E-B Manor #811 grocery items…')

  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: PROMPT }] }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: SCHEMA,
      thinkingConfig: { thinkingBudget: 0 },
    },
  })

  const text = response.text
  if (!text) throw new Error('No content from Gemini')

  const raw: RawItem[] = JSON.parse(text)
  console.log(`Gemini returned ${raw.length} items`)

  // Deduplicate by lowercased name
  const seen = new Set<string>()
  const items = raw
    .filter((item) => {
      const key = item.name.toLowerCase().trim()
      if (seen.has(key)) return false
      seen.add(key)
      return CATEGORY_ORDER[item.category] !== undefined
    })
    .map((item) => ({
      name: item.name,
      brand: item.brand || undefined,
      category: item.category,
      aisle: item.aisle ?? undefined,
      hebPrice: item.hebPrice,
      hebPriceUnit: item.hebPriceUnit,
    }))

  // Sort by category order, then aisle, then name
  items.sort((a, b) => {
    const orderDiff = (CATEGORY_ORDER[a.category] ?? 99) - (CATEGORY_ORDER[b.category] ?? 99)
    if (orderDiff !== 0) return orderDiff
    if (a.aisle !== undefined && b.aisle !== undefined && a.aisle !== b.aisle) {
      return a.aisle - b.aisle
    }
    return a.name.localeCompare(b.name)
  })

  const today = new Date().toISOString().split('T')[0]
  const ts = `/**
 * Static H-E-B Manor #811 grocery suggestions.
 * Generated by scripts/scrape-heb-items.ts on ${today} using Gemini.
 * Re-run quarterly to refresh prices and add new items.
 *
 * Items are sorted in H-E-B Manor walking order (Produce → Frozen).
 * Within each category, sorted by aisle number then alphabetically.
 */

export interface GrocerySuggestion {
  name: string
  brand?: string
  category: string
  /** H-E-B Manor aisle number (undefined for perimeter departments) */
  aisle?: number
  /** Approximate H-E-B price at last generation */
  hebPrice?: number
  hebPriceUnit?: string
}

export const GROCERY_SUGGESTIONS: GrocerySuggestion[] = ${JSON.stringify(items, null, 2)}
`

  fs.writeFileSync(OUT_FILE, ts, 'utf-8')
  console.log(`\nWrote ${items.length} suggestions → ${OUT_FILE}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

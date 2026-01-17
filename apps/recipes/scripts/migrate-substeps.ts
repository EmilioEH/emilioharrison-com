#!/usr/bin/env tsx
/**
 * AI-Powered Sub-step Migration Script
 * Uses Gemini to decompose existing recipe instructions into atomic substeps
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { Recipe, StructuredStep } from '../src/lib/types'

// Initialize Firebase Admin
const serviceAccountPath = join(process.cwd(), 'firebase-service-account.json')
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))

initializeApp({
  credential: cert(serviceAccount),
})

const db = getFirestore()

// Initialize Gemini
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY environment variable is required')
  process.exit(1)
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

const SYSTEM_PROMPT = `You are a professional chef. Analyze the provided recipe text and break it down into structured, atomic steps.

For each original step:
1. Identify the core action (Title).
2. Highlight key verbs in the text.
3. Extract any "tips".
4. CRITICAL: Break the step down into "substeps" - distinct, checkable actions.

Example Substeps:
- Text: "Dice the onion and mince the garlic."
- Substeps: 
  - { text: "Dice the onion", action: "Dice", targets: ["onion"] }
  - { text: "Mince the garlic", action: "Mince", targets: ["garlic"] }

Return a JSON object with a 'structuredSteps' array.`

const structuredStepSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING, nullable: true },
    text: { type: SchemaType.STRING },
    highlightedText: { type: SchemaType.STRING },
    tip: { type: SchemaType.STRING, nullable: true },
    substeps: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          text: { type: SchemaType.STRING },
          action: { type: SchemaType.STRING },
          targets: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        },
        required: ['text', 'action'],
      },
    },
  },
  required: ['text', 'highlightedText'],
}

const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    structuredSteps: {
      type: SchemaType.ARRAY,
      items: structuredStepSchema,
    },
  },
  required: ['structuredSteps'],
}

async function migrateRecipeWithAI(recipe: Recipe): Promise<StructuredStep[] | null> {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema,
      },
    })

    const stepsList = recipe.steps.map((step, idx) => `Step ${idx + 1}: ${step}`).join('\n')
    const prompt = `Recipe: ${recipe.title}\n\nSTEPS:\n${stepsList}\n\nGenerate structured steps with atomic substeps.`

    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const parsed = JSON.parse(text)

    return parsed.structuredSteps
  } catch (error) {
    console.error(`  ⚠️ AI generation failed: ${error}`)
    return null
  }
}

async function migrateRecipes(dryRun = true, limit?: number) {
  console.log('🔍 Fetching recipes from Firestore...\n')

  const recipesRef = db.collection('recipes')
  const snapshot = await recipesRef.get()

  let recipesToMigrate: Array<{ id: string; recipe: Recipe }> = []

  snapshot.forEach((doc) => {
    const recipe = doc.data() as Recipe
    // Migrate if it has steps but NO structuredSteps (or if force flag is implemented later)
    // For now, let's target ones missing structuredSteps OR missing substeps within them
    const needsMigration =
      !recipe.structuredSteps ||
      recipe.structuredSteps.length === 0 ||
      recipe.structuredSteps.some((s) => !s.substeps)

    if (needsMigration) {
      recipesToMigrate.push({ id: doc.id, recipe })
    }
  })

  if (limit) {
    recipesToMigrate = recipesToMigrate.slice(0, limit)
  }

  console.log(`📊 Found ${recipesToMigrate.length} recipes needing migration\n`)

  if (recipesToMigrate.length === 0) {
    console.log('✅ No recipes to process!')
    return
  }

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n')
    for (const { recipe } of recipesToMigrate.slice(0, 3)) {
      console.log(`📝 ${recipe.title}`)
      const structuredSteps = await migrateRecipeWithAI(recipe)

      if (structuredSteps) {
        console.log(`   ✅ Generated ${structuredSteps.length} structured steps`)
        structuredSteps.forEach((s, i) => {
          if (s.substeps && s.substeps.length > 0) {
            console.log(
              `      Step ${i + 1}: ${s.substeps.length} substeps (${s.substeps.map((sub) => sub.action).join(', ')})`,
            )
          } else {
            console.log(`      Step ${i + 1}: No substeps found (fallback to main text)`)
          }
        })
      } else {
        console.log('   ❌ Failed to generate')
      }
      console.log()
      await new Promise((r) => setTimeout(r, 500))
    }
    console.log('\n💡 Run with --execute flag to apply changes')
    return
  }

  console.log('🚀 Starting AI-powered migration...\n')
  let successCount = 0
  let errorCount = 0

  for (const { id, recipe } of recipesToMigrate) {
    try {
      const structuredSteps = await migrateRecipeWithAI(recipe)
      if (!structuredSteps) {
        console.log(`⏭️ ${recipe.title} (AI failed, skipped)`)
        continue
      }

      await recipesRef.doc(id).update({
        structuredSteps,
        updatedAt: new Date().toISOString(),
      })

      successCount++
      console.log(`✅ ${recipe.title}`)
      await new Promise((r) => setTimeout(r, 500))
    } catch (error) {
      errorCount++
      console.error(`❌ Failed to migrate ${recipe.title}:`, error)
    }
  }

  console.log(`\n📊 Migration complete: ${successCount} success, ${errorCount} errors`)
}

// Parse args
const args = process.argv.slice(2)
const execute = args.includes('--execute')
const limitIdx = args.indexOf('--limit')
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : undefined

migrateRecipes(!execute, limit).catch(console.error)

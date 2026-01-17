#!/usr/bin/env tsx
/**
 * AI-Powered Migration Script
 * Uses Gemini to intelligently map ingredients to steps with contextual understanding
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { Recipe } from '../src/lib/types'

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

const SYSTEM_PROMPT = `You are a cooking expert.
1. Map ingredients to steps: Determine which ingredients are used in each step.
2. Structure the steps: Break down each step into atomic "substeps".

OUTPUT FORMAT:
Return a JSON object with:
- stepIngredients: Array<{ indices: number[] }> (mapping of ingredients to steps)
- structuredSteps: Array<{ title?, text, highlightedText, tip?, substeps: Array<{ text, action, targets }> }>

RULES:
- Be intelligent about matching ingredients (plurals, pronouns).
- For substeps, break down compound instructions (e.g. "Dice onion and sauté" -> 2 substeps).
- CRITICAL: Maintain the EXACT number and order of steps as the input. Do not merge or split the main steps.
`

const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    stepIngredients: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: { indices: { type: SchemaType.ARRAY, items: { type: SchemaType.NUMBER } } },
        required: ['indices'],
      },
    },
    structuredSteps: {
      type: SchemaType.ARRAY,
      items: {
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
      },
    },
  },
  required: ['stepIngredients', 'structuredSteps'],
}

async function mapIngredientsWithAI(
  recipe: Recipe,
): Promise<{ stepIngredients: Array<{ indices: number[] }>; structuredSteps: any[] } | null> {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema,
      },
    })

    const ingredientsList = recipe.ingredients
      .map((ing, idx) => `${idx}: ${ing.amount || ''} ${ing.name}`.trim())
      .join('\n')

    const stepsList = recipe.steps.map((step, idx) => `Step ${idx + 1}: ${step}`).join('\n')

    const prompt = `Recipe: ${recipe.title}

INGREDIENTS:
${ingredientsList}

STEPS:
${stepsList}

Task:
1. Map ingredients to steps.
2. Generate structured steps with atomic substeps.`

    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const parsed = JSON.parse(text)

    return {
      stepIngredients: parsed.stepIngredients,
      structuredSteps: parsed.structuredSteps,
    }
  } catch (error) {
    console.error(`  ⚠️ AI mapping failed: ${error}`)
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
    // Skip test recipes
    if (recipe.title?.includes('Bulk Delete') || recipe.title?.includes('Export Test')) {
      return
    }
    recipesToMigrate.push({ id: doc.id, recipe })
  })

  if (limit) {
    recipesToMigrate = recipesToMigrate.slice(0, limit)
  }

  console.log(`📊 Processing ${recipesToMigrate.length} recipes\n`)

  if (recipesToMigrate.length === 0) {
    console.log('✅ No recipes to process!')
    return
  }

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n')
    console.log('Preview of AI-generated mappings:\n')

    for (const { recipe } of recipesToMigrate.slice(0, 3)) {
      console.log(`📝 ${recipe.title}`)
      console.log(`   Steps: ${recipe.steps.length}, Ingredients: ${recipe.ingredients.length}`)

      const mapping = await mapIngredientsWithAI(recipe)
      if (mapping) {
        mapping.forEach((stepMapping, stepIdx) => {
          if (stepMapping.indices.length > 0) {
            const ingredientNames = stepMapping.indices
              .map((i) => recipe.ingredients[i]?.name || `[Invalid: ${i}]`)
              .join(', ')
            console.log(
              `   Step ${stepIdx + 1}: [${stepMapping.indices.join(', ')}] → ${ingredientNames}`,
            )
          } else {
            console.log(`   Step ${stepIdx + 1}: No ingredients`)
          }
        })
      } else {
        console.log('   ❌ Failed to generate mapping')
      }
      console.log()

      // Rate limiting - wait 500ms between requests
      await new Promise((r) => setTimeout(r, 500))
    }

    console.log('\n💡 Run with --execute flag to apply changes')
    console.log('💡 Use --limit N to process only N recipes')
    return
  }

  // Execute migration
  console.log('🚀 Starting AI-powered migration...\n')

  let successCount = 0
  let errorCount = 0
  let skippedCount = 0

  for (const { id, recipe } of recipesToMigrate) {
    try {
      const result = await mapIngredientsWithAI(recipe)

      if (!result) {
        skippedCount++
        console.log(`⏭️ ${recipe.title} (AI failed, skipped)`)
        continue
      }

      await recipesRef.doc(id).update({
        stepIngredients: result.stepIngredients,
        structuredSteps: result.structuredSteps,
        updatedAt: new Date().toISOString(),
      })

      successCount++
      console.log(`✅ ${recipe.title}`)

      // Rate limiting - wait 300ms between requests to avoid hitting API limits
      await new Promise((r) => setTimeout(r, 300))
    } catch (error) {
      errorCount++
      console.error(`❌ Failed to migrate ${recipe.title}:`, error)
    }
  }

  console.log(`\n📊 Migration complete!`)
  console.log(`   ✅ Success: ${successCount}`)
  console.log(`   ⏭️ Skipped: ${skippedCount}`)
  console.log(`   ❌ Errors: ${errorCount}`)
}

// Parse command line arguments
const args = process.argv.slice(2)
const execute = args.includes('--execute')
const limitIdx = args.indexOf('--limit')
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : undefined

migrateRecipes(!execute, limit)
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error)
    process.exit(1)
  })

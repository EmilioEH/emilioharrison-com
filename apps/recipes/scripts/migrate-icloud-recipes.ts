import { FirebaseRestService } from '../src/lib/firebase-rest'
import { GoogleGenAI, Type as SchemaType } from '@google/genai'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const SOURCE_DIR = '/Users/emilioharrison/Library/Mobile Documents/com~apple~CloudDocs/Recipes'
const TARGET_EMAIL = 'emilioeh1991@gmail.com'
const DRY_RUN = process.env.DRY_RUN === 'true'

// Load Env
const envPath = path.resolve(__dirname, '../.env.local')
let GEMINI_API_KEY = process.env.GEMINI_API_KEY
if (!GEMINI_API_KEY && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  const match = envContent.match(/GEMINI_API_KEY=(.*)/)
  if (match) {
    GEMINI_API_KEY = match[1].trim()
  }
}

if (!GEMINI_API_KEY) {
  console.error('CRITICAL: GEMINI_API_KEY not found in environment or .env.local')
  process.exit(1)
}

// --- AI Prompts (Copied from parse-recipe.ts) ---
const PROTEIN_OPTIONS = [
  'Chicken',
  'Beef',
  'Pork',
  'Fish',
  'Seafood',
  'Vegetarian',
  'Vegan',
  'Other',
]

const INGREDIENT_PARSING_RULES = `
**INGREDIENT PARSING & FORMATTING (ENHANCED MODE)**:
- **Dual Measurements**: ALWAYS provide volume (cups/tbsp) AND mass (grams/ounces) for dry goods and produce.
- **State & Prep**: Define the PHYSICAL STATE of the ingredient BEFORE it enters the pan.
- **Specificity**: Infer specific varieties contextually.
- **Divided Uses**: If used multiple times (e.g. sauce and pasta water), append ", divided" to the name/prep.
`

const INGREDIENT_GROUPING_RULES = `
**INGREDIENT GROUPING (ENHANCED MODE)**:
- **Mise-en-Place Flow**: Organize by chronology of use and component grouping.
- **Logical Sub-Headers**: Group by component.
- **Strict Mapping**: Every ingredient must belong to a group.
- **Populate**: 'ingredientGroups' with startIndex and endIndex for each group.
`

const STRUCTURED_STEPS_RULES = `
**STRUCTURED STEPS (ENHANCED MODE - MACRO-STEPS)**:
- **Macro-Step Architecture**: Group instructions into "Macro-Steps" based on phases of cooking.
- **The "Until" Framework**: Every step involving heat MUST define a sensory endpoint using "until".
- **Data Structure**: Populate 'structuredSteps' array with title, text, highlightedText, tip, and substeps.
`

const STEP_GROUPING_RULES = `
**STEP GROUPING (REQUIRED)**:
- **Match Ingredients**: Organize steps into logical phases that MATCH the ingredient groups.
- **Chronological**: The step groups should mirror the ingredient groups chronologically.
- **Populate**: 'stepGroups' with header, startIndex, and endIndex.
`

const IMAGE_SYSTEM_PROMPT = `
You are an expert Chef and Data Engineer. Your task is to extract structured recipe data from the provided image.

Return a strict JSON object matching the provided schema.

Rules:
1. Describe what you see in the image and infer the recipe (ingredients/steps) as best as possible.
2. Generate a one-sentence "description" that makes the dish sound delicious.
3. Identify the "Main Protein Source" and map it strictly to one of these values: ${PROTEIN_OPTIONS.join(', ')}.
4. Infer the "Meal Type", "Dish Type", "Equipment", "Occasion", and "Dietary" attributes.
5. **Normalize Ingredients**: Populate 'structuredIngredients'.
6. **Map Ingredients to Steps**: Populate 'stepIngredients'.
${INGREDIENT_PARSING_RULES}
${INGREDIENT_GROUPING_RULES}
${STRUCTURED_STEPS_RULES}
${STEP_GROUPING_RULES}
`

// Schema Definition (Updated for @google/genai types if distinct? usually same structure)
// @google/genai SchemaType matches closely what we had.
const recipeSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    description: { type: SchemaType.STRING },
    servings: { type: SchemaType.NUMBER },
    prepTime: { type: SchemaType.NUMBER },
    cookTime: { type: SchemaType.NUMBER },
    ingredients: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          amount: { type: SchemaType.STRING },
          prep: { type: SchemaType.STRING, nullable: true },
        },
        required: ['name', 'amount'],
      },
    },
    structuredIngredients: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          original: { type: SchemaType.STRING },
          name: { type: SchemaType.STRING },
          amount: { type: SchemaType.NUMBER },
          unit: { type: SchemaType.STRING },
          category: { type: SchemaType.STRING },
        },
        required: ['original', 'name', 'amount', 'unit', 'category'],
      },
    },
    steps: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    stepIngredients: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          indices: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.NUMBER },
          },
        },
        required: ['indices'],
      },
    },
    ingredientGroups: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          header: { type: SchemaType.STRING },
          startIndex: { type: SchemaType.NUMBER },
          endIndex: { type: SchemaType.NUMBER },
        },
        required: ['header', 'startIndex', 'endIndex'],
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
    stepGroups: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          header: { type: SchemaType.STRING },
          startIndex: { type: SchemaType.NUMBER },
          endIndex: { type: SchemaType.NUMBER },
        },
        required: ['header', 'startIndex', 'endIndex'],
      },
    },
    notes: { type: SchemaType.STRING, nullable: true },
    protein: { type: SchemaType.STRING },
    mealType: { type: SchemaType.STRING },
    dishType: { type: SchemaType.STRING },
    equipment: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    occasion: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    dietary: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    difficulty: { type: SchemaType.STRING },
    cuisine: { type: SchemaType.STRING },
  },
  required: ['title', 'ingredients', 'steps', 'description'],
}

// Helper: Recursively find files
function findFiles(dir: string, extensions: string[]): string[] {
  let results: string[] = []
  if (!fs.existsSync(dir)) return []
  const list = fs.readdirSync(dir)
  list.forEach((file) => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    if (stat && stat.isDirectory()) {
      results = results.concat(findFiles(filePath, extensions))
    } else {
      if (extensions.some((ext) => file.toLowerCase().endsWith(ext))) {
        results.push(filePath)
      }
    }
  })
  return results
}

async function migrate() {
  console.log(`Starting iCloud Migration (Standalone Node Mode - @google/genai)...`)
  console.log(`Dry Run: ${DRY_RUN}`)

  try {
    // 1. Initialize Firebase
    const serviceAccountPath = path.resolve(__dirname, '../firebase-service-account.json')
    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(`Service account not found at: ${serviceAccountPath}`)
    }
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'))
    const db = new FirebaseRestService(serviceAccount)

    // Determine bucket name for uploads
    const STORAGE_BUCKET = `${serviceAccount.project_id}.firebasestorage.app`
    console.log(`Using Storage Bucket: ${STORAGE_BUCKET}`)

    // 2. Initialize Gemini (@google/genai)
    const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

    // 3. Find Target User
    console.log('Finding user...')
    const users = await db.getCollection('users')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const targetUser = (users as any[]).find(
      (u) => u.email?.toLowerCase() === TARGET_EMAIL.toLowerCase(),
    )
    if (!targetUser) {
      throw new Error(`User ${TARGET_EMAIL} not found`)
    }
    console.log(`Found User: ${targetUser.email}`)

    // 4. Delete Old Recipes (Skipping if dry run or if already deleted)
    console.log('Scanning for existing AI-parsed recipes...')
    const allRecipes = await db.getCollection('recipes')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemsToDelete = (allRecipes as any[]).filter((r) => r.creationMethod === 'ai-parse')

    console.log(`Found ${itemsToDelete.length} existing AI-parsed recipes to delete.`)

    if (!DRY_RUN && itemsToDelete.length > 0) {
      const deleteChunkSize = 20
      for (let i = 0; i < itemsToDelete.length; i += deleteChunkSize) {
        const chunk = itemsToDelete.slice(i, i + deleteChunkSize)
        await Promise.all(chunk.map((r) => db.deleteDocument('recipes', r.id)))
        process.stdout.write('.')
      }
      console.log('\nDeletion complete.')
    } else if (itemsToDelete.length === 0) {
      console.log('Nothing to delete.')
    } else {
      console.log('Skipping deletion (DRY RUN)')
    }

    // 5. Find Local Files
    console.log('Scanning iCloud folder...')
    const imageFiles = findFiles(SOURCE_DIR, ['.jpg', '.jpeg', '.png', '.heic'])
    console.log(`Found ${imageFiles.length} images to process.`)

    // 6. Process Images
    // PROCESSING ALL FILES
    const filesToProcess = imageFiles

    for (const [index, filePath] of filesToProcess.entries()) {
      const fileName = path.basename(filePath)
      const parts = filePath.replace(SOURCE_DIR, '').split('/').filter(Boolean)

      // parts[0] is category, parts[1] is title
      // let _category = parts[0] ?? 'Uncategorized'
      let candidateTitle = parts[1]

      if (candidateTitle.endsWith('.heic') || candidateTitle.endsWith('.jpg')) {
        candidateTitle = path.parse(candidateTitle).name
      } else {
        if (parts.includes('Attachments')) {
          const attachIndex = parts.indexOf('Attachments')
          if (attachIndex > 0) {
            candidateTitle = parts[attachIndex - 1]
          }
        }
      }

      console.log(`[${index + 1}/${filesToProcess.length}] Processing "${candidateTitle}"...`)

      if (DRY_RUN) continue

      try {
        const fileBuffer = fs.readFileSync(filePath)
        let processedBuffer = fileBuffer
        let base64Data = fileBuffer.toString('base64')
        let mimeType = 'image/jpeg'

        // Handle HEIC
        if (fileName.toLowerCase().endsWith('.heic')) {
          console.log(`      converting HEIC to JPEG...`)
          // @ts-ignore
          const heicConvert = (await import('heic-convert')).default
          processedBuffer = await heicConvert({
            buffer: fileBuffer,
            format: 'JPEG',
            quality: 0.8,
          })
          base64Data = Buffer.from(processedBuffer).toString('base64')
          mimeType = 'image/jpeg'
        } else if (fileName.toLowerCase().endsWith('.png')) {
          mimeType = 'image/png'
        }

        // @google/genai Call Pattern
        const result = await client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                { text: IMAGE_SYSTEM_PROMPT },
                { inlineData: { mimeType, data: base64Data } },
              ],
            },
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: recipeSchema,
          },
        })

        let text = ''
        if (result.candidates && result.candidates.length > 0) {
          const candidate = result.candidates[0]
          if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
            text = candidate.content.parts[0].text || ''
          }
        }

        if (!text) {
          console.log('--- DEBUG RESULT ---')
          console.log(JSON.stringify(result, null, 2))
          throw new Error('No text found in candidates')
        }

        // OPTIMIZE IMAGE (Resize & Compress)
        // --------------------------------------------------------------------------
        let optimizedBuffer = processedBuffer // Start with heic-converted or original buffer
        let optimizedMimeType = mimeType

        // If it was HEIC, we already converted it to JPEG buffer above.
        // If it was PNG/JPEG, we still need to resize/compress.

        // Use the buffer we have (base64Data is just string representation)
        // Note: heic-convert output is a buffer.

        try {
          // Use the processedBuffer (which is already JPEG if HEIC was input)
          const inputBufferForSharp = processedBuffer

          console.log(`      optimizing image with sharp...`)
          const sharp = (await import('sharp')).default
          optimizedBuffer = (await sharp(inputBufferForSharp)
            .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80, progressive: true })
            .toBuffer()) as unknown as Buffer

          optimizedMimeType = 'image/jpeg' // Always normalize to JPEG

          // Update base64Data for AI analysis to use the optimized version (faster/cheaper)
          // This part is actually too late, AI call already happened.
          // The AI call should use the *original* or *heic-converted* buffer.
          // The optimization is for storage.
          // Reverting the base64Data update here.
          // base64Data = optimizedBuffer.toString('base64')
          // mimeType = optimizedMimeType
        } catch (e) {
          console.error('      Sharp optimization failed, falling back to original', e)
          // Fallback: use original (or heic-converted) buffer
          // If HEIC converted, inputBuffer was the jpeg.
        }

        // --------------------------------------------------------------------------
        // UPLOAD TO FIREBASE STORAGE
        // --------------------------------------------------------------------------
        // Upload the OPTIMIZED buffer, not the original huge file
        // STORAGE_BUCKET is available from outer scope
        const imageKey = `migration-${Date.now()}-${crypto.randomUUID()}.jpg` // Always .jpg now

        console.log(`      uploading optimized image to ${STORAGE_BUCKET}...`)
        await db.uploadFile(STORAGE_BUCKET, imageKey, optimizedBuffer, optimizedMimeType)
        // CRITICAL: Production is hosted at /protected/recipes, so we must include that base
        // Or make it relative? Absolute with base is safer for now.
        const imageUrl = `/protected/recipes/api/uploads/${imageKey}`

        const recipeData = JSON.parse(text)

        // Enrich Data
        recipeData.title = candidateTitle
        recipeData.createdBy = targetUser.id
        recipeData.familyId = targetUser.familyId
        recipeData.creationMethod = 'ai-parse'
        recipeData.createdAt = new Date().toISOString()
        recipeData.updatedAt = recipeData.createdAt

        // Add Images
        recipeData.images = [imageUrl]
        recipeData.sourceImage = imageUrl

        const savedDoc = await db.createDocument('recipes', null, recipeData)
        console.log(
          `   - Saved "${recipeData.title}" (ID: ${savedDoc.name ? savedDoc.name.split('/').pop() : 'unknown'}) + Image`,
        )
      } catch (err) {
        console.error(`   - Failed to process ${fileName}:`, err)
      }
    }

    console.log('Migration Complete.')
  } catch (e) {
    console.error('Migration failed:', e)
  }
}

migrate()

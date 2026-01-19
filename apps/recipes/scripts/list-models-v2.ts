import { GoogleGenAI } from '@google/genai'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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
  console.error('CRITICAL: GEMINI_API_KEY not found')
  process.exit(1)
}

const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

async function listModels() {
  try {
    console.log('Listing models...')
    const response = await client.models.list()

    // The response might be an async iterable or object depending on version
    // In 1.34.0 it might return a list directly or paged response
    console.log('Response:', JSON.stringify(response, null, 2))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((response as any).models) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(response as any).models.forEach((m: any) => {
        console.log(
          `- ${m.name} (${m.version}) [supported methods: ${m.supportedGenerationMethods}]`,
        )
      })
    }
  } catch (e) {
    console.error('Error:', e)
  }
}

listModels()

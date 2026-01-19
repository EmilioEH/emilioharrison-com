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

async function testGenerate() {
  try {
    console.log('Testing generateContent with gemini-2.5-flash...')

    const result = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: 'Hello, are you there?' }] }],
    })

    console.log('Result keys:', Object.keys(result))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((result as any).response) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.log('Response keys:', Object.keys((result as any).response))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.log('Text:', (result as any).response.text())
    } else {
      console.log(
        'No response object found. Candidates:',
        JSON.stringify(result.candidates, null, 2),
      )
    }
  } catch (e) {
    console.error('Error:', e)
  }
}

testGenerate()

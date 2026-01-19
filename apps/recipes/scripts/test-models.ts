import { GoogleGenerativeAI } from '@google/generative-ai'
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

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

async function listModels() {
  try {
    // There is no listModels on the client instance directly in this SDK version?
    // Actually there is usually no easy listModels in the wrapper.
    // But let's try the model manager if it exists.
    // Or just try a simple generation with 'gemini-pro' to see if auth works.

    console.log('Testing gemini-pro...')
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
    const result = await model.generateContent('Hello')
    console.log('Gemini Pro works. Response:', result.response.text())

    console.log('Testing gemini-1.5-flash...')
    const modelFlash = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const resultFlash = await modelFlash.generateContent('Hello')
    console.log('Gemini 1.5 Flash works. Response:', resultFlash.response.text())
  } catch (e) {
    console.error('Error:', e)
  }
}

listModels()

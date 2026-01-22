import fs from 'fs'
import path from 'path'

const REQUIRED_KEYS = [
  'GEMINI_API_KEY',
  'PUBLIC_FIREBASE_API_KEY',
  'PUBLIC_FIREBASE_AUTH_DOMAIN',
  'PUBLIC_FIREBASE_PROJECT_ID',
  'PUBLIC_FIREBASE_STORAGE_BUCKET',
  'PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'PUBLIC_FIREBASE_APP_ID',
  'PUBLIC_VAPID_KEY',
  'VAPID_PRIVATE_KEY',
]

const PLACEHOLDER_PREFIXES = ['your_', 'your-project', '<']

function checkEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local')

  if (!fs.existsSync(envPath)) {
    console.error('\x1b[31mError: .env.local file is missing!\x1b[0m')
    console.log('Please copy .env.local.example to .env.local and fill in the required values.')
    process.exit(1)
  }

  const content = fs.readFileSync(envPath, 'utf-8')
  const env: Record<string, string> = {}

  content.split('\n').forEach((line) => {
    const [key, value] = line.split('=')
    if (key && value) {
      env[key.trim()] = value.trim()
    }
  })

  const missingKeys = REQUIRED_KEYS.filter((key) => !env[key])
  const placeholderKeys = REQUIRED_KEYS.filter((key) => {
    const val = env[key]
    return val && PLACEHOLDER_PREFIXES.some((prefix) => val.toLowerCase().startsWith(prefix))
  })

  if (missingKeys.length > 0 || placeholderKeys.length > 0) {
    console.error('\x1b[31mEnvironment Validation Failed!\x1b[0m')

    if (missingKeys.length > 0) {
      console.log('\x1b[33mMissing required keys:\x1b[0m')
      missingKeys.forEach((key) => console.log(`  - ${key}`))
    }

    if (placeholderKeys.length > 0) {
      console.log('\x1b[33mKeys with placeholder values:\x1b[0m')
      placeholderKeys.forEach((key) => console.log(`  - ${key} (currently: ${env[key]})`))
    }

    console.log('\n\x1b[36mHow to fix:\x1b[0m')
    console.log('1. Open your apps/recipes/.env.local file')
    console.log('2. Provide valid API keys and configuration for the items listed above.')
    console.log('3. These values can be found in your Firebase Console and Gemini API Dashboard.')

    process.exit(1)
  }

  console.log('\x1b[32m✔ Environment validation successful.\x1b[0m')
}

checkEnv()

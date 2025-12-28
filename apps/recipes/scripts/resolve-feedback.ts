import { execSync } from 'child_process'

const id = process.argv[2]
const status = process.argv[3] || 'fixed'
const envArg = process.argv[4]

if (!id) {
  console.error('Usage: npx tsx scripts/resolve-feedback.ts <id> [status=fixed] [env=remote|local]')
  console.error('Example: npx tsx scripts/resolve-feedback.ts 123-abc fixed remote')
  process.exit(1)
}

const isLocal = envArg === 'local'
const envFlag = isLocal ? '--local' : '--remote'

console.log(`Resolving feedback ${id} as '${status}' (${isLocal ? 'local' : 'remote'})...`)

const resolvedAt = status !== 'open' ? new Date().toISOString() : null
const query = `UPDATE feedback SET status = '${status}', resolved_at = '${resolvedAt || ''}' WHERE id = '${id}'`

try {
  execSync(`npx wrangler d1 execute recipes-db ${envFlag} --command "${query}"`, {
    stdio: 'inherit',
    env: { ...process.env, CI: 'true' },
  })
  console.log('✅ Feedback updated.')
} catch (e) {
  console.error('❌ Failed to update feedback:', e)
  process.exit(1)
}

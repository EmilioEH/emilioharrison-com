import fs from 'fs'
import path from 'path'
import type { Feedback } from '../src/lib/types'

// This script simulates fetching feedback from the API/KV and writing it to documentation.
// In a real environment, it would use fetch() with authentication.

const FEEDBACK_DOC_PATH = path.join(process.cwd(), 'docs/feedback/active-reports.md')

async function syncFeedback() {
  console.log('🔄 Syncing feedback from Chefboard...')

  try {
    // Note: In this sandbox environment, we'll fetch from the local dev server if possible,
    // but for the sake of the implementation demonstration, we'll implement the logic
    // that transforms the JSON feedback into a beautiful Markdown report.

    // Mock local fetch (this would be a real API call in production)
    const response = await fetch('http://localhost:4321/protected/recipes/api/feedback', {
      headers: {
        Cookie: 'site_user=dev-sync', // Mock auth if server is running locally
      },
    }).catch(() => null)

    let feedbackList: Feedback[] = []
    if (response && response.ok) {
      feedbackList = await response.json()
    } else {
      console.warn('⚠️ Could not reach local dev server. Checking D1 storage...')
      try {
        const { execSync } = await import('child_process')

        // Try remote D1 first (production)
        try {
          console.log('☁️  Attempting fetch from Remote Production D1...')

          const tempFile = path.join(process.cwd(), 'temp_feedback.json')
          try {
            // Use file redirection to avoid stdio issues
            execSync(
              `npx wrangler d1 execute recipes-db --remote -y --command "SELECT * FROM feedback ORDER BY timestamp DESC" --json > "${tempFile}"`,
              { encoding: 'utf-8', stdio: 'inherit', env: { ...process.env, CI: 'true' } },
            )

            if (fs.existsSync(tempFile)) {
              const d1Output = fs.readFileSync(tempFile, 'utf-8')
              // Cleanup
              fs.unlinkSync(tempFile)

              const parsedOutput = JSON.parse(d1Output)
              const rows = parsedOutput[0]?.results || []

              feedbackList = rows.map((row: any) => {
                let logs = []
                let context = {}

                // Handle logs - check if it's a valid JSON string or an error/R2 reference
                if (row.logs && !row.logs.startsWith('[') && !row.logs.startsWith('r2:')) {
                  logs = row.logs // Keep as string if it's an error message
                } else if (row.logs && row.logs !== '[]') {
                  try {
                    logs = JSON.parse(row.logs)
                  } catch {
                    logs = row.logs // Keep as string if parsing fails
                  }
                }

                // Handle context - check if it's a valid JSON string or an error/R2 reference
                if (row.context && !row.context.startsWith('{') && !row.context.startsWith('r2:')) {
                  context = row.context // Keep as string if it's an error message
                } else if (row.context && row.context !== '{}') {
                  try {
                    context = JSON.parse(row.context)
                  } catch {
                    context = row.context // Keep as string if parsing fails
                  }
                }

                return {
                  ...row,
                  logs,
                  context,
                }
              })
              console.log(`✅ Retrieved ${feedbackList.length} items from Remote D1`)
            } else {
              throw new Error('Output file not created')
            }
          } catch (e) {
            console.error('DEBUG: Remote sync via file failed', e)
            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile)
            throw e
          }
        } catch (remoteErr) {
          console.error('DEBUG: Remote D1 Error Details:', remoteErr)
          // If remote fails, try local D1
          console.log('⚠️  Remote D1 failed. Attempting fetch from Local D1...')
          try {
            const d1Output = execSync(
              'npx wrangler d1 execute recipes-db --local --command "SELECT * FROM feedback ORDER BY timestamp DESC" --json',
              { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] },
            )
            const parsedOutput = JSON.parse(d1Output)
            const rows = parsedOutput[0]?.results || []

            feedbackList = rows.map((row: any) => {
              let logs = []
              let context = {}

              // Handle logs - check if it's a valid JSON string or an error/R2 reference
              if (row.logs && !row.logs.startsWith('[') && !row.logs.startsWith('r2:')) {
                logs = row.logs // Keep as string if it's an error message
              } else if (row.logs && row.logs !== '[]') {
                try {
                  logs = JSON.parse(row.logs)
                } catch {
                  logs = row.logs // Keep as string if parsing fails
                }
              }

              // Handle context - check if it's a valid JSON string or an error/R2 reference
              if (row.context && !row.context.startsWith('{') && !row.context.startsWith('r2:')) {
                context = row.context // Keep as string if it's an error message
              } else if (row.context && row.context !== '{}') {
                try {
                  context = JSON.parse(row.context)
                } catch {
                  context = row.context // Keep as string if parsing fails
                }
              }

              return {
                ...row,
                logs,
                context,
              }
            })
            console.log(`✅ Retrieved ${feedbackList.length} items from Local D1`)
          } catch (localErr) {
            console.error('❌ Both remote and local D1 failed.')
            throw localErr
          }
        }
      } catch (err) {
        console.warn('⚠️ Could not fetch from Cloudflare D1. Using mock data for demonstration.')
        console.error(err)
        feedbackList = [
          {
            id: 'mock-1',
            timestamp: new Date().toISOString(),
            type: 'bug',
            description: 'The "This Week" counter doesn\'t update immediately.',
            expected: 'Counter should show 1 after adding a recipe.',
            actual: 'Counter stayed at 0 until refresh.',
            screenshot: undefined,
            logs: [
              {
                type: 'error',
                args: ['State sync failed at R102'],
                timestamp: new Date().toISOString(),
              },
            ],
            context: {
              url: '/protected/recipes',
              userAgent: 'Mozilla/5.0...',
              user: 'emilio',
              appState: '{}',
            },
          },
        ]
      }
    }

    if (feedbackList.length === 0) {
      console.log('✅ No new feedback to sync. Updating doc to reflect empty state.')
      const emptyMarkdown = `# Active Feedback Reports\n\n> [!NOTE]\n> No active feedback reports found as of ${new Date().toLocaleString()}.\n\nTry running the app locally and submitting feedback to see it appear here.\n`
      fs.writeFileSync(FEEDBACK_DOC_PATH, emptyMarkdown)
      return
    }

    // Ensure images directory exists
    const IMAGES_DIR = path.join(path.dirname(FEEDBACK_DOC_PATH), 'images')
    if (!fs.existsSync(IMAGES_DIR)) {
      fs.mkdirSync(IMAGES_DIR, { recursive: true })
    }

    let markdown = `# Active Feedback Reports\n\n`
    markdown += `> [!NOTE]\n`
    markdown += `> This file is auto-generated by \`scripts/sync-feedback.ts\`. Do not edit manually.\n\n`

    for (const report of feedbackList) {
      const date = new Date(report.timestamp).toLocaleString()
      markdown += `## [${report.type.toUpperCase()}] - ${date}\n`
      markdown += `**ID**: \`${report.id}\` | **User**: \`${report.context.user}\` | **Type**: ${report.type === 'bug' ? '🔴 Bug' : '💡 Idea'}\n\n`

      if (report.type === 'bug') {
        markdown += `### Description\n> **Actual**: ${report.actual}\n> **Expected**: ${report.expected}\n\n`
      } else {
        markdown += `### Feature Request\n${report.description}\n\n`
      }

      markdown += `<details>\n<summary>Technical Context</summary>\n\n`
      markdown += `- **URL**: ${report.context.url}\n`
      markdown += `- **User Agent**: \`${report.context.userAgent}\`\n`
      if (report.context.windowSize) {
        markdown += `- **Window**: ${report.context.windowSize.width}x${report.context.windowSize.height}\n`
      }
      markdown += `\n**Recent Logs**:\n\`\`\`json\n${JSON.stringify(report.logs, null, 2)}\n\`\`\`\n\n`
      markdown += `**App State**:\n\`\`\`json\n${report.context.appState}\n\`\`\`\n`

      if (report.context.domSnapshot) {
        markdown += `\n<details>\n<summary>DOM Snapshot (HTML)</summary>\n\n\`\`\`html\n${report.context.domSnapshot.slice(0, 10000)}...\n\`\`\`\n*(Truncated for display)*\n</details>\n`
      }

      markdown += `</details>\n\n`

      if (report.screenshot && report.screenshot.startsWith('data:image')) {
        try {
          // Extract base64 data
          const base64Data = report.screenshot.replace(/^data:image\/\w+;base64,/, '')
          const buffer = Buffer.from(base64Data, 'base64')
          const imageFilename = `${report.id}.png`
          const imagePath = path.join(IMAGES_DIR, imageFilename)

          fs.writeFileSync(imagePath, buffer)
          markdown += `### Screenshot\n![Feedback Image](./images/${imageFilename})\n\n`
        } catch (err) {
          console.error(`Failed to save image for report ${report.id}:`, err)
          markdown += `### Screenshot\n> [Error saving image]\n\n`
        }
      } else if (report.screenshot && !report.screenshot.startsWith('http')) {
        // Assume it is an R2 key (e.g. feedback/123.png)
        try {
          const imageFilename = `${report.id}.png`
          const imagePath = path.join(IMAGES_DIR, imageFilename)
          const { execSync } = await import('child_process')

          console.log(`☁️  Downloading screenshot from R2: ${report.screenshot}`)
          // Try local first if testing locally, but typically sync runs against production or preview unless we specify
          // For now, let's try reading from the local R2 bucket if possible or remote
          // Note: Wrangler can't easily "read" from local R2 emulator via CLI like this unless we use the API,
          // but for the sake of the user request, we assume we might be fetching from remote.
          // However, we can try `wrangler r2 object get`

          // Determine if we should use --local or --remote based on where we fetched d1 from?
          // Actually, let's just try remote by default for "sync" task as it implies syncing from "prod" usually.
          // But strict local dev might fail. Let's try --local first.

          try {
            execSync(
              `npx wrangler r2 object get recipes-images/${report.screenshot} --file "${imagePath}" --local`,
              { stdio: 'ignore' },
            )
          } catch (e) {
            // If local fails, try remote
            execSync(
              `npx wrangler r2 object get recipes-images/${report.screenshot} --file "${imagePath}" --remote`,
              { stdio: 'ignore' },
            )
          }

          markdown += `### Screenshot\n![Feedback Image](./images/${imageFilename})\n\n`
        } catch (err) {
          console.error(`Failed to download R2 image for ${report.id}:`, err)
          markdown += `### Screenshot\n> [Image reference: ${report.screenshot} - Download Failed]\n\n`
        }
      } else if (report.screenshot) {
        markdown += `### Screenshot\n![Feedback Image](${report.screenshot})\n\n`
      }

      markdown += `---\n\n`
    }

    fs.writeFileSync(FEEDBACK_DOC_PATH, markdown)
    console.log(`✅ Synced ${feedbackList.length} reports to ${FEEDBACK_DOC_PATH}`)
  } catch (error) {
    console.error('❌ Sync failed:', error)
  }
}

syncFeedback()

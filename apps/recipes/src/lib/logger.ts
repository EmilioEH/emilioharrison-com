import type { LogEntry } from './types'

const MAX_LOGS = 100

class LogBuffer {
  private logs: LogEntry[] = []
  private isInitialized = false

  init() {
    if (this.isInitialized) return
    if (typeof window === 'undefined') return // Client-side only

    this.isInitialized = true
    this.patchConsole('log')
    this.patchConsole('info')
    this.patchConsole('warn')
    this.patchConsole('error')

    console.info('[LogBuffer] Initialized logging capture.')
  }

  private patchConsole(type: LogEntry['type']) {
    const original = console[type]
    console[type] = (...args: unknown[]) => {
      // Create a simplified string representation of args to avoid circular references and memory leaks
      const safeArgs = args.map((arg) => {
        try {
          if (typeof arg === 'object') {
            return JSON.stringify(arg)
          }
          return String(arg)
        } catch {
          return '[Circular/Unserializable]'
        }
      })

      this.logs.push({
        type,
        args: safeArgs,
        timestamp: new Date().toISOString(),
      })

      if (this.logs.length > MAX_LOGS) {
        this.logs.shift()
      }

      original.apply(console, args)
    }
  }

  getLogs(): LogEntry[] {
    // Firestore limit is ~1MB. We aim for 800KB to be safe.
    const MAX_BYTES = 800 * 1024
    let currentBytes = 0
    const safeLogs: LogEntry[] = []

    // Iterate backwards to keep most recent logs
    for (let i = this.logs.length - 1; i >= 0; i--) {
      const entry = this.logs[i]
      // Estimate size: timestamp (~24) + type (~5) + args content
      const entrySize = 30 + (entry.args ? entry.args.reduce((acc, str) => acc + str.length, 0) : 0)

      if (currentBytes + entrySize > MAX_BYTES) {
        console.warn(
          `[Logger] Truncating log history. Dropped ${this.logs.length - 1 - i} older logs to fit 1MB limit.`,
        )
        break
      }

      currentBytes += entrySize
      safeLogs.unshift(entry)
    }

    return safeLogs
  }
}

export const logger = new LogBuffer()

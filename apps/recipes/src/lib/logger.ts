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
            return JSON.stringify(arg, null, 2)
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
    return [...this.logs]
  }
}

export const logger = new LogBuffer()

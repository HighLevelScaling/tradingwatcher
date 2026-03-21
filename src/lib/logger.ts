/**
 * Structured logger for the trading system.
 * Outputs JSON-formatted log lines suitable for production log aggregation.
 * Falls back to readable console output in development.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  module: string
  message: string
  data?: Record<string, unknown>
  error?: string
  stack?: string
  timestamp: string
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const MIN_LEVEL = LOG_LEVELS[(process.env.LOG_LEVEL as LogLevel) ?? 'info'] ?? 1
const IS_PROD = process.env.NODE_ENV === 'production'

function formatEntry(entry: LogEntry): string {
  if (IS_PROD) {
    return JSON.stringify(entry)
  }
  const prefix = `[${entry.module}]`
  const errorSuffix = entry.error ? ` | ${entry.error}` : ''
  const dataSuffix = entry.data ? ` ${JSON.stringify(entry.data)}` : ''
  return `${prefix} ${entry.message}${errorSuffix}${dataSuffix}`
}

function log(level: LogLevel, module: string, message: string, extra?: { data?: Record<string, unknown>; error?: unknown }) {
  if (LOG_LEVELS[level] < MIN_LEVEL) return

  const entry: LogEntry = {
    level,
    module,
    message,
    timestamp: new Date().toISOString(),
  }

  if (extra?.data) entry.data = extra.data
  if (extra?.error) {
    entry.error = extra.error instanceof Error ? extra.error.message : String(extra.error)
    if (extra.error instanceof Error && extra.error.stack) {
      entry.stack = extra.error.stack
    }
  }

  const formatted = formatEntry(entry)

  switch (level) {
    case 'debug':
      console.debug(formatted)
      break
    case 'info':
      console.log(formatted)
      break
    case 'warn':
      console.warn(formatted)
      break
    case 'error':
      console.error(formatted)
      break
  }
}

export function createLogger(module: string) {
  return {
    debug: (message: string, data?: Record<string, unknown>) => log('debug', module, message, { data }),
    info: (message: string, data?: Record<string, unknown>) => log('info', module, message, { data }),
    warn: (message: string, data?: Record<string, unknown>) => log('warn', module, message, { data }),
    error: (message: string, error?: unknown, data?: Record<string, unknown>) => log('error', module, message, { error, data }),
  }
}

export type Logger = ReturnType<typeof createLogger>

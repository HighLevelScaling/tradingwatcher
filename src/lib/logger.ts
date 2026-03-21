type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  context: string
  timestamp: string
  data?: Record<string, unknown>
  error?: string
  stack?: string
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const MIN_LEVEL: LogLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug'
const IS_PROD = process.env.NODE_ENV === 'production'

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL]
}

function formatEntry(entry: LogEntry): string {
  if (IS_PROD) {
    return JSON.stringify(entry)
  }
  const color = { debug: '\x1b[90m', info: '\x1b[36m', warn: '\x1b[33m', error: '\x1b[31m' }[entry.level]
  const reset = '\x1b[0m'
  const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : ''
  const errorStr = entry.error ? ` | ${entry.error}` : ''
  return `${color}[${entry.level.toUpperCase()}]${reset} [${entry.context}] ${entry.message}${errorStr}${dataStr}`
}

function log(level: LogLevel, context: string, message: string, data?: Record<string, unknown>, error?: unknown) {
  if (!shouldLog(level)) return
  const entry: LogEntry = {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
    ...(data && { data }),
  }
  if (error) {
    entry.error = error instanceof Error ? error.message : String(error)
    if (error instanceof Error && error.stack) {
      entry.stack = error.stack
    }
  }
  const output = formatEntry(entry)
  if (level === 'error') {
    console.error(output)
  } else if (level === 'warn') {
    console.warn(output)
  } else {
    console.log(output)
  }
}

export function createLogger(context: string) {
  return {
    debug: (message: string, data?: Record<string, unknown>) => log('debug', context, message, data),
    info: (message: string, data?: Record<string, unknown>) => log('info', context, message, data),
    warn: (message: string, data?: Record<string, unknown>) => log('warn', context, message, data),
    error: (message: string, error?: unknown, data?: Record<string, unknown>) => log('error', context, message, data, error),
  }
}

export type Logger = ReturnType<typeof createLogger>

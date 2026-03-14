/**
 * Background runner — runs the agent cycle every 60 seconds during market hours.
 * Run with: npx tsx src/agents/runner.ts
 *
 * Runs 24/7 but only submits orders during market hours (Mon-Fri 9:30-16:00 ET).
 */

// Load env vars
import { config } from 'dotenv'
config({ path: '.env' })

import { AgentOrchestrator } from './orchestrator'

// ─── Market Hours Helper ──────────────────────────────────────────────────────

function isMarketHours(): boolean {
  const now = new Date()
  // Convert to ET (UTC-5 standard, UTC-4 DST)
  const etOffset = isDST(now) ? -4 : -5
  const etTime = new Date(now.getTime() + etOffset * 60 * 60 * 1000)

  const day = etTime.getUTCDay() // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false

  const hours = etTime.getUTCHours()
  const minutes = etTime.getUTCMinutes()
  const timeInMinutes = hours * 60 + minutes

  // 9:30 AM to 4:00 PM ET
  return timeInMinutes >= 9 * 60 + 30 && timeInMinutes < 16 * 60
}

function isDST(date: Date): boolean {
  const jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset()
  const jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset()
  return Math.max(jan, jul) !== date.getTimezoneOffset()
}

function getNextMarketOpen(): string {
  const now = new Date()
  const etOffset = isDST(now) ? -4 : -5
  const etTime = new Date(now.getTime() + etOffset * 60 * 60 * 1000)

  const day = etTime.getUTCDay()
  const hours = etTime.getUTCHours()
  const minutes = etTime.getUTCMinutes()
  const timeInMinutes = hours * 60 + minutes

  let daysUntilOpen = 0

  if (day === 0) daysUntilOpen = 1 // Sunday → Monday
  else if (day === 6) daysUntilOpen = 2 // Saturday → Monday
  else if (timeInMinutes >= 16 * 60) daysUntilOpen = day === 5 ? 3 : 1 // after close
  else daysUntilOpen = 0

  const nextOpenET = new Date(etTime)
  nextOpenET.setUTCDate(nextOpenET.getUTCDate() + daysUntilOpen)
  nextOpenET.setUTCHours(9, 30, 0, 0)
  const nextOpenUTC = new Date(nextOpenET.getTime() - etOffset * 60 * 60 * 1000)

  return nextOpenUTC.toLocaleString('en-US', { timeZone: 'America/New_York' })
}

// ─── Runner ───────────────────────────────────────────────────────────────────

const CYCLE_INTERVAL_MS = 60 * 1000 // 60 seconds
let orchestrator: AgentOrchestrator | null = null
let isShuttingDown = false
let cycleTimer: ReturnType<typeof setInterval> | null = null

async function runCycle(): Promise<void> {
  if (isShuttingDown) return

  const market = isMarketHours()
  const timestamp = new Date().toISOString()

  if (!market) {
    console.log(`[Runner] ${timestamp} — Market closed. Next open: ${getNextMarketOpen()}`)
    return
  }

  console.log(`[Runner] ${timestamp} — Market open, running cycle...`)

  try {
    const result = await orchestrator!.runCycle()
    if (result.errors.length > 0) {
      console.warn(`[Runner] Cycle completed with ${result.errors.length} error(s) in ${result.duration}ms:`)
      result.errors.forEach((e) => console.warn('  -', e))
    } else {
      console.log(`[Runner] Cycle completed successfully in ${result.duration}ms`)
    }
  } catch (e) {
    console.error('[Runner] Cycle threw unhandled error:', e)
  }
}

async function shutdown(): Promise<void> {
  if (isShuttingDown) return
  isShuttingDown = true
  console.log('\n[Runner] Shutting down gracefully...')
  if (cycleTimer) clearInterval(cycleTimer)
  if (orchestrator) await orchestrator.disconnect()
  console.log('[Runner] Shutdown complete.')
  process.exit(0)
}

async function start(): Promise<void> {
  console.log('[Runner] Starting Autonomous Trading System...')
  console.log(`[Runner] Cycle interval: ${CYCLE_INTERVAL_MS / 1000}s`)
  console.log('[Runner] Press Ctrl+C to stop\n')

  orchestrator = new AgentOrchestrator()

  // Initialize agents
  try {
    await orchestrator.initialize()
    console.log('[Runner] Agents initialized')
  } catch (e) {
    console.error('[Runner] Failed to initialize agents:', e)
    process.exit(1)
  }

  // Run first cycle immediately
  await runCycle()

  // Then run on interval
  cycleTimer = setInterval(runCycle, CYCLE_INTERVAL_MS)

  // Graceful shutdown
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
  process.on('uncaughtException', (err) => {
    console.error('[Runner] Uncaught exception:', err)
    shutdown()
  })
  process.on('unhandledRejection', (reason) => {
    console.error('[Runner] Unhandled rejection:', reason)
  })
}

start()

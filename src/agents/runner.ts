/**
 * Background runner — runs the agent cycle every 60 seconds.
 * Crypto markets are 24/7, so this runs continuously without market-hours checks.
 * Run with: npx tsx src/agents/runner.ts
 */

// Load env vars
import { config } from 'dotenv'
config({ path: '.env' })

import { AgentOrchestrator } from './orchestrator'

// ─── Runner ───────────────────────────────────────────────────────────────────

const CYCLE_INTERVAL_MS = 60 * 1000 // 60 seconds
let orchestrator: AgentOrchestrator | null = null
let isShuttingDown = false
let cycleTimer: ReturnType<typeof setInterval> | null = null

async function runCycle(): Promise<void> {
  if (isShuttingDown) return

  const timestamp = new Date().toISOString()
  console.log(`[Runner] ${timestamp} — Running cycle...`)

  try {
    const result = await orchestrator!.runCycle()
    if (result.errors.length > 0) {
      console.warn(
        `[Runner] Cycle completed with ${result.errors.length} error(s) in ${result.duration}ms:`
      )
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
  console.log('[Runner] Starting Autonomous Crypto Trading System...')
  console.log(`[Runner] Cycle interval: ${CYCLE_INTERVAL_MS / 1000}s`)
  console.log('[Runner] Crypto markets are 24/7 — running continuously')
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

  // Then run on interval — no market hours check needed for crypto
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

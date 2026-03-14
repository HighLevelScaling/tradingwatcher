/**
 * AgentOrchestrator — the central nervous system of the trading system.
 * Coordinates all agents, manages state, and runs the full cycle.
 *
 * Note: Prisma types for new models (TradingAgent, AgentTrade, etc.) are not yet
 * reflected in the generated client until `prisma generate` is re-run against the DB.
 * We use `(prisma as any)` to access the new models until that step is completed.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck — New Prisma models are in schema but require `prisma generate` after migration.
// TypeScript types will be correct once generated. All runtime types are validated by Prisma.
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { createAlpacaClient, type AlpacaClient } from '@/lib/trading/alpaca'
import { generateAllSignals, type AgentConfig, type Candle } from '@/lib/trading/signals'
import {
  DEFAULT_MOMENTUM_CONFIG,
  DEFAULT_MEAN_REV_CONFIG,
  DEFAULT_BREAKOUT_CONFIG,
} from '@/lib/trading/signals'
import { detectPairsArbitrage, DEFAULT_PAIRS } from '@/lib/trading/arbitrage'
import { syncAllOpenTrades, executeSignalForSymbol } from '@/lib/trading/executor'
import { DEFAULT_RISK_CONFIG } from '@/lib/trading/risk'
import { Indicators } from '@/lib/trading/indicators'

const DEFAULT_SYMBOLS = ['SPY', 'QQQ', 'AAPL', 'NVDA', 'TSLA', 'AMZN', 'MSFT', 'AMD', 'IWM', 'META']
const CANDLE_RETENTION = 200

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  return new PrismaClient({ adapter }) as unknown as PrismaClient
}

// ─────────────────────────────────────────────────────────────────────────────

export class AgentOrchestrator {
  private alpaca: AlpacaClient
  private prisma: PrismaClient
  private isRunning: boolean = false
  private cycleCount: number = 0

  // Accessor that bypasses stale Prisma typings for newly-added models.
  // Once `prisma generate` is run against the migrated DB, these types will be available natively.
  private get db(): any {
    return this.prisma
  }

  constructor() {
    this.alpaca = createAlpacaClient()
    this.prisma = createPrismaClient()
  }

  // ─── Initialize: seed default agents ─────────────────────────────────────

  async initialize(): Promise<void> {
    const defaultAgents = [
      {
        name: 'Market Data Agent',
        type: 'MARKET_DATA' as const,
        symbols: DEFAULT_SYMBOLS,
        config: { timeframes: ['3Min', '5Min'] },
      },
      {
        name: 'Momentum Agent',
        type: 'SIGNAL' as const,
        symbols: DEFAULT_SYMBOLS,
        config: { strategy: 'momentum', ...DEFAULT_MOMENTUM_CONFIG },
      },
      {
        name: 'Mean Reversion Agent',
        type: 'SIGNAL' as const,
        symbols: DEFAULT_SYMBOLS,
        config: { strategy: 'meanReversion', ...DEFAULT_MEAN_REV_CONFIG },
      },
      {
        name: 'Arbitrage Agent',
        type: 'ARBITRAGE' as const,
        symbols: DEFAULT_PAIRS.flat(),
        config: { pairs: DEFAULT_PAIRS, zScoreThreshold: 2.0 },
      },
      {
        name: 'Execution Agent',
        type: 'EXECUTION' as const,
        symbols: DEFAULT_SYMBOLS,
        config: { signalStrengthThreshold: 0.6, riskConfig: DEFAULT_RISK_CONFIG },
      },
      {
        name: 'Learning Agent',
        type: 'LEARNING' as const,
        symbols: DEFAULT_SYMBOLS,
        config: {
          optimizeEvery: 10,
          lookbackDays: 30,
          rsiPeriods: [9, 11, 14, 21],
          bbPeriods: [15, 20, 25],
          bbStdDevs: [1.5, 2.0, 2.5],
        },
      },
      {
        name: 'Self Test Agent',
        type: 'SELF_TEST' as const,
        symbols: DEFAULT_SYMBOLS,
        config: { runEveryMinutes: 15 },
      },
    ]

    for (const agentDef of defaultAgents) {
      const existing = await this.db.tradingAgent.findFirst({
        where: { name: agentDef.name },
      })
      if (!existing) {
        await this.db.tradingAgent.create({
          data: {
            ...agentDef,
            status: 'IDLE',
            mode: 'PAPER',
            isActive: true,
          },
        })
        console.log(`[Orchestrator] Created agent: ${agentDef.name}`)
      }
    }
  }

  // ─── Main cycle ───────────────────────────────────────────────────────────

  async runCycle(): Promise<{ errors: string[]; duration: number }> {
    if (this.isRunning) {
      return { errors: ['Cycle already running'], duration: 0 }
    }

    this.isRunning = true
    this.cycleCount++
    const errors: string[] = []
    const start = Date.now()

    try {
      await this.initialize()

      console.log(`[Orchestrator] Starting cycle #${this.cycleCount}`)

      // 1. Fetch market data
      try {
        await this.runMarketDataAgent()
      } catch (e) {
        errors.push(`MarketData: ${e instanceof Error ? e.message : String(e)}`)
      }

      // 2. Generate signals
      try {
        await this.runSignalAgent()
      } catch (e) {
        errors.push(`Signal: ${e instanceof Error ? e.message : String(e)}`)
      }

      // 3. Detect arbitrage
      try {
        await this.runArbitrageAgent()
      } catch (e) {
        errors.push(`Arbitrage: ${e instanceof Error ? e.message : String(e)}`)
      }

      // 4. Execute signals
      try {
        await this.runExecutionAgent()
      } catch (e) {
        errors.push(`Execution: ${e instanceof Error ? e.message : String(e)}`)
      }

      // 5. Sync open trades
      try {
        await this.syncTrades()
      } catch (e) {
        errors.push(`SyncTrades: ${e instanceof Error ? e.message : String(e)}`)
      }

      // 6. Snapshot P&L
      try {
        await this.snapshotPnL()
      } catch (e) {
        errors.push(`SnapshotPnL: ${e instanceof Error ? e.message : String(e)}`)
      }

      // 7. Self-test every 15 cycles (approx 15 min at 1-min intervals)
      const minute = new Date().getMinutes()
      if (minute % 15 === 0) {
        try {
          await this.runSelfTestAgent()
        } catch (e) {
          errors.push(`SelfTest: ${e instanceof Error ? e.message : String(e)}`)
        }
      }

      // 8. Learning agent after every 10 closed trades
      try {
        const recentClosedCount = await this.db.agentTrade.count({
          where: {
            status: 'CLOSED',
            exitAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // last hour
          },
        })
        if (recentClosedCount > 0 && recentClosedCount % 10 === 0) {
          await this.runLearningAgent()
        }
      } catch (e) {
        errors.push(`Learning: ${e instanceof Error ? e.message : String(e)}`)
      }
    } finally {
      this.isRunning = false
    }

    const duration = Date.now() - start
    console.log(`[Orchestrator] Cycle #${this.cycleCount} completed in ${duration}ms. Errors: ${errors.length}`)
    return { errors, duration }
  }

  // ─── Market Data Agent ────────────────────────────────────────────────────

  async runMarketDataAgent(): Promise<void> {
    const agent = await this.db.tradingAgent.findFirst({
      where: { type: 'MARKET_DATA' },
    })
    if (!agent) return

    await this.db.tradingAgent.update({
      where: { id: agent.id },
      data: { status: 'RUNNING' },
    })

    const errors: string[] = []
    const now = new Date()
    const start = new Date(now.getTime() - 60 * 60 * 1000 * 4).toISOString() // 4 hours back

    try {
      for (const timeframe of ['3Min', '5Min'] as const) {
        try {
          const barsMap = await this.alpaca.getBars({
            symbols: DEFAULT_SYMBOLS,
            timeframe,
            start,
            limit: CANDLE_RETENTION,
          })

          for (const [symbol, bars] of barsMap.entries()) {
            for (const bar of bars) {
              await this.db.marketCandle.upsert({
                where: {
                  symbol_timeframe_timestamp: {
                    symbol,
                    timeframe,
                    timestamp: new Date(bar.t),
                  },
                },
                update: {
                  open: bar.o,
                  high: bar.h,
                  low: bar.l,
                  close: bar.c,
                  volume: bar.v,
                  vwap: bar.vw ?? null,
                },
                create: {
                  symbol,
                  timeframe,
                  timestamp: new Date(bar.t),
                  open: bar.o,
                  high: bar.h,
                  low: bar.l,
                  close: bar.c,
                  volume: bar.v,
                  vwap: bar.vw ?? null,
                },
              })
            }

            // Prune old candles — keep only last CANDLE_RETENTION per symbol+timeframe
            const oldCandles = await this.db.marketCandle.findMany({
              where: { symbol, timeframe },
              orderBy: { timestamp: 'desc' },
              skip: CANDLE_RETENTION,
              select: { id: true },
            })
            if (oldCandles.length > 0) {
              await this.db.marketCandle.deleteMany({
                where: { id: { in: oldCandles.map((c) => c.id) } },
              })
            }
          }
        } catch (e) {
          errors.push(`${timeframe}: ${e instanceof Error ? e.message : String(e)}`)
        }
      }

      await this.db.tradingAgent.update({
        where: { id: agent.id },
        data: {
          status: 'IDLE',
          lastRunAt: new Date(),
          lastError: errors.length > 0 ? errors.join('; ') : null,
        },
      })
    } catch (e) {
      await this.db.tradingAgent.update({
        where: { id: agent.id },
        data: {
          status: 'ERROR',
          lastError: e instanceof Error ? e.message : String(e),
          errorCount: { increment: 1 },
        },
      })
      throw e
    }
  }

  // ─── Signal Agent ─────────────────────────────────────────────────────────

  async runSignalAgent(): Promise<void> {
    const agents = await this.db.tradingAgent.findMany({
      where: { type: 'SIGNAL', isActive: true },
    })

    for (const agent of agents) {
      await this.db.tradingAgent.update({
        where: { id: agent.id },
        data: { status: 'RUNNING' },
      })

      try {
        const config = agent.config as AgentConfig & { strategy?: string }

        for (const symbol of agent.symbols) {
          for (const timeframe of ['3Min', '5Min']) {
            const dbCandles = await this.db.marketCandle.findMany({
              where: { symbol, timeframe },
              orderBy: { timestamp: 'asc' },
              take: CANDLE_RETENTION,
            })

            if (dbCandles.length < 30) continue

            const candles: Candle[] = dbCandles.map((c) => ({
              timestamp: c.timestamp,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
              volume: c.volume,
              vwap: c.vwap ?? undefined,
            }))

            const agentConfig: AgentConfig = {}
            if (config.strategy === 'momentum') {
              agentConfig.momentum = {
                rsiPeriod: (config as { rsiPeriod?: number }).rsiPeriod ?? DEFAULT_MOMENTUM_CONFIG.rsiPeriod,
                macdFast: (config as { macdFast?: number }).macdFast ?? DEFAULT_MOMENTUM_CONFIG.macdFast,
                macdSlow: (config as { macdSlow?: number }).macdSlow ?? DEFAULT_MOMENTUM_CONFIG.macdSlow,
                macdSignal: (config as { macdSignal?: number }).macdSignal ?? DEFAULT_MOMENTUM_CONFIG.macdSignal,
                rsiOversold: (config as { rsiOversold?: number }).rsiOversold ?? DEFAULT_MOMENTUM_CONFIG.rsiOversold,
                rsiOverbought: (config as { rsiOverbought?: number }).rsiOverbought ?? DEFAULT_MOMENTUM_CONFIG.rsiOverbought,
              }
            } else if (config.strategy === 'meanReversion') {
              agentConfig.meanReversion = {
                bbPeriod: (config as { bbPeriod?: number }).bbPeriod ?? DEFAULT_MEAN_REV_CONFIG.bbPeriod,
                bbStdDev: (config as { bbStdDev?: number }).bbStdDev ?? DEFAULT_MEAN_REV_CONFIG.bbStdDev,
                rsiPeriod: (config as { rsiPeriod?: number }).rsiPeriod ?? DEFAULT_MEAN_REV_CONFIG.rsiPeriod,
                rsiOversold: (config as { rsiOversold?: number }).rsiOversold ?? DEFAULT_MEAN_REV_CONFIG.rsiOversold,
                rsiOverbought: (config as { rsiOverbought?: number }).rsiOverbought ?? DEFAULT_MEAN_REV_CONFIG.rsiOverbought,
              }
            } else {
              agentConfig.breakout = DEFAULT_BREAKOUT_CONFIG
              agentConfig.momentum = DEFAULT_MOMENTUM_CONFIG
              agentConfig.meanReversion = DEFAULT_MEAN_REV_CONFIG
            }

            const signals = generateAllSignals(candles, agentConfig)

            for (const signal of signals) {
              await this.db.tradingSignal.create({
                data: {
                  agentId: agent.id,
                  symbol,
                  type: signal.type as 'MOMENTUM' | 'MEAN_REVERSION' | 'BREAKOUT' | 'ARBITRAGE',
                  direction: signal.direction as 'BUY' | 'SELL',
                  strength: signal.strength,
                  price: signal.price,
                  indicators: signal.indicators as Record<string, unknown>,
                  timeframe,
                  actedOn: false,
                },
              })
            }
          }
        }

        await this.db.tradingAgent.update({
          where: { id: agent.id },
          data: { status: 'IDLE', lastRunAt: new Date(), lastError: null },
        })
      } catch (e) {
        await this.db.tradingAgent.update({
          where: { id: agent.id },
          data: {
            status: 'ERROR',
            lastError: e instanceof Error ? e.message : String(e),
            errorCount: { increment: 1 },
          },
        })
      }
    }
  }

  // ─── Arbitrage Agent ──────────────────────────────────────────────────────

  async runArbitrageAgent(): Promise<void> {
    const agent = await this.db.tradingAgent.findFirst({
      where: { type: 'ARBITRAGE', isActive: true },
    })
    if (!agent) return

    await this.db.tradingAgent.update({
      where: { id: agent.id },
      data: { status: 'RUNNING' },
    })

    try {
      const allSymbols = Array.from(new Set(DEFAULT_PAIRS.flat()))
      const quotesMap = await this.alpaca.getLatestQuotes(allSymbols)

      const prices: Record<string, number> = {}
      for (const [symbol, quote] of quotesMap.entries()) {
        prices[symbol] = quote.last || (quote.bid + quote.ask) / 2
      }

      // Load candles for ratio history
      const candlesMap: Record<string, Candle[]> = {}
      for (const symbol of allSymbols) {
        const dbCandles = await this.db.marketCandle.findMany({
          where: { symbol, timeframe: '5Min' },
          orderBy: { timestamp: 'asc' },
          take: 50,
        })
        candlesMap[symbol] = dbCandles.map((c) => ({
          timestamp: c.timestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
        }))
      }

      const config = agent.config as { pairs?: [string, string][]; zScoreThreshold?: number }
      const opportunities = detectPairsArbitrage(
        prices,
        candlesMap,
        config.pairs ?? DEFAULT_PAIRS,
        config.zScoreThreshold ?? 2.0
      )

      for (const opp of opportunities) {
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // expires in 5 min
        await this.db.arbitrageOpportunity.create({
          data: {
            type: opp.type,
            symbols: opp.symbols,
            spreadPct: opp.spreadPct,
            zScore: opp.zScore,
            estimatedPnl: opp.estimatedPnl,
            status: 'DETECTED',
            actedOn: false,
            expiresAt,
            metadata: {
              direction: opp.direction,
              confidence: opp.confidence,
              ...(opp.metadata ?? {}),
            },
          },
        })
      }

      await this.db.tradingAgent.update({
        where: { id: agent.id },
        data: { status: 'IDLE', lastRunAt: new Date(), lastError: null },
      })
    } catch (e) {
      await this.db.tradingAgent.update({
        where: { id: agent.id },
        data: {
          status: 'ERROR',
          lastError: e instanceof Error ? e.message : String(e),
          errorCount: { increment: 1 },
        },
      })
    }
  }

  // ─── Execution Agent ──────────────────────────────────────────────────────

  async runExecutionAgent(): Promise<void> {
    const agent = await this.db.tradingAgent.findFirst({
      where: { type: 'EXECUTION', isActive: true },
    })
    if (!agent) return

    await this.db.tradingAgent.update({
      where: { id: agent.id },
      data: { status: 'RUNNING' },
    })

    try {
      const config = agent.config as { signalStrengthThreshold?: number }
      const threshold = config.signalStrengthThreshold ?? 0.6

      // Get unacted high-strength signals (last 5 min)
      const cutoff = new Date(Date.now() - 5 * 60 * 1000)
      const signals = await this.db.tradingSignal.findMany({
        where: {
          actedOn: false,
          strength: { gte: threshold },
          createdAt: { gte: cutoff },
        },
        orderBy: { strength: 'desc' },
        take: 5,
      })

      // Get current account state
      const account = await this.alpaca.getAccount()
      const equity = parseFloat(account.equity)

      const openTrades = await this.db.agentTrade.findMany({
        where: { status: 'OPEN', mode: agent.mode },
      })

      // Today's P&L
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayTrades = await this.db.agentTrade.findMany({
        where: {
          status: 'CLOSED',
          exitAt: { gte: todayStart },
          mode: agent.mode,
        },
        select: { pnl: true },
      })
      const dayPnl = todayTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0)

      let newTradesCount = 0

      for (const signal of signals) {
        // Get candles for this symbol
        const dbCandles = await this.db.marketCandle.findMany({
          where: { symbol: signal.symbol, timeframe: signal.timeframe },
          orderBy: { timestamp: 'asc' },
          take: 50,
        })

        const candles: Candle[] = dbCandles.map((c) => ({
          timestamp: c.timestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
        }))

        const result = await executeSignalForSymbol({
          signal: {
            type: signal.type as 'MOMENTUM' | 'MEAN_REVERSION' | 'BREAKOUT' | 'ARBITRAGE',
            direction: signal.direction as 'BUY' | 'SELL',
            strength: signal.strength,
            price: signal.price,
            reason: '',
            indicators: signal.indicators as Record<string, number>,
          },
          symbol: signal.symbol,
          agentId: agent.id,
          equity,
          openPositions: openTrades.length,
          dayPnl,
          candles,
          timeframe: signal.timeframe,
          alpaca: this.alpaca,
          prisma: this.prisma,
          mode: agent.mode as 'PAPER' | 'LIVE',
        })

        if (result.success) {
          newTradesCount++
        }

        // Mark signal as acted on regardless of execution success
        await this.db.tradingSignal.update({
          where: { id: signal.id },
          data: { actedOn: true },
        })
      }

      // Update agent metrics
      if (newTradesCount > 0) {
        const allTrades = await this.db.agentTrade.findMany({
          where: { agentId: agent.id, status: 'CLOSED' },
          select: { pnl: true },
        })
        const totalPnl = allTrades.reduce((s, t) => s + (t.pnl ?? 0), 0)
        const winners = allTrades.filter((t) => (t.pnl ?? 0) > 0).length
        const winRate = allTrades.length > 0 ? winners / allTrades.length : 0
        const totalTrades = await this.db.agentTrade.count({ where: { agentId: agent.id } })

        await this.db.tradingAgent.update({
          where: { id: agent.id },
          data: { totalPnl, todayPnl: dayPnl, winRate, totalTrades },
        })
      }

      await this.db.tradingAgent.update({
        where: { id: agent.id },
        data: { status: 'IDLE', lastRunAt: new Date(), lastError: null },
      })
    } catch (e) {
      await this.db.tradingAgent.update({
        where: { id: agent.id },
        data: {
          status: 'ERROR',
          lastError: e instanceof Error ? e.message : String(e),
          errorCount: { increment: 1 },
        },
      })
    }
  }

  // ─── Sync Trades ──────────────────────────────────────────────────────────

  async syncTrades(): Promise<void> {
    await syncAllOpenTrades({ alpaca: this.alpaca, prisma: this.prisma })

    // Refresh agent P&L totals
    const agents = await this.db.tradingAgent.findMany({
      where: { type: 'EXECUTION' },
    })

    for (const agent of agents) {
      const closed = await this.db.agentTrade.findMany({
        where: { agentId: agent.id, status: 'CLOSED' },
        select: { pnl: true },
      })
      const totalPnl = closed.reduce((s, t) => s + (t.pnl ?? 0), 0)
      const winners = closed.filter((t) => (t.pnl ?? 0) > 0).length
      const winRate = closed.length > 0 ? winners / closed.length : 0
      const totalTrades = await this.db.agentTrade.count({ where: { agentId: agent.id } })

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayTrades = await this.db.agentTrade.findMany({
        where: { agentId: agent.id, status: 'CLOSED', exitAt: { gte: todayStart } },
        select: { pnl: true },
      })
      const todayPnl = todayTrades.reduce((s, t) => s + (t.pnl ?? 0), 0)

      await this.db.tradingAgent.update({
        where: { id: agent.id },
        data: { totalPnl, todayPnl, winRate, totalTrades },
      })
    }
  }

  // ─── Snapshot P&L ─────────────────────────────────────────────────────────

  async snapshotPnL(): Promise<void> {
    const account = await this.alpaca.getAccount()
    const equity = parseFloat(account.equity)
    const cash = parseFloat(account.cash)
    const openPositions = (await this.alpaca.getPositions()).length

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayTrades = await this.db.agentTrade.findMany({
      where: { status: 'CLOSED', exitAt: { gte: todayStart }, mode: 'PAPER' },
      select: { pnl: true },
    })
    const dayPnl = todayTrades.reduce((s, t) => s + (t.pnl ?? 0), 0)

    const allClosed = await this.db.agentTrade.findMany({
      where: { status: 'CLOSED', mode: 'PAPER' },
      select: { pnl: true },
    })
    const totalPnl = allClosed.reduce((s, t) => s + (t.pnl ?? 0), 0)

    await this.db.pnLSnapshot.create({
      data: {
        mode: 'PAPER',
        totalPnl,
        dayPnl,
        openPositions,
        equity,
        cash,
      },
    })
  }

  // ─── Learning Agent ───────────────────────────────────────────────────────

  async runLearningAgent(): Promise<void> {
    const agent = await this.db.tradingAgent.findFirst({
      where: { type: 'LEARNING', isActive: true },
    })
    if (!agent) return

    await this.db.tradingAgent.update({
      where: { id: agent.id },
      data: { status: 'RUNNING' },
    })

    try {
      const recentTrades = await this.db.agentTrade.findMany({
        where: { status: 'CLOSED' },
        orderBy: { exitAt: 'desc' },
        take: 50,
      })

      if (recentTrades.length < 10) {
        await this.db.tradingAgent.update({
          where: { id: agent.id },
          data: { status: 'IDLE', lastRunAt: new Date() },
        })
        return
      }

      const pnls = recentTrades.map((t) => t.pnl ?? 0)
      const returns = recentTrades.map((t) => t.pnlPct ?? 0)
      const winners = pnls.filter((p) => p > 0).length
      const winRate = winners / pnls.length
      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length
      const stdDev = Math.sqrt(
        returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length
      )
      const sharpeRatio = stdDev === 0 ? 0 : (avgReturn / stdDev) * Math.sqrt(252)

      // Running drawdown
      let peak = 0
      let maxDrawdown = 0
      let cumulative = 0
      for (const pnl of [...pnls].reverse()) {
        cumulative += pnl
        if (cumulative > peak) peak = cumulative
        const dd = peak === 0 ? 0 : (peak - cumulative) / peak
        if (dd > maxDrawdown) maxDrawdown = dd
      }

      // Grid search for best RSI period using last 30 days candles (SPY as proxy)
      const config = agent.config as {
        rsiPeriods?: number[]
        bbPeriods?: number[]
        bbStdDevs?: number[]
      }

      const rsiPeriods = config.rsiPeriods ?? [9, 11, 14, 21]
      const bbPeriods = config.bbPeriods ?? [15, 20, 25]
      const bbStdDevs = config.bbStdDevs ?? [1.5, 2.0, 2.5]

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const spyCandles = await this.db.marketCandle.findMany({
        where: {
          symbol: 'SPY',
          timeframe: '5Min',
          timestamp: { gte: thirtyDaysAgo },
        },
        orderBy: { timestamp: 'asc' },
      })

      let bestSharpe = sharpeRatio
      let bestConfig = {
        rsiPeriod: DEFAULT_MOMENTUM_CONFIG.rsiPeriod,
        bbPeriod: DEFAULT_MEAN_REV_CONFIG.bbPeriod,
        bbStdDev: DEFAULT_MEAN_REV_CONFIG.bbStdDev,
      }

      if (spyCandles.length > 50) {
        const closes = spyCandles.map((c) => c.close)

        for (const rsiPeriod of rsiPeriods) {
          for (const bbPeriod of bbPeriods) {
            for (const bbStdDev of bbStdDevs) {
              try {
                const rsiVals = Indicators.rsi(closes, rsiPeriod)
                const { upper, lower } = Indicators.bollingerBands(closes, bbPeriod, bbStdDev)

                if (rsiVals.length < 5 || upper.length < 5) continue

                // Simple backtest: count signal quality
                let signalReturns: number[] = []
                const minLen = Math.min(rsiVals.length, upper.length)
                for (let i = 1; i < minLen; i++) {
                  const rsi = rsiVals[rsiVals.length - minLen + i]
                  const u = upper[upper.length - minLen + i]
                  const l = lower[lower.length - minLen + i]
                  const price = closes[closes.length - minLen + i]
                  const prevPrice = closes[closes.length - minLen + i - 1]
                  const ret = prevPrice === 0 ? 0 : (price - prevPrice) / prevPrice

                  if (rsi < 30 && price < l) signalReturns.push(ret) // BUY signal
                  if (rsi > 70 && price > u) signalReturns.push(-ret) // SELL signal
                }

                if (signalReturns.length < 5) continue
                const meanRet = signalReturns.reduce((a, b) => a + b, 0) / signalReturns.length
                const sdRet = Math.sqrt(
                  signalReturns.reduce((a, b) => a + Math.pow(b - meanRet, 2), 0) / signalReturns.length
                )
                const candidateSharpe = sdRet === 0 ? 0 : (meanRet / sdRet) * Math.sqrt(252)

                if (candidateSharpe > bestSharpe) {
                  bestSharpe = candidateSharpe
                  bestConfig = { rsiPeriod, bbPeriod, bbStdDev }
                }
              } catch {
                // skip invalid param combos
              }
            }
          }
        }
      }

      // Update signal agents with optimized params
      const signalAgents = await this.db.tradingAgent.findMany({
        where: { type: 'SIGNAL' },
      })
      for (const sa of signalAgents) {
        const oldConfig = sa.config as Record<string, unknown>
        const updatedConfig = { ...oldConfig, ...bestConfig, lastOptimizedAt: new Date().toISOString() }
        await this.db.tradingAgent.update({
          where: { id: sa.id },
          data: { config: updatedConfig },
        })
      }

      // Save backtest record
      const signalAgent = signalAgents[0]
      if (signalAgent) {
        await this.db.backtest.create({
          data: {
            agentId: signalAgent.id,
            strategy: 'optimized',
            config: bestConfig,
            startDate: thirtyDaysAgo,
            endDate: new Date(),
            totalReturn: avgReturn * recentTrades.length,
            maxDrawdown,
            sharpeRatio: bestSharpe,
            winRate,
            totalTrades: recentTrades.length,
            results: {
              pnls,
              winRate,
              avgReturn,
              bestConfig,
              optimizedSharpe: bestSharpe,
            },
          },
        })
      }

      await this.db.tradingAgent.update({
        where: { id: agent.id },
        data: { status: 'IDLE', lastRunAt: new Date(), lastError: null },
      })
    } catch (e) {
      await this.db.tradingAgent.update({
        where: { id: agent.id },
        data: {
          status: 'ERROR',
          lastError: e instanceof Error ? e.message : String(e),
          errorCount: { increment: 1 },
        },
      })
    }
  }

  // ─── Self Test Agent ──────────────────────────────────────────────────────

  async runSelfTestAgent(): Promise<void> {
    const agent = await this.db.tradingAgent.findFirst({
      where: { type: 'SELF_TEST' },
    })
    if (!agent) return

    await this.db.tradingAgent.update({
      where: { id: agent.id },
      data: { status: 'RUNNING' },
    })

    const testResults: Record<string, { passed: boolean; message: string }> = {}

    // Test 1: Data freshness
    try {
      const latestCandle = await this.db.marketCandle.findFirst({
        where: { symbol: 'SPY' },
        orderBy: { timestamp: 'desc' },
      })
      const ageMs = latestCandle ? Date.now() - latestCandle.timestamp.getTime() : Infinity
      const ageMins = ageMs / 60000
      const passed = ageMins < 10
      testResults.dataFreshness = {
        passed,
        message: passed
          ? `Latest candle is ${ageMins.toFixed(1)} min old — OK`
          : `Latest candle is ${ageMins.toFixed(1)} min old — STALE`,
      }
    } catch (e) {
      testResults.dataFreshness = { passed: false, message: `Error: ${e instanceof Error ? e.message : String(e)}` }
    }

    // Test 2: Alpaca connectivity
    try {
      const account = await this.alpaca.getAccount()
      const equity = parseFloat(account.equity)
      testResults.alpacaConnectivity = {
        passed: equity > 0,
        message: `Account equity: $${equity.toFixed(2)}`,
      }
    } catch (e) {
      testResults.alpacaConnectivity = {
        passed: false,
        message: `Connection failed: ${e instanceof Error ? e.message : String(e)}`,
      }
    }

    // Test 3: Indicator sanity — RSI should always be in [0, 100]
    try {
      const testPrices = [100, 102, 101, 103, 102, 104, 103, 105, 104, 106, 105, 107, 106, 108, 107]
      const rsiVals = Indicators.rsi(testPrices, 14)
      const inBounds = rsiVals.every((v) => v >= 0 && v <= 100)
      testResults.indicatorSanity = {
        passed: inBounds,
        message: inBounds
          ? `RSI values in [0,100]: ${rsiVals.map((v) => v.toFixed(1)).join(', ')}`
          : 'RSI values out of bounds!',
      }
    } catch (e) {
      testResults.indicatorSanity = {
        passed: false,
        message: `Indicator error: ${e instanceof Error ? e.message : String(e)}`,
      }
    }

    // Test 4: Risk calculation sanity
    try {
      const { calculatePositionSize } = await import('@/lib/trading/risk')
      const qty = calculatePositionSize({
        equity: 100000,
        riskPerTrade: 0.02,
        entryPrice: 100,
        stopPrice: 98,
      })
      const expectedQty = Math.floor((100000 * 0.02) / (100 - 98)) // 1000
      const passed = qty === expectedQty
      testResults.riskCalc = {
        passed,
        message: `Position size: ${qty} (expected ${expectedQty})`,
      }
    } catch (e) {
      testResults.riskCalc = {
        passed: false,
        message: `Risk calc error: ${e instanceof Error ? e.message : String(e)}`,
      }
    }

    const allPassed = Object.values(testResults).every((r) => r.passed)
    const failedTests = Object.entries(testResults)
      .filter(([, r]) => !r.passed)
      .map(([name, r]) => `${name}: ${r.message}`)
      .join('; ')

    console.log('[SelfTest] Results:', testResults)

    await this.db.tradingAgent.update({
      where: { id: agent.id },
      data: {
        status: allPassed ? 'IDLE' : 'ERROR',
        lastRunAt: new Date(),
        lastError: allPassed ? null : failedTests,
        errorCount: allPassed ? 0 : { increment: 1 },
      },
    })
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect()
  }
}

// Singleton for use in cron/API routes (serverless friendly — creates fresh each call)
let _instance: AgentOrchestrator | null = null

export function getOrchestrator(): AgentOrchestrator {
  if (!_instance) {
    _instance = new AgentOrchestrator()
  }
  return _instance
}

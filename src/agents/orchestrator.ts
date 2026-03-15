/**
 * AgentOrchestrator — the central nervous system of the crypto trading system.
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
import { createExchangeClients, loadExchangesFromDb, type ExchangeClient } from '@/lib/trading/exchange'
import { generateAllSignals, type AgentConfig, type Candle } from '@/lib/trading/signals'
import {
  DEFAULT_MOMENTUM_CONFIG,
  DEFAULT_MEAN_REV_CONFIG,
  DEFAULT_BREAKOUT_CONFIG,
} from '@/lib/trading/signals'
import {
  detectCrossExchangeArbitrage,
  detectPairsArbitrage,
  DEFAULT_PAIRS,
  DEFAULT_CRYPTO_SYMBOLS,
} from '@/lib/trading/arbitrage'
import { syncAllOpenTrades, executeSignalForSymbol } from '@/lib/trading/executor'
import { DEFAULT_RISK_CONFIG } from '@/lib/trading/risk'
import { Indicators } from '@/lib/trading/indicators'
import {
  getCurrentSession,
  getAdjustedThreshold,
  getAdjustedArbSpread,
} from '@/lib/trading/sessions'
import { OpeningBoxAgent, DEFAULT_OB_SYMBOLS } from './opening-box-agent'
import { fetchKimchiPremium, kimchiSignalMultiplier, kimchiAgreesWithTrade } from '@/lib/trading/kimchi'
import { measureAllLatencies, arbLatencyCheck, type LatencyMap } from '@/lib/trading/latency'
import { decrypt, isEncrypted } from '@/lib/crypto'
import { createLogger } from '@/lib/logger'

const log = createLogger('orchestrator')

const DEFAULT_SYMBOLS = [
  'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT',
  'XRP/USDT', 'AVAX/USDT', 'LINK/USDT', 'MATIC/USDT',
]
const CANDLE_RETENTION = 200

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  return new PrismaClient({ adapter }) as unknown as PrismaClient
}

// ─────────────────────────────────────────────────────────────────────────────

export class AgentOrchestrator {
  private primary: ExchangeClient
  private exchanges: ExchangeClient[]
  private prisma: PrismaClient
  private isRunning: boolean = false
  private cycleCount: number = 0

  // Accessor that bypasses stale Prisma typings for newly-added models.
  private get db(): any {
    return this.prisma
  }

  constructor() {
    // Start with env-var exchanges only; DB exchanges are merged in initialize()
    this.prisma = createPrismaClient()
    const { primary, exchanges } = createExchangeClients()
    this.primary = primary
    this.exchanges = exchanges
  }

  // ─── Initialize: seed default agents ─────────────────────────────────────

  async initialize(): Promise<void> {
    // Merge DB-stored exchanges with env-var exchanges (DB wins on duplicate IDs)
    try {
      const dbRows = await this.db.tradingExchange.findMany({
        where: { isActive: true },
      })
      if (dbRows.length > 0) {
        const decryptedRows = dbRows.map((row: any) => ({
          ...row,
          apiKey: isEncrypted(row.apiKey) ? decrypt(row.apiKey) : row.apiKey,
          secretKey: isEncrypted(row.secretKey) ? decrypt(row.secretKey) : row.secretKey,
        }))
        const dbConfigs = loadExchangesFromDb(decryptedRows)
        const { primary, exchanges } = createExchangeClients(dbConfigs)
        this.primary = primary
        this.exchanges = exchanges
        log.info(`Loaded ${exchanges.length} exchange(s) from DB + env`)
      }
    } catch (err) {
      log.warn('Could not load exchanges from DB (table may not exist yet)', { error: String(err) })
    }

    const defaultAgents = [
      {
        name: 'Market Data Agent',
        type: 'MARKET_DATA' as const,
        symbols: DEFAULT_SYMBOLS,
        config: { timeframes: ['3m', '5m'] },
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
        symbols: DEFAULT_CRYPTO_SYMBOLS,
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

  // Session + Kimchi + Latency state — refreshed each cycle
  private latencyMap: LatencyMap | null = null
  private kimchiReading: Awaited<ReturnType<typeof fetchKimchiPremium>> = null
  private openingBoxAgent = new OpeningBoxAgent()

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

      const session = getCurrentSession()
      console.log(
        `[Orchestrator] Cycle #${this.cycleCount} | Session: ${session.label} ` +
        `| Threshold: ${session.signalThreshold} | ArbSpread: ${session.arbMinSpreadPct}%`
      )

      // 0a. Measure latency to all exchanges (every 5 cycles ≈ every 5 min)
      if (this.cycleCount % 5 === 1) {
        try {
          this.latencyMap = await this.runLatencyAgent()
        } catch (e) {
          errors.push(`Latency: ${e instanceof Error ? e.message : String(e)}`)
        }
      }

      // 0b. Fetch Kimchi premium (every cycle — lightweight public API)
      try {
        this.kimchiReading = await this.runKimchiAgent()
      } catch (e) {
        errors.push(`Kimchi: ${e instanceof Error ? e.message : String(e)}`)
      }

      // 1. Fetch market data
      try {
        await this.runMarketDataAgent()
      } catch (e) {
        errors.push(`MarketData: ${e instanceof Error ? e.message : String(e)}`)
      }

      // 1b. Opening Box strategy (one trade per day per symbol)
      try {
        await this.openingBoxAgent.run(this.primary, DEFAULT_OB_SYMBOLS, 'PAPER')
      } catch (e) {
        errors.push(`OpeningBox: ${e instanceof Error ? e.message : String(e)}`)
      }

      // 2. Generate signals
      try {
        await this.runSignalAgent()
      } catch (e) {
        errors.push(`Signal: ${e instanceof Error ? e.message : String(e)}`)
      }

      // 3. Detect arbitrage (session + latency aware)
      try {
        await this.runArbitrageAgent()
      } catch (e) {
        errors.push(`Arbitrage: ${e instanceof Error ? e.message : String(e)}`)
      }

      // 4. Execute signals (session + kimchi aware)
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

      // 7. Self-test every 15 cycles
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
            exitAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
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
    console.log(
      `[Orchestrator] Cycle #${this.cycleCount} completed in ${duration}ms. Errors: ${errors.length}`
    )
    return { errors, duration }
  }

  // ─── Latency Agent ────────────────────────────────────────────────────────

  async runLatencyAgent(): Promise<LatencyMap> {
    const map = await measureAllLatencies(this.exchanges)

    // Persist to DB
    for (const r of map.results) {
      try {
        await this.db.exchangeLatency.create({
          data: {
            exchangeId: r.exchangeId,
            latencyMs: r.latencyMs,
            tier: r.tier,
            success: r.success,
            error: r.error ?? null,
            measuredAt: r.measuredAt,
          },
        })
        // Update TradingExchange row if it exists in DB
        await this.db.tradingExchange.updateMany({
          where: { exchangeId: r.exchangeId },
          data: { lastLatencyMs: r.latencyMs, lastLatencyAt: r.measuredAt },
        })
      } catch { /* ignore — table may not exist yet */ }
    }

    const summary = map.results
      .map((r) => `${r.exchangeId}:${r.latencyMs}ms(${r.tier})`)
      .join(' | ')
    console.log(`[Latency] ${summary} | ArbReady: ${map.arbReady}`)

    return map
  }

  // ─── Kimchi Agent ─────────────────────────────────────────────────────────

  async runKimchiAgent(): Promise<Awaited<ReturnType<typeof fetchKimchiPremium>>> {
    const reading = await fetchKimchiPremium(this.primary)
    if (!reading) return null

    try {
      await this.db.kimchiPremium.create({
        data: {
          premiumPct: reading.premiumPct,
          btcKrw: reading.btcKrw,
          btcUsdt: reading.btcUsdt,
          krwPerUsdt: reading.krwPerUsdt,
          signal: reading.signal,
          label: reading.label,
        },
      })
    } catch { /* ignore */ }

    console.log(`[Kimchi] ${reading.label}`)
    return reading
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

    try {
      for (const timeframe of ['3m', '5m'] as const) {
        try {
          for (const symbol of DEFAULT_SYMBOLS) {
            try {
              const bars = await this.primary.getBars(symbol, timeframe, CANDLE_RETENTION)

              for (const bar of bars) {
                await this.db.marketCandle.upsert({
                  where: {
                    symbol_timeframe_timestamp: {
                      symbol,
                      timeframe,
                      timestamp: bar.timestamp,
                    },
                  },
                  update: {
                    open: bar.open,
                    high: bar.high,
                    low: bar.low,
                    close: bar.close,
                    volume: bar.volume,
                    vwap: null,
                  },
                  create: {
                    symbol,
                    timeframe,
                    timestamp: bar.timestamp,
                    open: bar.open,
                    high: bar.high,
                    low: bar.low,
                    close: bar.close,
                    volume: bar.volume,
                    vwap: null,
                  },
                })
              }

              // Prune old candles
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
            } catch (e) {
              errors.push(`${symbol}/${timeframe}: ${e instanceof Error ? e.message : String(e)}`)
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
          lastError: errors.length > 0 ? errors.slice(0, 3).join('; ') : null,
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
          for (const timeframe of ['3m', '5m']) {
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
      const config = agent.config as { pairs?: [string, string][]; zScoreThreshold?: number }
      let opportunities: Awaited<ReturnType<typeof detectCrossExchangeArbitrage>>

      // Session-adjusted minimum spread
      const sessionArbSpread = getAdjustedArbSpread(config.zScoreThreshold ? 0.3 : 0.3)

      if (this.exchanges.length >= 2) {
        // Real cross-exchange arbitrage when multiple exchanges are configured
        const rawOpps = await detectCrossExchangeArbitrage(
          this.exchanges,
          DEFAULT_CRYPTO_SYMBOLS,
          sessionArbSpread
        )

        // Filter by latency safety if we have a latency map
        opportunities = this.latencyMap
          ? rawOpps.filter((opp) => {
              const check = arbLatencyCheck(
                opp.buyExchange,
                opp.sellExchange,
                sessionArbSpread,
                this.latencyMap!
              )
              if (!check.proceed) {
                console.log(`[Arb] Skipped ${opp.symbols.join('↔')} — ${check.reason}`)
              } else {
                // Require spread to exceed latency-adjusted threshold
                if (opp.spreadPct < check.requiredSpreadPct) {
                  console.log(`[Arb] Spread ${opp.spreadPct.toFixed(2)}% < required ${check.requiredSpreadPct.toFixed(2)}% after latency penalty`)
                  return false
                }
              }
              return check.proceed
            })
          : rawOpps
      } else {
        // Fall back to statistical pairs arbitrage on a single exchange
        const allSymbols = Array.from(new Set((config.pairs ?? DEFAULT_PAIRS).flat()))

        const prices: Record<string, number> = {}
        const tickersMap = await this.primary.getTickers(allSymbols)
        for (const [sym, q] of tickersMap.entries()) {
          prices[sym] = q.last || (q.bid + q.ask) / 2
        }

        const candlesMap: Record<string, import('@/lib/trading/exchange').Bar[]> = {}
        for (const symbol of allSymbols) {
          try {
            const bars = await this.primary.getBars(symbol, '5m', 50)
            candlesMap[symbol] = bars
          } catch {
            candlesMap[symbol] = []
          }
        }

        opportunities = await detectPairsArbitrage(
          prices,
          candlesMap,
          config.pairs ?? DEFAULT_PAIRS,
          config.zScoreThreshold ?? 2.0
        )
      }

      for (const opp of opportunities) {
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
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
              buyExchange: opp.buyExchange,
              sellExchange: opp.sellExchange,
              buyPrice: opp.buyPrice,
              sellPrice: opp.sellPrice,
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
      const baseThreshold = config.signalStrengthThreshold ?? 0.6
      // Session-aware: blend base config with session recommendation
      const threshold = getAdjustedThreshold(baseThreshold)
      const session = getCurrentSession()
      console.log(
        `[Execution] Session: ${session.label} | threshold: ${threshold.toFixed(2)} | ` +
        `kimchi: ${this.kimchiReading?.signal ?? 'N/A'} | sizing: ${session.sizingMultiplier}x`
      )

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

      // Get current account balance
      const balance = await this.primary.getBalance()
      const equity = balance.totalUsdt

      const openTrades = await this.db.agentTrade.findMany({
        where: { status: 'OPEN', mode: agent.mode },
      })

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
        // Kimchi filter: skip trades that contradict strong Kimchi signal
        if (this.kimchiReading && !kimchiAgreesWithTrade(this.kimchiReading, signal.direction as 'BUY' | 'SELL')) {
          console.log(`[Execution] Kimchi veto: skipping ${signal.direction} on ${signal.symbol} (${this.kimchiReading.signal})`)
          await this.db.tradingSignal.update({ where: { id: signal.id }, data: { actedOn: true } })
          continue
        }

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

        // Session sizing: scale equity contribution by session multiplier
        const sessionMultiplier = getCurrentSession().sizingMultiplier
        // Kimchi multiplier: boosts/reduces position size based on premium signal
        const kimchiMult = kimchiSignalMultiplier(this.kimchiReading)
        const adjustedEquity = equity * sessionMultiplier * kimchiMult

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
          equity: adjustedEquity,
          openPositions: openTrades.length,
          dayPnl,
          candles,
          timeframe: signal.timeframe,
          exchange: this.primary,
          prisma: this.prisma,
          mode: agent.mode as 'PAPER' | 'LIVE',
        })

        if (result.success) {
          newTradesCount++
        }

        await this.db.tradingSignal.update({
          where: { id: signal.id },
          data: { actedOn: true },
        })
      }

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
    await syncAllOpenTrades({ exchange: this.primary, prisma: this.prisma })

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
    const balance = await this.primary.getBalance()
    const equity = balance.totalUsdt
    const freeUsdt = balance.freeUsdt
    const openPositions = balance.positions.length

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
        cash: freeUsdt,
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

      let peak = 0
      let maxDrawdown = 0
      let cumulative = 0
      for (const pnl of [...pnls].reverse()) {
        cumulative += pnl
        if (cumulative > peak) peak = cumulative
        const dd = peak === 0 ? 0 : (peak - cumulative) / peak
        if (dd > maxDrawdown) maxDrawdown = dd
      }

      const config = agent.config as {
        rsiPeriods?: number[]
        bbPeriods?: number[]
        bbStdDevs?: number[]
      }

      const rsiPeriods = config.rsiPeriods ?? [9, 11, 14, 21]
      const bbPeriods = config.bbPeriods ?? [15, 20, 25]
      const bbStdDevs = config.bbStdDevs ?? [1.5, 2.0, 2.5]

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      // Use BTC/USDT as the proxy asset for optimization (instead of SPY)
      const btcCandles = await this.db.marketCandle.findMany({
        where: {
          symbol: 'BTC/USDT',
          timeframe: '5m',
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

      if (btcCandles.length > 50) {
        const closes = btcCandles.map((c) => c.close)

        for (const rsiPeriod of rsiPeriods) {
          for (const bbPeriod of bbPeriods) {
            for (const bbStdDev of bbStdDevs) {
              try {
                const rsiVals = Indicators.rsi(closes, rsiPeriod)
                const { upper, lower } = Indicators.bollingerBands(closes, bbPeriod, bbStdDev)

                if (rsiVals.length < 5 || upper.length < 5) continue

                const signalReturns: number[] = []
                const minLen = Math.min(rsiVals.length, upper.length)
                for (let i = 1; i < minLen; i++) {
                  const rsi = rsiVals[rsiVals.length - minLen + i]
                  const u = upper[upper.length - minLen + i]
                  const l = lower[lower.length - minLen + i]
                  const price = closes[closes.length - minLen + i]
                  const prevPrice = closes[closes.length - minLen + i - 1]
                  const ret = prevPrice === 0 ? 0 : (price - prevPrice) / prevPrice

                  if (rsi < 30 && price < l) signalReturns.push(ret)
                  if (rsi > 70 && price > u) signalReturns.push(-ret)
                }

                if (signalReturns.length < 5) continue
                const meanRet = signalReturns.reduce((a, b) => a + b, 0) / signalReturns.length
                const sdRet = Math.sqrt(
                  signalReturns.reduce((a, b) => a + Math.pow(b - meanRet, 2), 0) /
                    signalReturns.length
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

      const signalAgents = await this.db.tradingAgent.findMany({
        where: { type: 'SIGNAL' },
      })
      for (const sa of signalAgents) {
        const oldConfig = sa.config as Record<string, unknown>
        const updatedConfig = {
          ...oldConfig,
          ...bestConfig,
          lastOptimizedAt: new Date().toISOString(),
        }
        await this.db.tradingAgent.update({
          where: { id: sa.id },
          data: { config: updatedConfig },
        })
      }

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

    // Test 1: Data freshness — check BTC/USDT candles
    try {
      const latestCandle = await this.db.marketCandle.findFirst({
        where: { symbol: 'BTC/USDT' },
        orderBy: { timestamp: 'desc' },
      })
      const ageMs = latestCandle ? Date.now() - latestCandle.timestamp.getTime() : Infinity
      const ageMins = ageMs / 60000
      const passed = ageMins < 10
      testResults.dataFreshness = {
        passed,
        message: passed
          ? `Latest BTC/USDT candle is ${ageMins.toFixed(1)} min old — OK`
          : `Latest BTC/USDT candle is ${ageMins.toFixed(1)} min old — STALE`,
      }
    } catch (e) {
      testResults.dataFreshness = {
        passed: false,
        message: `Error: ${e instanceof Error ? e.message : String(e)}`,
      }
    }

    // Test 2: Exchange connectivity
    try {
      const balance = await this.primary.getBalance()
      testResults.exchangeConnectivity = {
        passed: balance.totalUsdt >= 0,
        message: `[${this.primary.id}] Balance: ${balance.totalUsdt.toFixed(2)} USDT`,
      }
    } catch (e) {
      testResults.exchangeConnectivity = {
        passed: false,
        message: `Connection failed: ${e instanceof Error ? e.message : String(e)}`,
      }
    }

    // Test 3: Indicator sanity — RSI should always be in [0, 100]
    try {
      const testPrices = [
        100, 102, 101, 103, 102, 104, 103, 105, 104, 106, 105, 107, 106, 108, 107,
      ]
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
      const expectedQty = Math.floor((100000 * 0.02) / (100 - 98))
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

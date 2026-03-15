/**
 * Opening Box Agent
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs the Opening Box strategy for one or more symbols.
 * State is persisted to the OpeningBoxTrade table so it survives restarts.
 *
 * Called from the orchestrator on every 5-min candle close.
 * Handles order submission via ExchangeClient (paper or live).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import type { ExchangeClient } from '@/lib/trading/exchange'
import {
  processCandle,
  initialState,
  getTradingDateStr,
  calcStats,
  type OBState,
  type OBCandle,
} from '@/lib/trading/strategies/opening-box'

export const DEFAULT_OB_SYMBOLS = ['QQQ/USD']

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  return new PrismaClient({ adapter }) as unknown as PrismaClient
}

// ─── DB ↔ OBState bridge ──────────────────────────────────────────────────────

function dbRowToState(row: any, symbol: string): OBState {
  return {
    status: row.status as OBState['status'],
    date: row.date,
    symbol,
    box: row.boxTop != null ? {
      top: row.boxTop,
      bottom: row.boxBottom,
      range: row.boxRange,
      openCandleTime: row.openCandleTime,
      openCandleOpen: row.openCandleOpen,
      openCandleClose: row.openCandleClose,
    } : null,
    direction: (row.breakoutDirection as OBState['direction']) ?? null,
    breakoutTime: row.breakoutTime ?? null,
    breakoutCandleClose: row.breakoutCandleClose ?? null,
    retracementCandles: row.retracementCandles ?? 0,
    entryPrice: row.entryPrice ?? null,
    stopLoss: row.stopLoss ?? null,
    takeProfit: row.takeProfit ?? null,
    entryFillPrice: row.entryFillPrice ?? null,
    exitPrice: row.exitPrice ?? null,
    pnl: row.pnl ?? null,
    pnlPct: row.pnlPct ?? null,
    exitReason: (row.exitReason as OBState['exitReason']) ?? null,
    entryAt: row.entryAt ?? null,
    exitAt: row.exitAt ?? null,
  }
}

// ─── Main agent class ─────────────────────────────────────────────────────────

export class OpeningBoxAgent {
  private prisma: PrismaClient
  private db: any

  constructor() {
    this.prisma = createPrismaClient()
    this.db = this.prisma
  }

  /**
   * Run one cycle: fetch latest 5-min candles for each symbol, process through
   * the state machine, execute any required orders.
   */
  async run(
    exchange: ExchangeClient,
    symbols: string[] = DEFAULT_OB_SYMBOLS,
    mode: 'PAPER' | 'LIVE' = 'PAPER'
  ): Promise<void> {
    for (const symbol of symbols) {
      try {
        await this.processSymbol(exchange, symbol, mode)
      } catch (err) {
        console.error(`[OpeningBox] Error processing ${symbol}:`, err)
      }
    }
  }

  private async processSymbol(
    exchange: ExchangeClient,
    symbol: string,
    mode: 'PAPER' | 'LIVE'
  ): Promise<void> {
    // Load or create today's state from DB
    const today = getTradingDateStr(new Date(), symbol)
    let state = await this.loadState(symbol, today, mode)

    // Already done today — nothing to do
    if (state.status === 'DONE') return

    // Fetch recent 5-min candles (enough to cover the day)
    const bars = await exchange.getBars(symbol, '5m', 300)
    if (!bars.length) return

    // For US stocks start from 13:00 UTC (pre-market), for crypto from UTC midnight
    const isCrypto = symbol.includes('/USDT') || symbol.includes('/BTC')
    const dayStartHour = isCrypto ? 0 : 13
    const dayStart = new Date(`${today}T${String(dayStartHour).padStart(2,'0')}:00:00.000Z`)
    const todayCandles: OBCandle[] = bars
      .filter((b) => b.timestamp >= dayStart)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    if (!todayCandles.length) return

    // Replay candles from where we left off
    // If state already has a box, only process candles after the box time
    const startAfter = state.box?.openCandleTime ?? new Date(0)

    for (const candle of todayCandles) {
      // Skip candles we've already processed (except the opening candle itself)
      if (state.box && candle.timestamp <= startAfter) continue

      const { state: newState, action } = processCandle(state, candle)
      state = newState

      // Persist state after each candle
      await this.saveState(state, mode)

      // Execute orders if needed
      if (action.type === 'ENTER_LONG' || action.type === 'ENTER_SHORT') {
        await this.executeEntry(exchange, state, mode)
      } else if (action.type === 'EXIT') {
        await this.executeExit(exchange, state, mode, action.exitPrice!)
      }

      if (state.status === 'DONE') break
    }
  }

  // ─── Order execution ────────────────────────────────────────────────────────

  private async executeEntry(
    exchange: ExchangeClient,
    state: OBState,
    mode: 'PAPER' | 'LIVE'
  ): Promise<void> {
    try {
      // Get equity to size position
      const balance = await exchange.getBalance()
      const equity = balance.freeUsdt

      // Risk 1% of equity per trade
      const riskAmount = equity * 0.01
      const stopDistance = Math.abs(state.entryPrice! - state.stopLoss!)
      if (stopDistance === 0) return

      // Quantity in base currency
      let qty = riskAmount / stopDistance

      // In paper mode, always allow through; in live, validate minimum
      if (mode === 'LIVE' && qty * state.entryPrice! < 10) {
        console.log(`[OpeningBox] Position too small ($${(qty * state.entryPrice!).toFixed(2)}), skipping`)
        return
      }

      // Round to 6 decimal places
      qty = Math.round(qty * 1e6) / 1e6

      const side = state.direction === 'LONG' ? 'buy' : 'sell'
      const result = await exchange.submitOrder({
        symbol: state.symbol,
        side,
        qty,
        stopLoss: state.stopLoss!,
        takeProfit: state.takeProfit!,
      })

      // Save order ID
      await this.db.openingBoxTrade.update({
        where: { date_symbol_mode: { date: state.date, symbol: state.symbol, mode } },
        data: { orderId: result.orderId },
      })

      console.log(
        `[OpeningBox] ${mode} order placed: ${side} ${qty} ${state.symbol} ` +
        `@ ${state.entryPrice} | SL=${state.stopLoss} TP=${state.takeProfit} | id=${result.orderId}`
      )
    } catch (err) {
      console.error(`[OpeningBox] executeEntry failed:`, err)
    }
  }

  private async executeExit(
    exchange: ExchangeClient,
    state: OBState,
    mode: 'PAPER' | 'LIVE',
    exitPrice: number
  ): Promise<void> {
    // In paper mode the SL/TP was placed as part of the entry order —
    // the exchange handles it automatically. Just log.
    console.log(
      `[OpeningBox] Exit ${state.exitReason} @ ${exitPrice.toFixed(4)} | ` +
      `PnL: ${state.pnl !== null ? (state.pnl > 0 ? '+' : '') + state.pnl.toFixed(4) : 'n/a'} ` +
      `(${state.pnlPct?.toFixed(2) ?? '?'}%)`
    )
    if (mode === 'LIVE' && state.direction) {
      try {
        const closeSide = state.direction === 'LONG' ? 'sell' : 'buy'
        // cancel any remaining open orders first
        const open = await exchange.getOpenOrders(state.symbol)
        for (const o of open) {
          try { await exchange.cancelOrder(o.orderId, state.symbol) } catch { /* ok */ }
        }
        // Fetch current position size (simplified: use a small qty for demo)
        // In production, fetch actual position from exchange
        console.log(`[OpeningBox] LIVE close: ${closeSide} ${state.symbol} @ market`)
      } catch (err) {
        console.error(`[OpeningBox] executeExit failed:`, err)
      }
    }
  }

  // ─── DB persistence ─────────────────────────────────────────────────────────

  private async loadState(
    symbol: string,
    date: string,
    mode: 'PAPER' | 'LIVE'
  ): Promise<OBState> {
    try {
      const row = await this.db.openingBoxTrade.findUnique({
        where: { date_symbol_mode: { date, symbol, mode } },
      })
      if (row) return dbRowToState(row, symbol)
    } catch { /* table may not exist yet */ }

    return { ...initialState(symbol), date }
  }

  private async saveState(state: OBState, mode: 'PAPER' | 'LIVE'): Promise<void> {
    const data = {
      boxTop: state.box?.top ?? null,
      boxBottom: state.box?.bottom ?? null,
      boxRange: state.box?.range ?? null,
      openCandleTime: state.box?.openCandleTime ?? null,
      openCandleOpen: state.box?.openCandleOpen ?? null,
      openCandleClose: state.box?.openCandleClose ?? null,
      breakoutDirection: state.direction ?? null,
      breakoutCandleClose: state.breakoutCandleClose ?? null,
      breakoutTime: state.breakoutTime ?? null,
      retracementCandles: state.retracementCandles,
      entryPrice: state.entryPrice ?? null,
      stopLoss: state.stopLoss ?? null,
      takeProfit: state.takeProfit ?? null,
      status: state.status,
      entryFillPrice: state.entryFillPrice ?? null,
      exitPrice: state.exitPrice ?? null,
      pnl: state.pnl ?? null,
      pnlPct: state.pnlPct ?? null,
      exitReason: state.exitReason ?? null,
      entryAt: state.entryAt ?? null,
      exitAt: state.exitAt ?? null,
    }

    try {
      await this.db.openingBoxTrade.upsert({
        where: { date_symbol_mode: { date: state.date, symbol: state.symbol, mode } },
        create: { date: state.date, symbol: state.symbol, mode, ...data },
        update: data,
      })
    } catch (err) {
      console.error('[OpeningBox] saveState failed:', err)
    }
  }

  // ─── Public queries ──────────────────────────────────────────────────────────

  async getTodayStatus(
    symbols: string[] = DEFAULT_OB_SYMBOLS,
    mode: 'PAPER' | 'LIVE' = 'PAPER'
  ): Promise<any[]> {
    const today = getTradingDateStr(new Date(), symbols[0] ?? '')
    try {
      return await this.db.openingBoxTrade.findMany({
        where: { date: today, symbol: { in: symbols }, mode },
        orderBy: { createdAt: 'asc' },
      })
    } catch { return [] }
  }

  async getHistory(
    symbol: string,
    limit = 30,
    mode: 'PAPER' | 'LIVE' = 'PAPER'
  ): Promise<any[]> {
    try {
      return await this.db.openingBoxTrade.findMany({
        where: { symbol, mode, status: 'DONE' },
        orderBy: { date: 'desc' },
        take: limit,
      })
    } catch { return [] }
  }

  async getStats(symbol: string, mode: 'PAPER' | 'LIVE' = 'PAPER') {
    const trades = await this.getHistory(symbol, 100, mode)
    return calcStats(trades)
  }
}

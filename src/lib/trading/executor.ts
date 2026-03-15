/**
 * Order execution — bridges signal generation to CCXT exchange order submission,
 * and keeps DB trade records in sync with actual order state.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PrismaClient } from '@prisma/client'
import type { ExchangeClient } from './exchange'
import type { SignalResult, Candle } from './signals'
import { Indicators } from './indicators'
import {
  calculateStopAndTarget,
  checkRiskLimits,
  DEFAULT_RISK_CONFIG,
  type RiskConfig,
} from './risk'

export interface ExecutionResult {
  success: boolean
  orderId?: string
  error?: string
  filledPrice?: number
  filledQty?: number
}

export interface ExecuteSignalParams {
  signal: SignalResult
  agentId: string
  equity: number
  openPositions: number
  dayPnl: number
  candles: Candle[]
  timeframe: string
  exchange: ExchangeClient
  prisma: PrismaClient
  riskConfig?: RiskConfig
  mode: 'PAPER' | 'LIVE'
}

// ─── Position sizing for crypto ───────────────────────────────────────────────

/**
 * Calculate position size in base currency (BTC, ETH, etc.).
 * riskAmount = equity * riskPerTrade
 * qty = riskAmount / |entry - stopLoss|  (in quote currency, e.g. USDT)
 */
export function calculateCryptoPositionSize(params: {
  equity: number
  riskPerTrade: number
  entryPrice: number
  stopPrice: number
}): number {
  const { equity, riskPerTrade, entryPrice, stopPrice } = params
  const riskAmount = equity * riskPerTrade
  const priceDiff = Math.abs(entryPrice - stopPrice)
  if (priceDiff === 0 || entryPrice === 0) return 0
  // qty in base currency = riskAmount / priceDiff
  const qty = riskAmount / priceDiff
  // Round to reasonable precision (8 decimal places for crypto)
  return Math.max(0, parseFloat(qty.toFixed(8)))
}

// ─── Execute a single signal ──────────────────────────────────────────────────

export async function executeSignal(params: ExecuteSignalParams): Promise<ExecutionResult> {
  const {
    signal,
    agentId,
    equity,
    openPositions,
    dayPnl,
    candles,
    timeframe,
    exchange,
    prisma,
    mode,
  } = params
  const riskConfig = params.riskConfig ?? DEFAULT_RISK_CONFIG

  // Check risk limits
  const riskCheck = checkRiskLimits({ openPositions, dayPnl, equity, config: riskConfig })
  if (!riskCheck.allowed) {
    return { success: false, error: `Risk check failed: ${riskCheck.reason}` }
  }

  // Calculate ATR for stop/target
  if (candles.length < 15) {
    return { success: false, error: 'Insufficient candle data for ATR calculation' }
  }

  const atrValues = Indicators.atr(
    candles.map((c) => ({ high: c.high, low: c.low, close: c.close })),
    14
  )
  if (atrValues.length === 0) {
    return { success: false, error: 'ATR calculation failed' }
  }
  const currentAtr = atrValues[atrValues.length - 1]

  const { stopLoss, takeProfit } = calculateStopAndTarget({
    entry: signal.price,
    side: signal.direction,
    atr: currentAtr,
    config: riskConfig,
  })

  const qty = calculateCryptoPositionSize({
    equity,
    riskPerTrade: riskConfig.maxRiskPerTrade,
    entryPrice: signal.price,
    stopPrice: stopLoss,
  })

  if (qty <= 0) {
    return {
      success: false,
      error: 'Position size calculated as 0 — insufficient equity or risk budget',
    }
  }

  const symbol = (signal.indicators.symbol as unknown as string) ?? ''
  if (!symbol) {
    return { success: false, error: 'No symbol found on signal' }
  }

  try {
    const order = await exchange.submitOrder({
      symbol,
      side: signal.direction.toLowerCase() as 'buy' | 'sell',
      qty,
      stopLoss,
      takeProfit,
    })

    // Persist trade record
    await (prisma as any).agentTrade.create({
      data: {
        agentId,
        symbol: order.symbol,
        side: signal.direction as 'BUY' | 'SELL',
        qty,
        entryPrice: signal.price,
        stopLoss,
        takeProfit,
        status: 'OPEN',
        mode: mode as 'PAPER' | 'LIVE',
        alpacaOrderId: order.orderId, // field reused for exchange order id
        timeframe,
        strategy: signal.type,
        signalData: {
          strength: signal.strength,
          reason: signal.reason,
          indicators: signal.indicators,
          exchange: exchange.id,
        },
      },
    })

    return {
      success: true,
      orderId: order.orderId,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}

// ─── Execute signal with explicit symbol ─────────────────────────────────────

export async function executeSignalForSymbol(
  params: ExecuteSignalParams & { symbol: string }
): Promise<ExecutionResult> {
  const { signal, symbol } = params
  signal.indicators = { ...signal.indicators, symbol: symbol as unknown as number }
  return executeSignal(params)
}

// ─── Sync a single trade status ───────────────────────────────────────────────

export async function syncOrderStatus(params: {
  trade: {
    id: string
    alpacaOrderId: string | null  // stores exchange order id
    entryPrice: number
    qty: number
    side: string
    mode: string
    symbol: string
  }
  exchange: ExchangeClient
  prisma: PrismaClient
}): Promise<void> {
  const { trade, exchange, prisma } = params
  if (!trade.alpacaOrderId) return

  try {
    const order = await exchange.getOrder(trade.alpacaOrderId, trade.symbol)

    if (order.status === 'closed' || order.status === 'filled') {
      const filledPrice = order.avgPrice > 0 ? order.avgPrice : trade.entryPrice
      const filledQty = order.filled > 0 ? order.filled : trade.qty

      const direction = trade.side === 'BUY' ? 1 : -1
      const pnl = direction * (filledPrice - trade.entryPrice) * filledQty
      const pnlPct =
        trade.entryPrice === 0 ? 0 : (pnl / (trade.entryPrice * filledQty)) * 100

      await (prisma as any).agentTrade.update({
        where: { id: trade.id },
        data: {
          exitPrice: filledPrice,
          status: 'CLOSED',
          pnl,
          pnlPct,
          exitAt: new Date(),
        },
      })
    } else if (
      order.status === 'canceled' ||
      order.status === 'cancelled' ||
      order.status === 'expired' ||
      order.status === 'rejected'
    ) {
      await (prisma as any).agentTrade.update({
        where: { id: trade.id },
        data: { status: 'CANCELLED' },
      })
    }
  } catch {
    // Silent failure — will retry next cycle
  }
}

// ─── Sync all open trades ─────────────────────────────────────────────────────

export async function syncAllOpenTrades(params: {
  agentId?: string
  exchange: ExchangeClient
  prisma: PrismaClient
}): Promise<void> {
  const { agentId, exchange, prisma } = params

  const where = agentId
    ? { status: 'OPEN' as const, agentId, alpacaOrderId: { not: null as unknown as string } }
    : { status: 'OPEN' as const, alpacaOrderId: { not: null as unknown as string } }

  const openTrades = await (prisma as any).agentTrade.findMany({ where })

  await Promise.allSettled(
    openTrades.map((trade: any) =>
      syncOrderStatus({ trade: { ...trade, symbol: trade.symbol ?? '' }, exchange, prisma })
    )
  )
}

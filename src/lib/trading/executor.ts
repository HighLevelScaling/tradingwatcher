/**
 * Order execution — bridges signal generation to Alpaca order submission,
 * and keeps DB trade records in sync with actual order state.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PrismaClient } from '@prisma/client'
import type { AlpacaClient } from './alpaca'
import type { SignalResult, Candle } from './signals'
import { Indicators } from './indicators'
import {
  calculatePositionSize,
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
  alpaca: AlpacaClient
  prisma: PrismaClient
  riskConfig?: RiskConfig
  mode: 'PAPER' | 'LIVE'
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
    alpaca,
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

  const qty = calculatePositionSize({
    equity,
    riskPerTrade: riskConfig.maxRiskPerTrade,
    entryPrice: signal.price,
    stopPrice: stopLoss,
  })

  if (qty < 1) {
    return { success: false, error: 'Position size calculated as 0 — insufficient equity or risk budget' }
  }

  try {
    const order = await alpaca.submitOrder({
      symbol: (signal.indicators.symbol as unknown as string) ?? '',
      qty,
      side: signal.direction.toLowerCase() as 'buy' | 'sell',
      type: 'market',
      time_in_force: 'day',
      order_class: 'bracket',
      stop_loss: { stop_price: parseFloat(stopLoss.toFixed(2)) },
      take_profit: { limit_price: parseFloat(takeProfit.toFixed(2)) },
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
        alpacaOrderId: order.id,
        timeframe,
        strategy: signal.type,
        signalData: {
          strength: signal.strength,
          reason: signal.reason,
          indicators: signal.indicators,
        },
      },
    })

    return {
      success: true,
      orderId: order.id,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}

// ─── Execute a signal when symbol is carried on the signal object ─────────────

export async function executeSignalForSymbol(
  params: ExecuteSignalParams & { symbol: string }
): Promise<ExecutionResult> {
  const { signal, symbol } = params
  // Inject symbol into indicators so executeSignal can read it
  signal.indicators = { ...signal.indicators, symbol: symbol as unknown as number }
  return executeSignal(params)
}

// ─── Sync a single trade status ───────────────────────────────────────────────

export async function syncOrderStatus(params: {
  trade: {
    id: string
    alpacaOrderId: string | null
    entryPrice: number
    qty: number
    side: string
    mode: string
  }
  alpaca: AlpacaClient
  prisma: PrismaClient
}): Promise<void> {
  const { trade, alpaca, prisma } = params
  if (!trade.alpacaOrderId) return

  try {
    const order = await alpaca.getOrder(trade.alpacaOrderId)

    if (order.status === 'filled' || order.status === 'partially_filled') {
      const filledPrice = order.filled_avg_price ? parseFloat(order.filled_avg_price) : trade.entryPrice
      const filledQty = order.filled_qty ? parseFloat(order.filled_qty) : trade.qty

      // Determine P&L if this is a closing fill
      // For bracket orders, Alpaca handles the legs; treat as closed when parent is filled
      let pnl: number | null = null
      let pnlPct: number | null = null
      let status: 'OPEN' | 'CLOSED' | 'CANCELLED' = 'OPEN'

      if (order.status === 'filled') {
        // Calculate based on entry vs fill price
        const direction = trade.side === 'BUY' ? 1 : -1
        pnl = direction * (filledPrice - trade.entryPrice) * filledQty
        pnlPct = trade.entryPrice === 0 ? 0 : (pnl / (trade.entryPrice * filledQty)) * 100
        status = 'CLOSED'
      }

      await (prisma as any).agentTrade.update({
        where: { id: trade.id },
        data: {
          exitPrice: filledPrice,
          status,
          pnl,
          pnlPct,
          exitAt: status === 'CLOSED' ? new Date() : undefined,
        },
      })
    } else if (
      order.status === 'canceled' ||
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

// ─── Sync all open trades for an agent ───────────────────────────────────────

export async function syncAllOpenTrades(params: {
  agentId?: string
  alpaca: AlpacaClient
  prisma: PrismaClient
}): Promise<void> {
  const { agentId, alpaca, prisma } = params

  const where = agentId
    ? { status: 'OPEN' as const, agentId, alpacaOrderId: { not: null as unknown as string } }
    : { status: 'OPEN' as const, alpacaOrderId: { not: null as unknown as string } }

  const openTrades = await (prisma as any).agentTrade.findMany({ where })

  await Promise.allSettled(
    openTrades.map((trade: any) =>
      syncOrderStatus({ trade, alpaca, prisma })
    )
  )
}

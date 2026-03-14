/**
 * Risk management calculations for the autonomous trading system.
 */

export interface RiskConfig {
  maxRiskPerTrade: number      // 0.02 = 2%
  maxPositions: number         // 5
  dailyLossLimit: number       // -0.03 = -3%
  atrMultiplierStop: number    // 1.5
  atrMultiplierTarget: number  // 3.0
}

export const DEFAULT_RISK_CONFIG: RiskConfig = {
  maxRiskPerTrade: 0.02,
  maxPositions: 5,
  dailyLossLimit: -0.03,
  atrMultiplierStop: 1.5,
  atrMultiplierTarget: 3.0,
}

// ─── Position Sizing ──────────────────────────────────────────────────────────

export interface PositionSizeParams {
  equity: number
  riskPerTrade: number   // fraction, e.g. 0.02
  entryPrice: number
  stopPrice: number
}

/**
 * Returns the number of shares to buy/sell.
 * quantity = (equity * riskPerTrade) / |entry - stop|
 */
export function calculatePositionSize(params: PositionSizeParams): number {
  const { equity, riskPerTrade, entryPrice, stopPrice } = params
  const riskAmount = equity * riskPerTrade
  const priceRisk = Math.abs(entryPrice - stopPrice)
  if (priceRisk === 0) return 0
  const qty = riskAmount / priceRisk
  return Math.max(1, Math.floor(qty))
}

// ─── Stop & Target Calculation ────────────────────────────────────────────────

export interface StopTargetParams {
  entry: number
  side: 'BUY' | 'SELL'
  atr: number
  config: RiskConfig
}

export interface StopTarget {
  stopLoss: number
  takeProfit: number
}

/**
 * Stop loss at 1.5x ATR from entry.
 * Take profit at 3x ATR from entry (1:2 R:R).
 */
export function calculateStopAndTarget(params: StopTargetParams): StopTarget {
  const { entry, side, atr, config } = params
  const stopDistance = atr * config.atrMultiplierStop
  const targetDistance = atr * config.atrMultiplierTarget

  if (side === 'BUY') {
    return {
      stopLoss: entry - stopDistance,
      takeProfit: entry + targetDistance,
    }
  } else {
    return {
      stopLoss: entry + stopDistance,
      takeProfit: entry - targetDistance,
    }
  }
}

// ─── Risk Limit Checks ────────────────────────────────────────────────────────

export interface RiskCheckParams {
  openPositions: number
  dayPnl: number     // dollar amount
  equity: number
  config: RiskConfig
}

export interface RiskCheckResult {
  allowed: boolean
  reason?: string
}

export function checkRiskLimits(params: RiskCheckParams): RiskCheckResult {
  const { openPositions, dayPnl, equity, config } = params

  if (openPositions >= config.maxPositions) {
    return {
      allowed: false,
      reason: `Max open positions reached (${openPositions}/${config.maxPositions})`,
    }
  }

  const dayPnlPct = equity === 0 ? 0 : dayPnl / equity
  if (dayPnlPct <= config.dailyLossLimit) {
    return {
      allowed: false,
      reason: `Daily loss limit reached (${(dayPnlPct * 100).toFixed(2)}% / limit ${(config.dailyLossLimit * 100).toFixed(2)}%)`,
    }
  }

  return { allowed: true }
}

/**
 * Signal generation from technical indicators.
 * Returns typed SignalResult objects that can be persisted and acted upon.
 */

import { Indicators } from './indicators'

export type SignalDirection = 'BUY' | 'SELL'

export type SignalType = 'MOMENTUM' | 'MEAN_REVERSION' | 'BREAKOUT' | 'ARBITRAGE'

export interface SignalResult {
  type: SignalType
  direction: SignalDirection
  strength: number    // 0 – 1
  price: number
  reason: string
  indicators: Record<string, number>
  timeframe?: string
}

export interface Candle {
  timestamp: Date
  open: number
  high: number
  low: number
  close: number
  volume: number
  vwap?: number
}

// ─── Config Types ─────────────────────────────────────────────────────────────

export interface MomentumConfig {
  rsiPeriod: number
  macdFast: number
  macdSlow: number
  macdSignal: number
  rsiOversold: number
  rsiOverbought: number
}

export interface MeanRevConfig {
  bbPeriod: number
  bbStdDev: number
  rsiPeriod: number
  rsiOversold: number
  rsiOverbought: number
}

export interface BreakoutConfig {
  volumeMultiplier: number    // e.g. 1.5
  vwapDeviationPct: number    // e.g. 0.001 (0.1%)
  volumeLookback: number      // bars to average volume over
}

export interface AgentConfig {
  momentum?: MomentumConfig
  meanReversion?: MeanRevConfig
  breakout?: BreakoutConfig
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_MOMENTUM_CONFIG: MomentumConfig = {
  rsiPeriod: 14,
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  rsiOversold: 30,
  rsiOverbought: 70,
}

export const DEFAULT_MEAN_REV_CONFIG: MeanRevConfig = {
  bbPeriod: 20,
  bbStdDev: 2.0,
  rsiPeriod: 14,
  rsiOversold: 35,
  rsiOverbought: 65,
}

export const DEFAULT_BREAKOUT_CONFIG: BreakoutConfig = {
  volumeMultiplier: 1.5,
  vwapDeviationPct: 0.001,
  volumeLookback: 20,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function last<T>(arr: T[]): T {
  return arr[arr.length - 1]
}

function secondLast<T>(arr: T[]): T {
  return arr[arr.length - 2]
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// ─── Momentum Signal ──────────────────────────────────────────────────────────

export function generateMomentumSignal(
  candles: Candle[],
  config: MomentumConfig = DEFAULT_MOMENTUM_CONFIG
): SignalResult | null {
  if (candles.length < config.macdSlow + config.macdSignal + 5) return null

  const closes = candles.map((c) => c.close)
  const rsiValues = Indicators.rsi(closes, config.rsiPeriod)
  const { histogram } = Indicators.macd(closes, config.macdFast, config.macdSlow, config.macdSignal)

  if (rsiValues.length < 2 || histogram.length < 2) return null

  const currentRsi = last(rsiValues)
  const prevRsi = secondLast(rsiValues)
  const currentHist = last(histogram)
  const prevHist = secondLast(histogram)

  const currentPrice = last(candles).close

  // BUY: RSI crosses above oversold AND histogram turns positive
  if (prevRsi <= config.rsiOversold && currentRsi > config.rsiOversold && prevHist <= 0 && currentHist > 0) {
    const strength = clamp(
      ((config.rsiOversold - Math.min(prevRsi, currentRsi)) / config.rsiOversold) * 0.5 +
        (currentHist / (Math.abs(currentHist) + 0.001)) * 0.5,
      0.4,
      1.0
    )
    return {
      type: 'MOMENTUM',
      direction: 'BUY',
      strength,
      price: currentPrice,
      reason: `RSI crossed above ${config.rsiOversold} (${currentRsi.toFixed(1)}) and MACD histogram turned positive (${currentHist.toFixed(4)})`,
      indicators: {
        rsi: currentRsi,
        macdHistogram: currentHist,
        macdHistogramPrev: prevHist,
      },
    }
  }

  // SELL: RSI crosses below overbought AND histogram turns negative
  if (prevRsi >= config.rsiOverbought && currentRsi < config.rsiOverbought && prevHist >= 0 && currentHist < 0) {
    const strength = clamp(
      ((Math.max(prevRsi, currentRsi) - config.rsiOverbought) / (100 - config.rsiOverbought)) * 0.5 +
        (Math.abs(currentHist) / (Math.abs(currentHist) + 0.001)) * 0.5,
      0.4,
      1.0
    )
    return {
      type: 'MOMENTUM',
      direction: 'SELL',
      strength,
      price: currentPrice,
      reason: `RSI crossed below ${config.rsiOverbought} (${currentRsi.toFixed(1)}) and MACD histogram turned negative (${currentHist.toFixed(4)})`,
      indicators: {
        rsi: currentRsi,
        macdHistogram: currentHist,
        macdHistogramPrev: prevHist,
      },
    }
  }

  return null
}

// ─── Mean Reversion Signal ────────────────────────────────────────────────────

export function generateMeanReversionSignal(
  candles: Candle[],
  config: MeanRevConfig = DEFAULT_MEAN_REV_CONFIG
): SignalResult | null {
  if (candles.length < config.bbPeriod + 5) return null

  const closes = candles.map((c) => c.close)
  const { upper, lower, middle } = Indicators.bollingerBands(closes, config.bbPeriod, config.bbStdDev)
  const rsiValues = Indicators.rsi(closes, config.rsiPeriod)

  if (upper.length < 1 || rsiValues.length < 1) return null

  const currentPrice = last(candles).close
  const currentUpper = last(upper)
  const currentLower = last(lower)
  const currentMiddle = last(middle)
  const currentRsi = last(rsiValues)

  // BUY: price below lower band AND RSI oversold
  if (currentPrice < currentLower && currentRsi < config.rsiOversold) {
    const pricePull = (currentLower - currentPrice) / currentLower
    const strength = clamp(0.5 + pricePull * 10 + (config.rsiOversold - currentRsi) / config.rsiOversold * 0.3, 0.5, 1.0)
    return {
      type: 'MEAN_REVERSION',
      direction: 'BUY',
      strength,
      price: currentPrice,
      reason: `Price (${currentPrice.toFixed(2)}) below lower BB (${currentLower.toFixed(2)}) with RSI oversold (${currentRsi.toFixed(1)})`,
      indicators: {
        rsi: currentRsi,
        bbUpper: currentUpper,
        bbMiddle: currentMiddle,
        bbLower: currentLower,
        priceToBBPct: ((currentPrice - currentLower) / currentLower) * 100,
      },
    }
  }

  // SELL: price above upper band AND RSI overbought
  if (currentPrice > currentUpper && currentRsi > config.rsiOverbought) {
    const pricePull = (currentPrice - currentUpper) / currentUpper
    const strength = clamp(0.5 + pricePull * 10 + (currentRsi - config.rsiOverbought) / (100 - config.rsiOverbought) * 0.3, 0.5, 1.0)
    return {
      type: 'MEAN_REVERSION',
      direction: 'SELL',
      strength,
      price: currentPrice,
      reason: `Price (${currentPrice.toFixed(2)}) above upper BB (${currentUpper.toFixed(2)}) with RSI overbought (${currentRsi.toFixed(1)})`,
      indicators: {
        rsi: currentRsi,
        bbUpper: currentUpper,
        bbMiddle: currentMiddle,
        bbLower: currentLower,
        priceToBBPct: ((currentPrice - currentUpper) / currentUpper) * 100,
      },
    }
  }

  return null
}

// ─── Breakout Signal ──────────────────────────────────────────────────────────

export function generateBreakoutSignal(
  candles: Candle[],
  config: BreakoutConfig = DEFAULT_BREAKOUT_CONFIG
): SignalResult | null {
  if (candles.length < config.volumeLookback + 2) return null

  const vwapValues = Indicators.vwap(
    candles.map((c) => ({ high: c.high, low: c.low, close: c.close, volume: c.volume }))
  )

  const currentCandle = last(candles)
  const currentVwap = last(vwapValues)
  const currentPrice = currentCandle.close

  // Average volume over lookback period
  const recentVolumes = candles
    .slice(candles.length - config.volumeLookback - 1, candles.length - 1)
    .map((c) => c.volume)
  const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length
  const currentVolume = currentCandle.volume

  const volumeRatio = avgVolume === 0 ? 0 : currentVolume / avgVolume
  const vwapBreakoutThreshold = currentVwap * config.vwapDeviationPct

  if (volumeRatio < config.volumeMultiplier) return null

  const strength = clamp(
    0.5 + (volumeRatio - config.volumeMultiplier) * 0.2 + Math.abs(currentPrice - currentVwap) / currentVwap * 5,
    0.5,
    1.0
  )

  // BUY: price breaks above VWAP + threshold with high volume
  if (currentPrice > currentVwap + vwapBreakoutThreshold) {
    return {
      type: 'BREAKOUT',
      direction: 'BUY',
      strength,
      price: currentPrice,
      reason: `Price (${currentPrice.toFixed(2)}) broke above VWAP (${currentVwap.toFixed(2)}) + ${(config.vwapDeviationPct * 100).toFixed(2)}% with ${volumeRatio.toFixed(1)}x avg volume`,
      indicators: {
        vwap: currentVwap,
        volumeRatio,
        currentVolume,
        avgVolume,
      },
    }
  }

  // SELL: price breaks below VWAP - threshold with high volume
  if (currentPrice < currentVwap - vwapBreakoutThreshold) {
    return {
      type: 'BREAKOUT',
      direction: 'SELL',
      strength,
      price: currentPrice,
      reason: `Price (${currentPrice.toFixed(2)}) broke below VWAP (${currentVwap.toFixed(2)}) - ${(config.vwapDeviationPct * 100).toFixed(2)}% with ${volumeRatio.toFixed(1)}x avg volume`,
      indicators: {
        vwap: currentVwap,
        volumeRatio,
        currentVolume,
        avgVolume,
      },
    }
  }

  return null
}

// ─── Aggregate All Signals ────────────────────────────────────────────────────

export function generateAllSignals(candles: Candle[], config: AgentConfig): SignalResult[] {
  const results: SignalResult[] = []

  const momentumCfg = config.momentum ?? DEFAULT_MOMENTUM_CONFIG
  const meanRevCfg = config.meanReversion ?? DEFAULT_MEAN_REV_CONFIG
  const breakoutCfg = config.breakout ?? DEFAULT_BREAKOUT_CONFIG

  const momentum = generateMomentumSignal(candles, momentumCfg)
  if (momentum) results.push(momentum)

  const meanRev = generateMeanReversionSignal(candles, meanRevCfg)
  if (meanRev) results.push(meanRev)

  const breakout = generateBreakoutSignal(candles, breakoutCfg)
  if (breakout) results.push(breakout)

  return results
}

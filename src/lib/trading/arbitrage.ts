/**
 * Arbitrage detection for pairs trading and statistical spread analysis.
 */

import { Indicators } from './indicators'
import type { Candle } from './signals'

export type ArbitrageDirection = Record<string, 'BUY' | 'SELL'>

export interface SpreadData {
  symbols: [string, string]
  spread: number
  spreadPct: number
  zScore: number
  priceA: number
  priceB: number
  ratio: number
}

export interface ArbitrageOpportunity {
  type: 'PAIRS' | 'ETF_SPREAD' | 'STATISTICAL'
  symbols: [string, string]
  spreadPct: number
  zScore: number
  estimatedPnl: number
  direction: ArbitrageDirection
  confidence: number
  metadata?: Record<string, unknown>
}

export const DEFAULT_PAIRS: [string, string][] = [
  ['SPY', 'QQQ'],
  ['AAPL', 'MSFT'],
  ['NVDA', 'AMD'],
]

const Z_SCORE_PERIOD = 30

// ─── Core Spread Calculation ──────────────────────────────────────────────────

export function calculateSpread(
  priceA: number,
  priceB: number,
  historicalRatios: number[]
): SpreadData {
  const ratio = priceB === 0 ? 0 : priceA / priceB
  const spread = priceA - priceB
  const spreadPct = priceB === 0 ? 0 : Math.abs(spread) / priceB

  let zScoreValue = 0
  if (historicalRatios.length >= Z_SCORE_PERIOD) {
    const zScores = Indicators.zScore(historicalRatios, Z_SCORE_PERIOD)
    zScoreValue = zScores.length > 0 ? zScores[zScores.length - 1] : 0
  } else if (historicalRatios.length > 2) {
    // Fallback with available data
    const mean = historicalRatios.reduce((a, b) => a + b, 0) / historicalRatios.length
    const variance =
      historicalRatios.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / historicalRatios.length
    const sd = Math.sqrt(variance)
    zScoreValue = sd === 0 ? 0 : (ratio - mean) / sd
  }

  return {
    symbols: ['A', 'B'] as [string, string], // Caller should override
    spread,
    spreadPct,
    zScore: zScoreValue,
    priceA,
    priceB,
    ratio,
  }
}

// ─── Pairs Arbitrage Detection ────────────────────────────────────────────────

export function detectPairsArbitrage(
  prices: Record<string, number>,
  candles: Record<string, Candle[]>,
  pairs: [string, string][] = DEFAULT_PAIRS,
  zScoreThreshold = 2.0
): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = []

  for (const [symbolA, symbolB] of pairs) {
    const priceA = prices[symbolA]
    const priceB = prices[symbolB]

    if (!priceA || !priceB) continue

    const candlesA = candles[symbolA] ?? []
    const candlesB = candles[symbolB] ?? []

    // Build historical ratio series from candles
    const minLen = Math.min(candlesA.length, candlesB.length)
    if (minLen < 5) continue

    const historicalRatios: number[] = []
    for (let i = 0; i < minLen; i++) {
      const ca = candlesA[candlesA.length - minLen + i]
      const cb = candlesB[candlesB.length - minLen + i]
      if (cb.close !== 0) {
        historicalRatios.push(ca.close / cb.close)
      }
    }

    if (historicalRatios.length < 5) continue

    // Add current ratio
    historicalRatios.push(priceA / priceB)

    const spreadData = calculateSpread(priceA, priceB, historicalRatios)
    spreadData.symbols = [symbolA, symbolB]

    if (Math.abs(spreadData.zScore) < zScoreThreshold) continue

    // Determine direction: long undervalued, short overvalued
    // If zScore > threshold: ratio is high → A is overvalued vs B → SELL A, BUY B
    // If zScore < -threshold: ratio is low → A is undervalued vs B → BUY A, SELL B
    const direction: ArbitrageDirection =
      spreadData.zScore > 0
        ? { [symbolA]: 'SELL', [symbolB]: 'BUY' }
        : { [symbolA]: 'BUY', [symbolB]: 'SELL' }

    // Estimate P&L: distance to revert to mean (1 share each)
    const zScores = Indicators.zScore(historicalRatios.slice(0, -1), Math.min(Z_SCORE_PERIOD, historicalRatios.length - 1))
    const meanRatio = zScores.length > 0
      ? historicalRatios.slice(0, -1).slice(-Z_SCORE_PERIOD).reduce((a, b) => a + b, 0) /
          Math.min(Z_SCORE_PERIOD, historicalRatios.length - 1)
      : historicalRatios.reduce((a, b) => a + b, 0) / historicalRatios.length

    const targetRatio = meanRatio
    const priceDiff = Math.abs(spreadData.ratio - targetRatio) * priceB
    const estimatedPnl = priceDiff * 0.5 // conservative: assume 50% mean reversion

    const confidence = Math.min(Math.abs(spreadData.zScore) / 4, 1.0)

    opportunities.push({
      type: 'PAIRS',
      symbols: [symbolA, symbolB],
      spreadPct: spreadData.spreadPct,
      zScore: spreadData.zScore,
      estimatedPnl,
      direction,
      confidence,
      metadata: {
        priceA,
        priceB,
        ratio: spreadData.ratio,
        meanRatio: targetRatio,
        historicalDataPoints: historicalRatios.length,
      },
    })
  }

  // Sort by absolute z-score descending
  return opportunities.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore))
}

/**
 * Cross-exchange and statistical arbitrage detection for crypto markets.
 */

import { Indicators } from './indicators'
import type { Bar } from './exchange'
import type { ExchangeClient } from './exchange'
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

export interface CrossExchangeOpportunity {
  type: 'PAIRS' | 'ETF_SPREAD' | 'STATISTICAL'
  symbols: string[]
  spreadPct: number
  zScore: number
  estimatedPnl: number
  buyExchange: string
  sellExchange: string
  buyPrice: number
  sellPrice: number
  confidence: number
  direction: ArbitrageDirection
  metadata?: Record<string, unknown>
}

// Keep backward compat alias
export type ArbitrageOpportunity = CrossExchangeOpportunity

export const DEFAULT_PAIRS: [string, string][] = [
  ['BTC/USDT', 'ETH/USDT'],
  ['SOL/USDT', 'AVAX/USDT'],
  ['BNB/USDT', 'ETH/USDT'],
]

export const DEFAULT_CRYPTO_SYMBOLS = [
  'BTC/USDT',
  'ETH/USDT',
  'SOL/USDT',
  'BNB/USDT',
  'XRP/USDT',
  'AVAX/USDT',
  'LINK/USDT',
  'MATIC/USDT',
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
    const mean = historicalRatios.reduce((a, b) => a + b, 0) / historicalRatios.length
    const variance =
      historicalRatios.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / historicalRatios.length
    const sd = Math.sqrt(variance)
    zScoreValue = sd === 0 ? 0 : (ratio - mean) / sd
  }

  return {
    symbols: ['A', 'B'] as [string, string],
    spread,
    spreadPct,
    zScore: zScoreValue,
    priceA,
    priceB,
    ratio,
  }
}

// ─── Cross-Exchange Arbitrage ─────────────────────────────────────────────────

/**
 * Detects real cross-exchange arbitrage by comparing the same symbol's price
 * across multiple exchanges. Finds pairs where ask on exchange A < bid on exchange B.
 *
 * Fee assumption: 0.1% taker fee per side = 0.2% round-trip.
 * Minimum spread of 0.3% is enforced to ensure profitability after fees.
 */
export async function detectCrossExchangeArbitrage(
  exchanges: ExchangeClient[],
  symbols: string[],
  minSpreadPct = 0.3
): Promise<CrossExchangeOpportunity[]> {
  if (exchanges.length < 2) return []

  const opportunities: CrossExchangeOpportunity[] = []
  const FEES_PCT = 0.2 // 0.1% each side

  // Fetch tickers from all exchanges in parallel
  const tickerResults = await Promise.allSettled(
    exchanges.map((ex) => ex.getTickers(symbols).then((map) => ({ exchange: ex.id, map })))
  )

  const exchangeQuotes: Array<{
    exchange: string
    quotes: Map<string, { bid: number; ask: number; last: number }>
  }> = []

  for (const result of tickerResults) {
    if (result.status === 'fulfilled') {
      const quotes = new Map<string, { bid: number; ask: number; last: number }>()
      for (const [sym, q] of result.value.map.entries()) {
        quotes.set(sym, { bid: q.bid, ask: q.ask, last: q.last })
      }
      exchangeQuotes.push({ exchange: result.value.exchange, quotes })
    }
  }

  if (exchangeQuotes.length < 2) return []

  for (const symbol of symbols) {
    // Collect all valid quotes for this symbol
    const symbolQuotes: Array<{
      exchange: string
      bid: number
      ask: number
    }> = []

    for (const { exchange, quotes } of exchangeQuotes) {
      const q = quotes.get(symbol)
      if (q && q.bid > 0 && q.ask > 0) {
        symbolQuotes.push({ exchange, bid: q.bid, ask: q.ask })
      }
    }

    if (symbolQuotes.length < 2) continue

    // Compare every pair of exchanges: buy on A (ask), sell on B (bid)
    for (let i = 0; i < symbolQuotes.length; i++) {
      for (let j = 0; j < symbolQuotes.length; j++) {
        if (i === j) continue

        const buyer = symbolQuotes[i]   // we buy at ask on this exchange
        const seller = symbolQuotes[j]  // we sell at bid on this exchange

        const buyPrice = buyer.ask
        const sellPrice = seller.bid

        if (buyPrice <= 0 || sellPrice <= 0) continue

        // Raw spread: (sell - buy) / buy * 100
        const rawSpreadPct = ((sellPrice - buyPrice) / buyPrice) * 100

        // Net spread after fees
        const netSpreadPct = rawSpreadPct - FEES_PCT

        if (netSpreadPct < minSpreadPct) continue

        // z-score: use spreadPct / 0.1 capped at 5 as a proxy for statistical significance
        const zScore = Math.min(netSpreadPct / 0.1, 5)

        // Estimated P&L per $1000 notional
        const estimatedPnl = (netSpreadPct / 100) * 1000

        const confidence = Math.min(netSpreadPct / (minSpreadPct * 3), 1.0)

        opportunities.push({
          type: 'STATISTICAL',
          symbols: [symbol, symbol],
          spreadPct: netSpreadPct,
          zScore,
          estimatedPnl,
          buyExchange: buyer.exchange,
          sellExchange: seller.exchange,
          buyPrice,
          sellPrice,
          confidence,
          direction: {
            [`${symbol}@${buyer.exchange}`]: 'BUY',
            [`${symbol}@${seller.exchange}`]: 'SELL',
          },
          metadata: {
            rawSpreadPct,
            feePct: FEES_PCT,
            symbol,
          },
        })
      }
    }
  }

  // Sort by net spread descending
  return opportunities.sort((a, b) => b.spreadPct - a.spreadPct)
}

// ─── Statistical Pairs Arbitrage ──────────────────────────────────────────────

/**
 * Statistical pairs arbitrage — same exchange, correlated crypto assets.
 * Used when only one exchange is configured.
 */
export async function detectPairsArbitrage(
  prices: Record<string, number>,
  candles: Record<string, Bar[] | Candle[]>,
  pairs: [string, string][] = DEFAULT_PAIRS,
  zScoreThreshold = 2.0
): Promise<CrossExchangeOpportunity[]> {
  const opportunities: CrossExchangeOpportunity[] = []

  for (const [symbolA, symbolB] of pairs) {
    const priceA = prices[symbolA]
    const priceB = prices[symbolB]

    if (!priceA || !priceB) continue

    const candlesA = candles[symbolA] ?? []
    const candlesB = candles[symbolB] ?? []

    const minLen = Math.min(candlesA.length, candlesB.length)
    if (minLen < 5) continue

    const historicalRatios: number[] = []
    for (let i = 0; i < minLen; i++) {
      const ca = candlesA[candlesA.length - minLen + i]
      const cb = candlesB[candlesB.length - minLen + i]
      if (ca.close !== 0 && cb.close !== 0) {
        historicalRatios.push(ca.close / cb.close)
      }
    }

    if (historicalRatios.length < 5) continue

    historicalRatios.push(priceA / priceB)

    const spreadData = calculateSpread(priceA, priceB, historicalRatios)
    spreadData.symbols = [symbolA, symbolB]

    if (Math.abs(spreadData.zScore) < zScoreThreshold) continue

    // Long undervalued, short overvalued
    // zScore > 0: A overvalued vs B → SELL A, BUY B
    // zScore < 0: A undervalued vs B → BUY A, SELL B
    const direction: ArbitrageDirection =
      spreadData.zScore > 0
        ? { [symbolA]: 'SELL', [symbolB]: 'BUY' }
        : { [symbolA]: 'BUY', [symbolB]: 'SELL' }

    // Estimate mean ratio
    const zScores = Indicators.zScore(
      historicalRatios.slice(0, -1),
      Math.min(Z_SCORE_PERIOD, historicalRatios.length - 1)
    )
    const meanRatio =
      zScores.length > 0
        ? historicalRatios.slice(0, -1).slice(-Z_SCORE_PERIOD).reduce((a, b) => a + b, 0) /
          Math.min(Z_SCORE_PERIOD, historicalRatios.length - 1)
        : historicalRatios.reduce((a, b) => a + b, 0) / historicalRatios.length

    const priceDiff = Math.abs(spreadData.ratio - meanRatio) * priceB
    const estimatedPnl = priceDiff * 0.5 // conservative: assume 50% mean reversion

    const confidence = Math.min(Math.abs(spreadData.zScore) / 4, 1.0)

    // Use a single placeholder exchange for pairs arb (same exchange on both sides)
    const buySymbol = spreadData.zScore > 0 ? symbolB : symbolA
    const sellSymbol = spreadData.zScore > 0 ? symbolA : symbolB

    opportunities.push({
      type: 'PAIRS',
      symbols: [symbolA, symbolB],
      spreadPct: spreadData.spreadPct,
      zScore: spreadData.zScore,
      estimatedPnl,
      buyExchange: 'primary',
      sellExchange: 'primary',
      buyPrice: prices[buySymbol] ?? priceA,
      sellPrice: prices[sellSymbol] ?? priceB,
      confidence,
      direction,
      metadata: {
        priceA,
        priceB,
        ratio: spreadData.ratio,
        meanRatio,
        historicalDataPoints: historicalRatios.length,
      },
    })
  }

  return opportunities.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore))
}

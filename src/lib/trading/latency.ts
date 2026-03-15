/**
 * Exchange latency measurement and arbitrage weighting.
 *
 * Why latency matters for arbitrage:
 *  - Cross-exchange arb requires two simultaneous orders on two exchanges.
 *  - If leg A fills in 50ms but leg B takes 800ms, the price on leg B may have
 *    moved enough to eliminate (or reverse) the profit.
 *  - Rule of thumb: if |latencyA - latencyB| > 300ms, the arb is risky.
 *  - We measure RTT (round-trip time) to each exchange's REST endpoint as a
 *    proxy for execution latency, then weight or skip arb opportunities.
 *
 * Latency tiers:
 *  - EXCELLENT  < 100ms   — safe to arb
 *  - GOOD       100–250ms — arb OK, widen min spread by 0.05%
 *  - FAIR       250–500ms — arb caution, widen by 0.10%
 *  - POOR       > 500ms   — skip arb on this exchange leg
 */

import type { ExchangeClient } from './exchange'

export type LatencyTier = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'UNREACHABLE'

export interface LatencyResult {
  exchangeId: string
  label: string
  latencyMs: number
  tier: LatencyTier
  /** Additional spread % to require when using this exchange in an arb leg. */
  spreadPenalty: number
  measuredAt: Date
  success: boolean
  error?: string
}

export interface LatencyMap {
  results: LatencyResult[]
  /** Whether all exchanges are fast enough for live arb. */
  arbReady: boolean
  /** The slowest exchange in the set. */
  bottleneck: LatencyResult | null
  measuredAt: Date
}

function tier(ms: number): { tier: LatencyTier; penalty: number } {
  if (ms <  100) return { tier: 'EXCELLENT',   penalty: 0.00 }
  if (ms <  250) return { tier: 'GOOD',        penalty: 0.05 }
  if (ms <  500) return { tier: 'FAIR',        penalty: 0.10 }
  return              { tier: 'POOR',        penalty: 0.20 }
}

/**
 * Measures round-trip latency to a single exchange by timing a lightweight
 * public API call (fetchTicker on BTC/USDT).
 */
export async function measureLatency(client: ExchangeClient): Promise<LatencyResult> {
  const start = Date.now()
  try {
    await client.getTicker('BTC/USDT')
    const latencyMs = Date.now() - start
    const { tier: t, penalty } = tier(latencyMs)
    return {
      exchangeId: client.id,
      label: client.label,
      latencyMs,
      tier: t,
      spreadPenalty: penalty,
      measuredAt: new Date(),
      success: true,
    }
  } catch (err) {
    return {
      exchangeId: client.id,
      label: client.label,
      latencyMs: 9999,
      tier: 'UNREACHABLE',
      spreadPenalty: 1.0,
      measuredAt: new Date(),
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * Measures latency to all provided exchanges in parallel.
 */
export async function measureAllLatencies(
  exchanges: ExchangeClient[]
): Promise<LatencyMap> {
  const results = await Promise.all(exchanges.map(measureLatency))

  const reachable = results.filter((r) => r.success)
  const bottleneck = reachable.length > 0
    ? reachable.reduce((worst, r) => (r.latencyMs > worst.latencyMs ? r : worst))
    : null

  const arbReady = reachable.length >= 2 &&
    reachable.every((r) => r.tier !== 'POOR') &&
    (bottleneck ? bottleneck.latencyMs < 500 : false)

  return { results, arbReady, bottleneck, measuredAt: new Date() }
}

/**
 * Given a cross-exchange arb opportunity and a latency map, decide whether
 * to proceed and what minimum spread is required after latency penalties.
 */
export function arbLatencyCheck(
  buyExchangeId: string,
  sellExchangeId: string,
  baseMinSpreadPct: number,
  latencyMap: LatencyMap
): { proceed: boolean; requiredSpreadPct: number; reason: string } {
  const buyLeg = latencyMap.results.find((r) => r.exchangeId === buyExchangeId)
  const sellLeg = latencyMap.results.find((r) => r.exchangeId === sellExchangeId)

  if (!buyLeg || !sellLeg) {
    return { proceed: false, requiredSpreadPct: 999, reason: 'Exchange not in latency map' }
  }

  if (!buyLeg.success || !sellLeg.success) {
    return { proceed: false, requiredSpreadPct: 999, reason: `Unreachable: ${!buyLeg.success ? buyExchangeId : sellExchangeId}` }
  }

  if (buyLeg.tier === 'POOR' || sellLeg.tier === 'POOR') {
    return {
      proceed: false,
      requiredSpreadPct: 999,
      reason: `Latency too high: ${buyLeg.tier === 'POOR' ? buyExchangeId : sellExchangeId} (>${500}ms)`,
    }
  }

  const latencyDelta = Math.abs(buyLeg.latencyMs - sellLeg.latencyMs)
  if (latencyDelta > 300) {
    return {
      proceed: false,
      requiredSpreadPct: 999,
      reason: `Leg imbalance: ${latencyDelta}ms delta between ${buyExchangeId} and ${sellExchangeId}`,
    }
  }

  const requiredSpreadPct = baseMinSpreadPct + buyLeg.spreadPenalty + sellLeg.spreadPenalty
  return {
    proceed: true,
    requiredSpreadPct,
    reason: `OK — legs: ${buyLeg.latencyMs}ms / ${sellLeg.latencyMs}ms, required spread ${requiredSpreadPct.toFixed(2)}%`,
  }
}

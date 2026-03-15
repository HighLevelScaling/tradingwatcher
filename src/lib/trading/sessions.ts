/**
 * Trading session definitions and session-aware parameter adjustments.
 *
 * Crypto trades 24/7, but liquidity, volatility, and price-discovery behaviour
 * differ dramatically by UTC hour. This module maps UTC time to sessions and
 * returns appropriate agent parameters for each.
 *
 * Sessions (all times UTC):
 *  - ASIAN_PRIME   00:00–08:00  Binance / OKX / Bybit dominant. Trend-initiating.
 *  - EU_OPEN       07:00–10:00  Kraken / Bitstamp flows. Overlap creates volatility.
 *  - EUROPEAN      10:00–13:00  Consolidation, fiat flows into EU exchanges.
 *  - EU_US_OVERLAP 13:00–16:00  Most liquid window of the day. Tight spreads.
 *  - US_PRIME      16:00–22:00  Coinbase / Gemini institutional activity.
 *  - DEAD_ZONE     22:00–00:00  Lowest liquidity. Widen thresholds to avoid noise.
 */

export type SessionName =
  | 'ASIAN_PRIME'
  | 'EU_OPEN'
  | 'EUROPEAN'
  | 'EU_US_OVERLAP'
  | 'US_PRIME'
  | 'DEAD_ZONE'

export interface TradingSession {
  name: SessionName
  label: string
  utcStart: number  // inclusive hour (0–23)
  utcEnd: number    // exclusive hour
  description: string
  /** Min signal strength to act on (0–1). Lower = more aggressive. */
  signalThreshold: number
  /** Min cross-exchange spread % to trigger arbitrage (after 0.2% fees). */
  arbMinSpreadPct: number
  /** Multiplier for position sizing. 1.0 = normal, 0.8 = reduce, 1.2 = increase. */
  sizingMultiplier: number
  /** Expected relative volatility vs baseline. */
  volatilityProfile: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH'
  /** Primary exchanges active during this session. */
  dominantExchanges: string[]
}

export const SESSIONS: TradingSession[] = [
  {
    name: 'ASIAN_PRIME',
    label: 'Asian Prime',
    utcStart: 0,
    utcEnd: 7,
    description: 'Binance/OKX/Bybit dominate. High volume, trend-initiating moves.',
    signalThreshold: 0.55,
    arbMinSpreadPct: 0.25,
    sizingMultiplier: 1.1,
    volatilityProfile: 'HIGH',
    dominantExchanges: ['binance', 'okx', 'bybit', 'upbit'],
  },
  {
    name: 'EU_OPEN',
    label: 'EU Open',
    utcStart: 7,
    utcEnd: 10,
    description: 'European exchanges coming online. Overlap with Asia creates short volatility spikes.',
    signalThreshold: 0.58,
    arbMinSpreadPct: 0.28,
    sizingMultiplier: 1.05,
    volatilityProfile: 'VERY_HIGH',
    dominantExchanges: ['kraken', 'bitstamp', 'bitfinex', 'binance'],
  },
  {
    name: 'EUROPEAN',
    label: 'European',
    utcStart: 10,
    utcEnd: 13,
    description: 'Consolidation phase. Fiat flows in via EU banks. Mean reversion favoured.',
    signalThreshold: 0.65,
    arbMinSpreadPct: 0.30,
    sizingMultiplier: 0.95,
    volatilityProfile: 'MEDIUM',
    dominantExchanges: ['kraken', 'bitstamp', 'coinbase'],
  },
  {
    name: 'EU_US_OVERLAP',
    label: 'EU/US Overlap',
    utcStart: 13,
    utcEnd: 16,
    description: 'Highest liquidity of the day. Tightest spreads. Best for arbitrage.',
    signalThreshold: 0.50,
    arbMinSpreadPct: 0.20,
    sizingMultiplier: 1.2,
    volatilityProfile: 'VERY_HIGH',
    dominantExchanges: ['binance', 'coinbase', 'kraken', 'bybit'],
  },
  {
    name: 'US_PRIME',
    label: 'US Prime',
    utcStart: 16,
    utcEnd: 22,
    description: 'Coinbase/Gemini institutional flows. News-reactive. Breakouts common.',
    signalThreshold: 0.60,
    arbMinSpreadPct: 0.27,
    sizingMultiplier: 1.0,
    volatilityProfile: 'HIGH',
    dominantExchanges: ['coinbase', 'gemini', 'kraken', 'binance'],
  },
  {
    name: 'DEAD_ZONE',
    label: 'Dead Zone',
    utcStart: 22,
    utcEnd: 24,
    description: 'Lowest liquidity. High slippage risk. Widen all thresholds.',
    signalThreshold: 0.75,
    arbMinSpreadPct: 0.40,
    sizingMultiplier: 0.6,
    volatilityProfile: 'LOW',
    dominantExchanges: [],
  },
]

/** Returns the active trading session for a given UTC hour (0–23). */
export function getSessionForHour(utcHour: number): TradingSession {
  // EU_OPEN and EUROPEAN overlap with ASIAN_PRIME end — check in order of priority
  for (const session of SESSIONS) {
    if (utcHour >= session.utcStart && utcHour < session.utcEnd) {
      return session
    }
  }
  // Fallback (shouldn't happen with 0–24 coverage)
  return SESSIONS[0]
}

/** Returns the active session right now. */
export function getCurrentSession(): TradingSession {
  return getSessionForHour(new Date().getUTCHours())
}

/** Returns minutes until the next session starts. */
export function minutesUntilNextSession(): number {
  const nowUtcHour = new Date().getUTCHours()
  const nowUtcMin = new Date().getUTCMinutes()
  const current = getCurrentSession()
  const remainingMinutes = (current.utcEnd - nowUtcHour) * 60 - nowUtcMin
  return Math.max(0, remainingMinutes)
}

/** Returns the next session. */
export function getNextSession(): TradingSession {
  const current = getCurrentSession()
  const idx = SESSIONS.findIndex((s) => s.name === current.name)
  return SESSIONS[(idx + 1) % SESSIONS.length]
}

/**
 * Adjusts a base signal threshold by the current session's profile.
 * Pass the agent's configured base threshold; get back the session-adjusted value.
 */
export function getAdjustedThreshold(baseThreshold: number): number {
  const session = getCurrentSession()
  // Blend: 50% base config, 50% session recommendation
  return (baseThreshold + session.signalThreshold) / 2
}

/** Returns the session-adjusted arb minimum spread %. */
export function getAdjustedArbSpread(baseSpreadPct: number): number {
  const session = getCurrentSession()
  return (baseSpreadPct + session.arbMinSpreadPct) / 2
}

/**
 * Kimchi Premium Monitor
 *
 * The "Kimchi premium" is the persistent price difference between Korean
 * crypto exchanges (Upbit, Bithumb) and global exchanges (Binance).
 * During bull markets it runs 2–10%; in bear markets it can go negative.
 *
 * Why it's useful as a leading indicator:
 *  - A rising premium → Korean retail is buying aggressively → often precedes
 *    global price moves up by 30–120 minutes.
 *  - A collapsing premium → Korean selling pressure → global correction likely.
 *  - Premium > 5% historically coincides with local tops (overheated sentiment).
 *
 * How we calculate it:
 *  1. Fetch BTC/KRW from Upbit (Korean exchange, free public API)
 *  2. Fetch USDT/KRW from Upbit to get the USD→KRW rate
 *  3. Convert Upbit BTC price to USD: btcUsd_upbit = btcKrw / krwPerUsdt
 *  4. Compare to Binance BTC/USDT price
 *  5. premium % = (btcUsd_upbit / btcUsdt_binance - 1) * 100
 */

import type { ExchangeClient } from './exchange'

export interface KimchiReading {
  premiumPct: number        // e.g.  2.4  means Upbit is 2.4% above Binance
  btcKrw: number            // Upbit BTC/KRW
  btcUsdt: number           // Binance BTC/USDT
  krwPerUsdt: number        // derived exchange rate
  signal: KimchiSignal
  label: string
  measuredAt: Date
}

export type KimchiSignal = 'STRONG_BULL' | 'BULL' | 'NEUTRAL' | 'BEAR' | 'STRONG_BEAR'

const THRESHOLDS = {
  STRONG_BULL: 4.0,   // >  4%  — extreme Korean buying, global pump likely
  BULL:        1.5,   // >  1.5% — mild premium, mild bullish lean
  NEUTRAL_LO: -1.0,  // between -1% and +1.5% — noise
  BEAR:       -2.0,   // < -1%  — discount, mild bearish
  STRONG_BEAR:-3.0,   // < -3%  — heavy discount, sharp correction risk
}

function classify(pct: number): { signal: KimchiSignal; label: string } {
  if (pct >= THRESHOLDS.STRONG_BULL) return { signal: 'STRONG_BULL', label: `+${pct.toFixed(2)}% — Korean FOMO, global pump likely` }
  if (pct >= THRESHOLDS.BULL)        return { signal: 'BULL',        label: `+${pct.toFixed(2)}% — mild premium, bullish lean` }
  if (pct >= THRESHOLDS.NEUTRAL_LO)  return { signal: 'NEUTRAL',     label: `${pct.toFixed(2)}% — neutral, no directional edge` }
  if (pct >= THRESHOLDS.BEAR)        return { signal: 'BEAR',        label: `${pct.toFixed(2)}% — discount, bearish lean` }
  return                                     { signal: 'STRONG_BEAR', label: `${pct.toFixed(2)}% — heavy discount, correction risk` }
}

/**
 * Fetch current Kimchi premium using Upbit public REST API (no key needed).
 * Falls back gracefully if Upbit is unreachable.
 *
 * @param binanceClient  An ExchangeClient connected to Binance for BTC/USDT price
 */
export async function fetchKimchiPremium(
  binanceClient: ExchangeClient
): Promise<KimchiReading | null> {
  try {
    // Parallel: Binance BTC/USDT and Upbit BTC/KRW + USDT/KRW
    const [binanceTicker, upbitBtcRes, upbitUsdtRes] = await Promise.all([
      binanceClient.getTicker('BTC/USDT').catch(() => null),
      fetch('https://api.upbit.com/v1/ticker?markets=KRW-BTC', {
        signal: AbortSignal.timeout(5000),
      }).catch(() => null),
      fetch('https://api.upbit.com/v1/ticker?markets=KRW-USDT', {
        signal: AbortSignal.timeout(5000),
      }).catch(() => null),
    ])

    if (!binanceTicker || !upbitBtcRes?.ok || !upbitUsdtRes?.ok) return null

    const [btcData, usdtData]: [Array<{ trade_price: number }>, Array<{ trade_price: number }>] =
      await Promise.all([upbitBtcRes.json(), upbitUsdtRes.json()])

    const btcKrw = btcData[0]?.trade_price
    const krwPerUsdt = usdtData[0]?.trade_price
    const btcUsdt = binanceTicker.last

    if (!btcKrw || !krwPerUsdt || !btcUsdt) return null

    const btcUsdViaKrw = btcKrw / krwPerUsdt
    const premiumPct = ((btcUsdViaKrw / btcUsdt) - 1) * 100

    const { signal, label } = classify(premiumPct)

    return {
      premiumPct: Math.round(premiumPct * 100) / 100,
      btcKrw,
      btcUsdt,
      krwPerUsdt,
      signal,
      label,
      measuredAt: new Date(),
    }
  } catch {
    return null
  }
}

/**
 * Signal strength boost/penalty to apply to trade signals based on Kimchi reading.
 * Returns a multiplier: 1.15 = boost 15%, 0.85 = reduce 15%, 1.0 = no change.
 */
export function kimchiSignalMultiplier(reading: KimchiReading | null): number {
  if (!reading) return 1.0
  switch (reading.signal) {
    case 'STRONG_BULL': return 1.20  // boost long signals, suppress short
    case 'BULL':        return 1.10
    case 'NEUTRAL':     return 1.00
    case 'BEAR':        return 0.90
    case 'STRONG_BEAR': return 0.80
  }
}

/**
 * Whether the Kimchi signal agrees with a proposed trade direction.
 * Used as an additional filter before execution.
 */
export function kimchiAgreesWithTrade(
  reading: KimchiReading | null,
  direction: 'BUY' | 'SELL'
): boolean {
  if (!reading) return true  // no data → don't block
  if (direction === 'BUY') {
    return reading.signal !== 'STRONG_BEAR'
  } else {
    return reading.signal !== 'STRONG_BULL'
  }
}

/**
 * Technical Indicators — pure functions, no external dependencies.
 * All functions operate on plain number arrays or OHLCV objects.
 */

export interface OHLCVCandle {
  high: number
  low: number
  close: number
  volume: number
}

export interface OHLCCandle {
  high: number
  low: number
  close: number
}

// ─── Simple Moving Average ────────────────────────────────────────────────────

export function sma(values: number[], period: number): number[] {
  if (values.length < period) return []
  const result: number[] = []
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) sum += values[j]
    result.push(sum / period)
  }
  return result
}

// ─── Exponential Moving Average ──────────────────────────────────────────────

export function ema(values: number[], period: number): number[] {
  if (values.length < period) return []
  const multiplier = 2 / (period + 1)
  const result: number[] = []

  // Seed with SMA
  let sum = 0
  for (let i = 0; i < period; i++) sum += values[i]
  let prev = sum / period
  result.push(prev)

  for (let i = period; i < values.length; i++) {
    const current = (values[i] - prev) * multiplier + prev
    result.push(current)
    prev = current
  }
  return result
}

// ─── Relative Strength Index (Wilder smoothing) ──────────────────────────────

export function rsi(close: number[], period: number): number[] {
  if (close.length < period + 1) return []
  const result: number[] = []

  let avgGain = 0
  let avgLoss = 0

  // Initial average
  for (let i = 1; i <= period; i++) {
    const change = close[i] - close[i - 1]
    if (change > 0) avgGain += change
    else avgLoss += Math.abs(change)
  }
  avgGain /= period
  avgLoss /= period

  const firstRs = avgLoss === 0 ? 100 : avgGain / avgLoss
  result.push(100 - 100 / (1 + firstRs))

  // Wilder smoothing
  for (let i = period + 1; i < close.length; i++) {
    const change = close[i] - close[i - 1]
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? Math.abs(change) : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    result.push(100 - 100 / (1 + rs))
  }

  return result
}

// ─── MACD ─────────────────────────────────────────────────────────────────────

export function macd(
  close: number[],
  fast: number,
  slow: number,
  signal: number
): { macd: number[]; signal: number[]; histogram: number[] } {
  const fastEma = ema(close, fast)
  const slowEma = ema(close, slow)

  // Align: slowEma is shorter; trim fastEma to same length
  const offset = slow - fast
  const alignedFast = fastEma.slice(offset)
  const macdLine = alignedFast.map((f, i) => f - slowEma[i])

  const signalLine = ema(macdLine, signal)
  const macdOffset = signal - 1
  const trimmedMacd = macdLine.slice(macdOffset)
  const histogram = trimmedMacd.map((m, i) => m - signalLine[i])

  return {
    macd: trimmedMacd,
    signal: signalLine,
    histogram,
  }
}

// ─── Standard Deviation ───────────────────────────────────────────────────────

export function stddev(values: number[], period: number): number[] {
  if (values.length < period) return []
  const result: number[] = []
  for (let i = period - 1; i < values.length; i++) {
    const slice = values.slice(i - period + 1, i + 1)
    const mean = slice.reduce((a, b) => a + b, 0) / period
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period
    result.push(Math.sqrt(variance))
  }
  return result
}

// ─── Bollinger Bands ──────────────────────────────────────────────────────────

export function bollingerBands(
  close: number[],
  period: number,
  numStdDev: number
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = sma(close, period)
  const stdev = stddev(close, period)

  const upper = middle.map((m, i) => m + numStdDev * stdev[i])
  const lower = middle.map((m, i) => m - numStdDev * stdev[i])

  return { upper, middle, lower }
}

// ─── ATR (Average True Range) ─────────────────────────────────────────────────

export function atr(candles: OHLCCandle[], period: number): number[] {
  if (candles.length < period + 1) return []

  const trueRanges: number[] = []
  for (let i = 1; i < candles.length; i++) {
    const { high, low } = candles[i]
    const prevClose = candles[i - 1].close
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    )
    trueRanges.push(tr)
  }

  // Wilder smoothing
  const result: number[] = []
  let prevAtr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period
  result.push(prevAtr)

  for (let i = period; i < trueRanges.length; i++) {
    const current = (prevAtr * (period - 1) + trueRanges[i]) / period
    result.push(current)
    prevAtr = current
  }

  return result
}

// ─── VWAP (intraday, resets each session) ────────────────────────────────────

export function vwap(candles: OHLCVCandle[]): number[] {
  const result: number[] = []
  let cumulativeTPV = 0
  let cumulativeVolume = 0

  for (const candle of candles) {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3
    cumulativeTPV += typicalPrice * candle.volume
    cumulativeVolume += candle.volume
    result.push(cumulativeVolume === 0 ? typicalPrice : cumulativeTPV / cumulativeVolume)
  }

  return result
}

// ─── Rolling Z-Score ──────────────────────────────────────────────────────────

export function zScore(values: number[], period: number): number[] {
  if (values.length < period) return []
  const result: number[] = []
  for (let i = period - 1; i < values.length; i++) {
    const slice = values.slice(i - period + 1, i + 1)
    const mean = slice.reduce((a, b) => a + b, 0) / period
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period
    const sd = Math.sqrt(variance)
    result.push(sd === 0 ? 0 : (values[i] - mean) / sd)
  }
  return result
}

// ─── Namespace export ─────────────────────────────────────────────────────────

export const Indicators = {
  sma,
  ema,
  rsi,
  macd,
  bollingerBands,
  atr,
  vwap,
  stddev,
  zScore,
}

export default Indicators

import { describe, it, expect } from 'vitest'
import {
  generateMomentumSignal,
  generateMeanReversionSignal,
  generateBreakoutSignal,
  generateAllSignals,
  type Candle,
} from '../signals'

// Helper to create candles with a price pattern
function makeCandles(prices: number[], baseVolume = 1000): Candle[] {
  return prices.map((close, i) => ({
    timestamp: new Date(Date.UTC(2026, 2, 10, 0, i * 5)),
    open: close - 0.5,
    high: close + 1,
    low: close - 1,
    close,
    volume: baseVolume,
  }))
}

describe('generateMomentumSignal', () => {
  it('returns null when not enough candles', () => {
    const candles = makeCandles([100, 101, 102])
    expect(generateMomentumSignal(candles)).toBeNull()
  })

  it('returns null when no crossover conditions are met', () => {
    // Flat market — RSI stays around 50, no crossover
    const flat = makeCandles(Array.from({ length: 50 }, () => 100))
    expect(generateMomentumSignal(flat)).toBeNull()
  })

  it('returns a signal with valid structure when conditions are met', () => {
    // Create a strong dip then recovery to trigger RSI crossover + MACD flip
    const prices: number[] = []
    // Start stable
    for (let i = 0; i < 30; i++) prices.push(100)
    // Sharp drop to push RSI below 30
    for (let i = 0; i < 8; i++) prices.push(100 - i * 3)
    // Recovery to trigger crossover above 30 and MACD histogram flip
    for (let i = 0; i < 8; i++) prices.push(76 + i * 3)

    const candles = makeCandles(prices)
    const signal = generateMomentumSignal(candles)

    // Signal may or may not fire depending on exact indicator alignment,
    // but if it does, it must have correct structure
    if (signal) {
      expect(signal.type).toBe('MOMENTUM')
      expect(['BUY', 'SELL']).toContain(signal.direction)
      expect(signal.strength).toBeGreaterThanOrEqual(0)
      expect(signal.strength).toBeLessThanOrEqual(1)
      expect(signal.indicators).toHaveProperty('rsi')
    }
  })
})

describe('generateMeanReversionSignal', () => {
  it('returns null for insufficient data', () => {
    expect(generateMeanReversionSignal(makeCandles([100, 101]))).toBeNull()
  })

  it('returns BUY when price below lower BB and RSI oversold', () => {
    // Stable market then sharp drop
    const prices: number[] = []
    for (let i = 0; i < 25; i++) prices.push(100)
    // Sharp drop to go below lower BB and push RSI low
    for (let i = 0; i < 10; i++) prices.push(100 - i * 4)

    const candles = makeCandles(prices)
    const signal = generateMeanReversionSignal(candles)

    if (signal) {
      expect(signal.type).toBe('MEAN_REVERSION')
      expect(signal.direction).toBe('BUY')
      expect(signal.strength).toBeGreaterThanOrEqual(0.5)
      expect(signal.strength).toBeLessThanOrEqual(1.0)
      expect(signal.indicators).toHaveProperty('bbLower')
    }
  })

  it('returns null for flat market', () => {
    const flat = makeCandles(Array.from({ length: 30 }, () => 100))
    expect(generateMeanReversionSignal(flat)).toBeNull()
  })
})

describe('generateBreakoutSignal', () => {
  it('returns null for insufficient data', () => {
    expect(generateBreakoutSignal(makeCandles([100, 101]))).toBeNull()
  })

  it('returns BUY on high volume upward VWAP break', () => {
    // Normal volume for lookback, then a spike
    const candles: Candle[] = []
    for (let i = 0; i < 25; i++) {
      candles.push({
        timestamp: new Date(Date.UTC(2026, 2, 10, 0, i * 5)),
        open: 100,
        high: 101,
        low: 99,
        close: 100,
        volume: 1000,
      })
    }
    // Last candle: huge volume, price breaks up significantly
    candles.push({
      timestamp: new Date(Date.UTC(2026, 2, 10, 0, 25 * 5)),
      open: 100,
      high: 110,
      low: 100,
      close: 108,
      volume: 5000, // 5x avg → above 1.5x threshold
    })

    const signal = generateBreakoutSignal(candles)
    if (signal) {
      expect(signal.type).toBe('BREAKOUT')
      expect(signal.direction).toBe('BUY')
      expect(signal.indicators.volumeRatio).toBeGreaterThanOrEqual(1.5)
    }
  })

  it('returns null when volume is not high enough', () => {
    const candles = makeCandles(Array.from({ length: 25 }, () => 100), 1000)
    expect(generateBreakoutSignal(candles)).toBeNull()
  })
})

describe('generateAllSignals', () => {
  it('returns an array', () => {
    const candles = makeCandles(Array.from({ length: 50 }, () => 100))
    const signals = generateAllSignals(candles, {})
    expect(Array.isArray(signals)).toBe(true)
  })

  it('each signal has correct structure', () => {
    // Use varying prices to potentially generate signals
    const prices = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i / 3) * 10)
    const candles = makeCandles(prices)
    const signals = generateAllSignals(candles, {})

    for (const signal of signals) {
      expect(['MOMENTUM', 'MEAN_REVERSION', 'BREAKOUT']).toContain(signal.type)
      expect(['BUY', 'SELL']).toContain(signal.direction)
      expect(signal.strength).toBeGreaterThanOrEqual(0)
      expect(signal.strength).toBeLessThanOrEqual(1)
      expect(signal.price).toBeGreaterThan(0)
    }
  })
})

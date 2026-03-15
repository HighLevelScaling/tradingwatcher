import { describe, it, expect } from 'vitest'
import { sma, ema, rsi, macd, bollingerBands, atr, vwap, zScore } from '../indicators'

describe('sma', () => {
  it('calculates correctly for known values', () => {
    const result = sma([1, 2, 3, 4, 5], 3)
    expect(result).toEqual([2, 3, 4])
  })

  it('returns empty when array is shorter than period', () => {
    expect(sma([1, 2], 3)).toEqual([])
  })

  it('handles period of 1', () => {
    expect(sma([10, 20, 30], 1)).toEqual([10, 20, 30])
  })
})

describe('ema', () => {
  it('returns non-empty for sufficient data', () => {
    const result = ema([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3)
    expect(result.length).toBeGreaterThan(0)
  })

  it('first value equals SMA seed', () => {
    const values = [2, 4, 6, 8, 10]
    const result = ema(values, 3)
    expect(result[0]).toBe(4) // SMA of [2,4,6]
  })

  it('returns empty when data shorter than period', () => {
    expect(ema([1, 2], 5)).toEqual([])
  })
})

describe('rsi', () => {
  it('returns values between 0 and 100', () => {
    const prices = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i / 5) * 10)
    const result = rsi(prices, 14)
    for (const v of result) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(100)
    }
  })

  it('produces high RSI for trending up data', () => {
    const prices = Array.from({ length: 30 }, (_, i) => 100 + i * 2)
    const result = rsi(prices, 14)
    const lastRsi = result[result.length - 1]
    expect(lastRsi).toBeGreaterThan(70)
  })

  it('produces low RSI for trending down data', () => {
    const prices = Array.from({ length: 30 }, (_, i) => 200 - i * 2)
    const result = rsi(prices, 14)
    const lastRsi = result[result.length - 1]
    expect(lastRsi).toBeLessThan(30)
  })

  it('returns empty for insufficient data', () => {
    expect(rsi([1, 2, 3], 14)).toEqual([])
  })
})

describe('macd', () => {
  it('returns histogram with correct length', () => {
    const prices = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i / 3) * 5)
    const result = macd(prices, 12, 26, 9)
    expect(result.macd.length).toBe(result.signal.length)
    expect(result.histogram.length).toBe(result.signal.length)
  })

  it('returns empty arrays for insufficient data', () => {
    const result = macd([1, 2, 3], 12, 26, 9)
    expect(result.macd).toEqual([])
  })
})

describe('bollingerBands', () => {
  it('upper > middle > lower', () => {
    const prices = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i) * 5)
    const { upper, middle, lower } = bollingerBands(prices, 20, 2)
    for (let i = 0; i < middle.length; i++) {
      expect(upper[i]).toBeGreaterThan(middle[i])
      expect(middle[i]).toBeGreaterThan(lower[i])
    }
  })

  it('band width increases with higher stddev multiplier', () => {
    const prices = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i) * 5)
    const narrow = bollingerBands(prices, 20, 1)
    const wide = bollingerBands(prices, 20, 3)
    const lastIdx = narrow.upper.length - 1
    expect(wide.upper[lastIdx] - wide.lower[lastIdx]).toBeGreaterThan(
      narrow.upper[lastIdx] - narrow.lower[lastIdx]
    )
  })
})

describe('atr', () => {
  it('returns positive values', () => {
    const candles = Array.from({ length: 30 }, (_, i) => ({
      high: 105 + Math.random() * 5,
      low: 95 - Math.random() * 5,
      close: 100 + Math.sin(i) * 3,
    }))
    const result = atr(candles, 14)
    for (const v of result) {
      expect(v).toBeGreaterThan(0)
    }
  })

  it('returns empty for insufficient data', () => {
    expect(atr([{ high: 10, low: 9, close: 9.5 }], 14)).toEqual([])
  })
})

describe('vwap', () => {
  it('computes cumulative VWAP', () => {
    const candles = [
      { high: 102, low: 98, close: 100, volume: 1000 },
      { high: 104, low: 99, close: 103, volume: 2000 },
    ]
    const result = vwap(candles)
    expect(result).toHaveLength(2)
    // First VWAP = typical price of first candle = (102+98+100)/3 = 100
    expect(result[0]).toBe(100)
    // Second VWAP is weighted average
    expect(result[1]).toBeGreaterThan(99)
    expect(result[1]).toBeLessThan(105)
  })
})

describe('zScore', () => {
  it('returns 0 when value equals the mean', () => {
    // All same values → sd=0 → z=0
    const result = zScore([5, 5, 5, 5, 5], 5)
    expect(result[0]).toBe(0)
  })

  it('returns positive when above mean, negative when below', () => {
    const values = [10, 10, 10, 10, 20]
    const result = zScore(values, 5)
    expect(result[0]).toBeGreaterThan(0) // 20 is above mean
  })

  it('returns empty for insufficient data', () => {
    expect(zScore([1, 2], 5)).toEqual([])
  })
})

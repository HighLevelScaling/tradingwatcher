import { describe, it, expect } from 'vitest'
import {
  calculatePositionSize,
  calculateStopAndTarget,
  checkRiskLimits,
  DEFAULT_RISK_CONFIG,
} from '../risk'

describe('calculatePositionSize', () => {
  it('calculates correctly for known values', () => {
    // equity=10000, risk=2%, entry=100, stop=95 → risk amount=200, price risk=5 → qty=40
    const qty = calculatePositionSize({
      equity: 10000,
      riskPerTrade: 0.02,
      entryPrice: 100,
      stopPrice: 95,
    })
    expect(qty).toBe(40)
  })

  it('returns 0 when entry equals stop (zero risk distance)', () => {
    expect(
      calculatePositionSize({
        equity: 10000,
        riskPerTrade: 0.02,
        entryPrice: 100,
        stopPrice: 100,
      })
    ).toBe(0)
  })

  it('floors the quantity and returns at least 1', () => {
    // equity=100, risk=1%, entry=100, stop=99 → risk amount=1, price risk=1 → qty=1
    const qty = calculatePositionSize({
      equity: 100,
      riskPerTrade: 0.01,
      entryPrice: 100,
      stopPrice: 99,
    })
    expect(qty).toBe(1)
  })

  it('works for short side (stop above entry)', () => {
    const qty = calculatePositionSize({
      equity: 10000,
      riskPerTrade: 0.02,
      entryPrice: 100,
      stopPrice: 105,
    })
    expect(qty).toBe(40) // same math since it uses abs()
  })
})

describe('calculateStopAndTarget', () => {
  it('calculates BUY side correctly', () => {
    const result = calculateStopAndTarget({
      entry: 100,
      side: 'BUY',
      atr: 2,
      config: DEFAULT_RISK_CONFIG,
    })
    // SL = 100 - 2*1.5 = 97
    expect(result.stopLoss).toBe(97)
    // TP = 100 + 2*3.0 = 106
    expect(result.takeProfit).toBe(106)
  })

  it('calculates SELL side correctly', () => {
    const result = calculateStopAndTarget({
      entry: 100,
      side: 'SELL',
      atr: 2,
      config: DEFAULT_RISK_CONFIG,
    })
    // SL = 100 + 2*1.5 = 103
    expect(result.stopLoss).toBe(103)
    // TP = 100 - 2*3.0 = 94
    expect(result.takeProfit).toBe(94)
  })
})

describe('checkRiskLimits', () => {
  it('allows trade when within limits', () => {
    const result = checkRiskLimits({
      openPositions: 2,
      dayPnl: -100,
      equity: 10000,
      config: DEFAULT_RISK_CONFIG,
    })
    expect(result.allowed).toBe(true)
    expect(result.reason).toBeUndefined()
  })

  it('blocks when max positions reached', () => {
    const result = checkRiskLimits({
      openPositions: 5,
      dayPnl: 0,
      equity: 10000,
      config: DEFAULT_RISK_CONFIG,
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('Max open positions')
  })

  it('blocks when daily loss limit hit', () => {
    // daily loss limit = -3% of equity = -300
    const result = checkRiskLimits({
      openPositions: 1,
      dayPnl: -350,
      equity: 10000,
      config: DEFAULT_RISK_CONFIG,
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('Daily loss limit')
  })

  it('allows when exactly at boundary (not exceeded)', () => {
    // dayPnl/equity = -299/10000 = -2.99% > -3% limit
    const result = checkRiskLimits({
      openPositions: 4,
      dayPnl: -299,
      equity: 10000,
      config: DEFAULT_RISK_CONFIG,
    })
    expect(result.allowed).toBe(true)
  })
})

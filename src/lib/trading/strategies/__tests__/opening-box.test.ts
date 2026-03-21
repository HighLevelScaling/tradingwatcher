import { describe, it, expect } from 'vitest'
import {
  processCandle,
  initialState,
  isOpeningCandle,
  getTradingDateStr,
  calcStats,
  type OBCandle,
  type OBState,
} from '../opening-box'

// Helper to create a candle at a specific UTC hour
function makeCandle(
  hour: number,
  open: number,
  high: number,
  low: number,
  close: number,
  minute = 0,
  dateStr = '2026-03-10'
): OBCandle {
  return {
    timestamp: new Date(`${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`),
    open,
    high,
    low,
    close,
    volume: 1000,
  }
}

describe('isOpeningCandle', () => {
  it('crypto: 00:00 UTC is the opening candle', () => {
    const candle = makeCandle(0, 100, 105, 95, 100)
    expect(isOpeningCandle(candle, 'BTC/USDT')).toBe(true)
  })

  it('crypto: any other time is not the opening candle', () => {
    const candle = makeCandle(5, 100, 105, 95, 100)
    expect(isOpeningCandle(candle, 'ETH/USDT')).toBe(false)
  })

  it('stocks: 13:30 UTC (EDT) is the opening candle during summer', () => {
    // June 15 is during EDT
    const candle = makeCandle(13, 100, 105, 95, 100, 30, '2026-06-15')
    expect(isOpeningCandle(candle, 'QQQ')).toBe(true)
  })

  it('stocks: 14:30 UTC (EST) is the opening candle during winter', () => {
    // January 15 is during EST
    const candle = makeCandle(14, 100, 105, 95, 100, 30, '2026-01-15')
    expect(isOpeningCandle(candle, 'QQQ')).toBe(true)
  })
})

describe('getTradingDateStr', () => {
  it('returns UTC date for crypto symbols', () => {
    const date = new Date('2026-03-10T23:00:00Z')
    expect(getTradingDateStr(date, 'BTC/USDT')).toBe('2026-03-10')
  })

  it('returns ET date for stock symbols', () => {
    // 2 AM UTC = 10 PM ET previous day
    const date = new Date('2026-03-10T02:00:00Z')
    expect(getTradingDateStr(date, 'QQQ')).toBe('2026-03-09')
  })
})

describe('processCandle — full state flow (LONG)', () => {
  const symbol = 'BTC/USDT'

  it('WAITING_OPEN_CANDLE → WAITING_BREAKOUT on opening candle', () => {
    const state = { ...initialState(symbol), date: '2026-03-10' }
    const candle = makeCandle(0, 100, 110, 90, 105)
    const { state: next, action } = processCandle(state, candle)

    expect(next.status).toBe('WAITING_BREAKOUT')
    expect(next.box).not.toBeNull()
    expect(next.box!.top).toBe(110)
    expect(next.box!.bottom).toBe(90)
    expect(next.box!.range).toBe(20)
    expect(action.type).toBe('NONE')
  })

  it('WAITING_BREAKOUT → WAITING_RETRACEMENT on close above box', () => {
    let state = { ...initialState(symbol), date: '2026-03-10' }
    // Opening candle
    state = processCandle(state, makeCandle(0, 100, 110, 90, 105)).state
    // Breakout candle: closes above 110
    const { state: next, action } = processCandle(state, makeCandle(0, 108, 115, 107, 112, 5))

    expect(next.status).toBe('WAITING_RETRACEMENT')
    expect(next.direction).toBe('LONG')
    expect(next.entryPrice).toBe(110) // box top
    expect(next.stopLoss).toBe(110 - 20 * 0.45) // 101
    expect(next.takeProfit).toBe(110 + 20 * 2) // 150
    expect(action.type).toBe('NONE')
  })

  it('WAITING_RETRACEMENT → IN_TRADE when wick touches box edge', () => {
    let state = { ...initialState(symbol), date: '2026-03-10' }
    state = processCandle(state, makeCandle(0, 100, 110, 90, 105)).state
    state = processCandle(state, makeCandle(0, 108, 115, 107, 112, 5)).state
    // Retracement candle: low touches 110 (box top)
    const { state: next, action } = processCandle(state, makeCandle(0, 113, 114, 109, 113, 10))

    expect(next.status).toBe('IN_TRADE')
    expect(next.entryFillPrice).toBe(110)
    expect(action.type).toBe('ENTER_LONG')
    expect(action.price).toBe(110)
    expect(action.stopLoss).toBe(110 - 20 * 0.45)
    expect(action.takeProfit).toBe(110 + 20 * 2)
  })

  it('IN_TRADE → DONE on take profit', () => {
    let state = { ...initialState(symbol), date: '2026-03-10' }
    state = processCandle(state, makeCandle(0, 100, 110, 90, 105)).state
    state = processCandle(state, makeCandle(0, 108, 115, 107, 112, 5)).state
    state = processCandle(state, makeCandle(0, 113, 114, 109, 113, 10)).state
    // TP candle: high hits 150 (TP)
    const { state: next, action } = processCandle(state, makeCandle(0, 140, 152, 139, 148, 15))

    expect(next.status).toBe('DONE')
    expect(next.exitReason).toBe('TP')
    expect(next.pnl).toBe(150 - 110) // 40
    expect(next.pnlPct).toBeCloseTo((40 / 110) * 100, 2)
    expect(action.type).toBe('EXIT')
    expect(action.exitReason).toBe('TP')
  })

  it('IN_TRADE → DONE on stop loss', () => {
    let state = { ...initialState(symbol), date: '2026-03-10' }
    state = processCandle(state, makeCandle(0, 100, 110, 90, 105)).state
    state = processCandle(state, makeCandle(0, 108, 115, 107, 112, 5)).state
    state = processCandle(state, makeCandle(0, 113, 114, 109, 113, 10)).state
    // SL candle: low hits 101 (SL = 110 - 9 = 101)
    const sl = 110 - 20 * 0.45
    const { state: next, action } = processCandle(state, makeCandle(0, 108, 109, sl - 1, 100, 15))

    expect(next.status).toBe('DONE')
    expect(next.exitReason).toBe('SL')
    expect(next.pnl).toBe(sl - 110) // negative
    expect(next.pnl!).toBeLessThan(0)
    expect(action.type).toBe('EXIT')
    expect(action.exitReason).toBe('SL')
  })
})

describe('processCandle — retracement timeout', () => {
  it('invalidates after MAX_RETRACEMENT_CANDLES (3) without touch', () => {
    let state = { ...initialState('BTC/USDT'), date: '2026-03-10' }
    state = processCandle(state, makeCandle(0, 100, 110, 90, 105)).state
    state = processCandle(state, makeCandle(0, 108, 115, 107, 112, 5)).state

    // 3 candles that don't touch box edge (low > 110)
    state = processCandle(state, makeCandle(0, 113, 116, 111, 114, 10)).state
    state = processCandle(state, makeCandle(0, 114, 117, 111, 115, 15)).state
    const { state: next, action } = processCandle(state, makeCandle(0, 115, 118, 112, 116, 20))

    expect(next.status).toBe('DONE')
    expect(next.exitReason).toBe('INVALIDATED')
    expect(action.type).toBe('INVALIDATE')
  })
})

describe('processCandle — box too small', () => {
  it('skips day when box range is below MIN_BOX_RANGE_PCT', () => {
    let state = { ...initialState('BTC/USDT'), date: '2026-03-10' }
    // Very tight candle: range = 0.01 on a 100 price → 0.01% (below 0.05%)
    const { state: next, action } = processCandle(state, makeCandle(0, 100, 100.01, 99.99, 100.005))

    expect(next.status).toBe('DONE')
    expect(next.exitReason).toBe('INVALIDATED')
    expect(action.type).toBe('INVALIDATE')
  })
})

describe('processCandle — SHORT flow', () => {
  it('detects SHORT breakout and enters on retracement', () => {
    let state = { ...initialState('BTC/USDT'), date: '2026-03-10' }
    state = processCandle(state, makeCandle(0, 100, 110, 90, 95)).state
    // Close below box bottom (90)
    state = processCandle(state, makeCandle(0, 92, 93, 85, 88, 5)).state

    expect(state.direction).toBe('SHORT')
    expect(state.entryPrice).toBe(90) // box bottom
    expect(state.stopLoss).toBe(90 + 20 * 0.45) // 99
    expect(state.takeProfit).toBe(90 - 20 * 2) // 50

    // Retracement: high touches 90 (box bottom)
    const { state: next, action } = processCandle(state, makeCandle(0, 87, 91, 86, 87, 10))

    expect(next.status).toBe('IN_TRADE')
    expect(action.type).toBe('ENTER_SHORT')
  })
})

describe('calcStats', () => {
  it('computes stats correctly', () => {
    const trades = [
      { pnlPct: 5, exitReason: 'TP' },
      { pnlPct: -2, exitReason: 'SL' },
      { pnlPct: 3, exitReason: 'TP' },
      { pnlPct: null, exitReason: 'INVALIDATED' },
    ]
    const stats = calcStats(trades)

    expect(stats.total).toBe(4)
    expect(stats.wins).toBe(2)
    expect(stats.losses).toBe(1)
    expect(stats.invalidated).toBe(1)
    expect(stats.winRate).toBeCloseTo(2 / 3)
    expect(stats.avgWinPct).toBe(4)
    expect(stats.avgLossPct).toBe(-2)
    expect(stats.totalPnlPct).toBe(6)
    expect(stats.expectancy).toBe(2)
    expect(stats.largestWinPct).toBe(5)
    expect(stats.largestLossPct).toBe(-2)
  })

  it('handles empty trades array', () => {
    const stats = calcStats([])
    expect(stats.total).toBe(0)
    expect(stats.winRate).toBe(0)
  })
})

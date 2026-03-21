import { describe, it, expect } from 'vitest'
import {
  processCandle,
  initialState,
  getUtcDateStr,
  getTradingDateStr,
  isOpeningCandle,
  calcStats,
  type OBCandle,
  type OBState,
} from '../opening-box'

function makeCandle(overrides: Partial<OBCandle> & { hour?: number; min?: number }): OBCandle {
  const { hour = 0, min = 0, ...rest } = overrides
  const d = new Date(`2025-01-15T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00.000Z`)
  return {
    timestamp: d,
    open: 100,
    high: 101,
    low: 99,
    close: 100,
    volume: 1000,
    ...rest,
  }
}

describe('Opening Box Strategy', () => {
  describe('getUtcDateStr', () => {
    it('returns YYYY-MM-DD format', () => {
      const d = new Date('2025-03-15T14:30:00Z')
      expect(getUtcDateStr(d)).toBe('2025-03-15')
    })
  })

  describe('getTradingDateStr', () => {
    it('uses UTC for crypto symbols', () => {
      const d = new Date('2025-03-15T23:00:00Z')
      expect(getTradingDateStr(d, 'BTC/USDT')).toBe('2025-03-15')
    })

    it('uses ET offset for stock symbols', () => {
      const d = new Date('2025-03-15T03:00:00Z') // 11 PM ET previous day
      expect(getTradingDateStr(d, 'QQQ/USD')).toBe('2025-03-14')
    })
  })

  describe('isOpeningCandle', () => {
    it('returns true for midnight UTC crypto candle', () => {
      const candle = makeCandle({ hour: 0, min: 0 })
      expect(isOpeningCandle(candle, 'BTC/USDT')).toBe(true)
    })

    it('returns false for non-midnight crypto candle', () => {
      const candle = makeCandle({ hour: 1, min: 0 })
      expect(isOpeningCandle(candle, 'BTC/USDT')).toBe(false)
    })

    it('returns true for US market open (EST)', () => {
      // January = EST = UTC-5, so 9:30 ET = 14:30 UTC
      const candle = makeCandle({ hour: 14, min: 30 })
      expect(isOpeningCandle(candle, 'QQQ/USD')).toBe(true)
    })
  })

  describe('processCandle', () => {
    it('transitions from WAITING_OPEN_CANDLE to WAITING_BREAKOUT on opening candle', () => {
      const state = { ...initialState('BTC/USDT'), date: '2025-01-15' }
      const candle = makeCandle({ hour: 0, min: 0, high: 105, low: 95, close: 100 })

      const { state: newState, action } = processCandle(state, candle)

      expect(newState.status).toBe('WAITING_BREAKOUT')
      expect(newState.box).not.toBeNull()
      expect(newState.box!.top).toBe(105)
      expect(newState.box!.bottom).toBe(95)
      expect(newState.box!.range).toBe(10)
      expect(action.type).toBe('NONE')
    })

    it('skips non-opening candles when WAITING_OPEN_CANDLE', () => {
      const state = { ...initialState('BTC/USDT'), date: '2025-01-15' }
      const candle = makeCandle({ hour: 1, min: 0 })

      const { state: newState, action } = processCandle(state, candle)
      expect(newState.status).toBe('WAITING_OPEN_CANDLE')
      expect(action.type).toBe('NONE')
    })

    it('detects LONG breakout when close > box top', () => {
      const state: OBState = {
        ...initialState('BTC/USDT'),
        date: '2025-01-15',
        status: 'WAITING_BREAKOUT',
        box: {
          top: 105,
          bottom: 95,
          range: 10,
          openCandleTime: new Date('2025-01-15T00:00:00Z'),
          openCandleOpen: 100,
          openCandleClose: 100,
        },
      }

      const candle = makeCandle({ hour: 0, min: 5, close: 107, high: 108, low: 103 })
      const { state: newState } = processCandle(state, candle)

      expect(newState.status).toBe('WAITING_RETRACEMENT')
      expect(newState.direction).toBe('LONG')
      expect(newState.entryPrice).toBe(105)  // box top
      expect(newState.stopLoss).toBeCloseTo(105 - 10 * 0.45)
      expect(newState.takeProfit).toBe(105 + 10 * 2)
    })

    it('detects SHORT breakout when close < box bottom', () => {
      const state: OBState = {
        ...initialState('BTC/USDT'),
        date: '2025-01-15',
        status: 'WAITING_BREAKOUT',
        box: {
          top: 105,
          bottom: 95,
          range: 10,
          openCandleTime: new Date('2025-01-15T00:00:00Z'),
          openCandleOpen: 100,
          openCandleClose: 100,
        },
      }

      const candle = makeCandle({ hour: 0, min: 5, close: 93, high: 97, low: 92 })
      const { state: newState } = processCandle(state, candle)

      expect(newState.status).toBe('WAITING_RETRACEMENT')
      expect(newState.direction).toBe('SHORT')
      expect(newState.entryPrice).toBe(95)  // box bottom
    })

    it('enters trade on retracement touch', () => {
      const state: OBState = {
        ...initialState('BTC/USDT'),
        date: '2025-01-15',
        status: 'WAITING_RETRACEMENT',
        direction: 'LONG',
        box: { top: 105, bottom: 95, range: 10, openCandleTime: new Date(), openCandleOpen: 100, openCandleClose: 100 },
        breakoutTime: new Date(),
        breakoutCandleClose: 107,
        entryPrice: 105,
        stopLoss: 100.5,
        takeProfit: 125,
        retracementCandles: 0,
      }

      // Candle whose low touches the box top (105)
      const candle = makeCandle({ hour: 0, min: 10, low: 104, high: 108, close: 107 })
      const { state: newState, action } = processCandle(state, candle)

      expect(newState.status).toBe('IN_TRADE')
      expect(action.type).toBe('ENTER_LONG')
      expect(action.price).toBe(105)
    })

    it('invalidates after MAX_RETRACEMENT_CANDLES', () => {
      const state: OBState = {
        ...initialState('BTC/USDT'),
        date: '2025-01-15',
        status: 'WAITING_RETRACEMENT',
        direction: 'LONG',
        box: { top: 105, bottom: 95, range: 10, openCandleTime: new Date(), openCandleOpen: 100, openCandleClose: 100 },
        breakoutTime: new Date(),
        breakoutCandleClose: 107,
        entryPrice: 105,
        stopLoss: 100.5,
        takeProfit: 125,
        retracementCandles: 2, // already 2, next will be 3 = max
      }

      // Candle that doesn't touch box top
      const candle = makeCandle({ hour: 0, min: 15, low: 106, high: 110, close: 109 })
      const { state: newState, action } = processCandle(state, candle)

      expect(newState.status).toBe('DONE')
      expect(action.type).toBe('INVALIDATE')
    })

    it('exits on take profit', () => {
      const state: OBState = {
        ...initialState('BTC/USDT'),
        date: '2025-01-15',
        status: 'IN_TRADE',
        direction: 'LONG',
        box: { top: 105, bottom: 95, range: 10, openCandleTime: new Date(), openCandleOpen: 100, openCandleClose: 100 },
        breakoutTime: new Date(),
        breakoutCandleClose: 107,
        entryPrice: 105,
        stopLoss: 100.5,
        takeProfit: 125,
        entryFillPrice: 105,
        entryAt: new Date(),
        retracementCandles: 0,
      }

      const candle = makeCandle({ hour: 0, min: 20, high: 126, low: 118, close: 125 })
      const { state: newState, action } = processCandle(state, candle)

      expect(newState.status).toBe('DONE')
      expect(newState.exitReason).toBe('TP')
      expect(newState.pnl).toBe(20) // 125 - 105
      expect(action.type).toBe('EXIT')
    })

    it('exits on stop loss', () => {
      const state: OBState = {
        ...initialState('BTC/USDT'),
        date: '2025-01-15',
        status: 'IN_TRADE',
        direction: 'LONG',
        box: { top: 105, bottom: 95, range: 10, openCandleTime: new Date(), openCandleOpen: 100, openCandleClose: 100 },
        breakoutTime: new Date(),
        breakoutCandleClose: 107,
        entryPrice: 105,
        stopLoss: 100.5,
        takeProfit: 125,
        entryFillPrice: 105,
        entryAt: new Date(),
        retracementCandles: 0,
      }

      const candle = makeCandle({ hour: 0, min: 20, high: 104, low: 99, close: 100 })
      const { state: newState, action } = processCandle(state, candle)

      expect(newState.status).toBe('DONE')
      expect(newState.exitReason).toBe('SL')
      expect(newState.pnl).toBe(100.5 - 105)  // -4.5
      expect(action.type).toBe('EXIT')
    })
  })

  describe('calcStats', () => {
    it('calculates stats correctly', () => {
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
    })

    it('handles empty trades', () => {
      const stats = calcStats([])
      expect(stats.total).toBe(0)
      expect(stats.winRate).toBe(0)
    })
  })
})

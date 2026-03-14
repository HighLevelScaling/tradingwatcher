/**
 * Opening Box Strategy
 * ─────────────────────────────────────────────────────────────────────────────
 * One trade per day. Pure state-machine logic — no side effects. The agent
 * feeds candles in one at a time; this module decides what to do.
 *
 * Rules:
 *  1. Wait for the first 5-min candle of the UTC day to close.
 *     Mark its wick high as boxTop and wick low as boxBottom. This is the box.
 *
 *  2. Watch subsequent 5-min candles. The first candle whose close is
 *     OUTSIDE the box sets the direction:
 *       close > boxTop  → LONG
 *       close < boxBottom → SHORT
 *
 *  3. After breakout, the NEXT candle is expected to retrace back to the box
 *     edge. When the candle's wick touches the edge:
 *       LONG:  candle.low  ≤ boxTop    → enter LONG  at boxTop
 *       SHORT: candle.high ≥ boxBottom → enter SHORT at boxBottom
 *
 *  4. Levels:
 *       entry     = box edge (top for LONG, bottom for SHORT)
 *       stop loss = 45% inside the box from entry
 *                   LONG:  boxTop  − 0.45 × boxRange
 *                   SHORT: boxBottom + 0.45 × boxRange
 *       take profit = entry ± 2 × boxRange (risk:reward ≈ 1:4.4)
 *
 *  5. If no retracement within MAX_RETRACEMENT_CANDLES (3) → INVALIDATED.
 *     Once the trade is done (TP / SL / invalidated) → DONE for today.
 */

export type OBStatus =
  | 'WAITING_OPEN_CANDLE'
  | 'WAITING_BREAKOUT'
  | 'WAITING_RETRACEMENT'
  | 'IN_TRADE'
  | 'DONE'

export type OBDirection = 'LONG' | 'SHORT'

export type OBExitReason = 'TP' | 'SL' | 'INVALIDATED' | 'MANUAL'

export interface OBCandle {
  timestamp: Date
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface OBBox {
  top: number
  bottom: number
  range: number
  openCandleTime: Date
  openCandleOpen: number
  openCandleClose: number
}

export interface OBState {
  status: OBStatus
  date: string                    // YYYY-MM-DD UTC — resets each day
  symbol: string
  box: OBBox | null
  direction: OBDirection | null
  breakoutTime: Date | null
  breakoutCandleClose: number | null
  retracementCandles: number      // candles elapsed since breakout
  entryPrice: number | null       // box edge
  stopLoss: number | null
  takeProfit: number | null
  entryFillPrice: number | null
  exitPrice: number | null
  pnl: number | null
  pnlPct: number | null
  exitReason: OBExitReason | null
  entryAt: Date | null
  exitAt: Date | null
}

export interface OBAction {
  type: 'ENTER_LONG' | 'ENTER_SHORT' | 'EXIT' | 'INVALIDATE' | 'NONE'
  price?: number
  stopLoss?: number
  takeProfit?: number
  exitReason?: OBExitReason
  exitPrice?: number
}

// How many candles after breakout we wait for a retracement before giving up
const MAX_RETRACEMENT_CANDLES = 3

// Minimum box range as % of price (avoid near-zero range boxes)
const MIN_BOX_RANGE_PCT = 0.05   // 0.05%

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getUtcDateStr(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

/** For US stocks, use the ET date (market trading date). */
export function getTradingDateStr(date: Date = new Date(), symbol = ''): string {
  const isCrypto = symbol.includes('/USDT') || symbol.includes('/BTC') || symbol.includes('/ETH')
  if (isCrypto) return getUtcDateStr(date)
  // ET offset: approximate to UTC-4 (good enough for date bucketing)
  const et = new Date(date.getTime() - 4 * 60 * 60 * 1000)
  return et.toISOString().slice(0, 10)
}

/**
 * True if this candle is the market-open candle for the given symbol.
 * - Stocks (QQQ, SPY, etc.): 9:30 AM ET = 14:30 UTC (13:30 UTC during EDT)
 * - Crypto: 00:00 UTC
 *
 * We detect ET offset automatically: EDT (UTC-4) from 2nd Sun Mar → 1st Sun Nov,
 * EST (UTC-5) otherwise.
 */
export function isOpeningCandle(candle: OBCandle, symbol = ''): boolean {
  const isCrypto = symbol.includes('/USDT') || symbol.includes('/BTC') || symbol.includes('/ETH')
  if (isCrypto) {
    return candle.timestamp.getUTCHours() === 0 && candle.timestamp.getUTCMinutes() === 0
  }

  // US market open: 9:30 ET
  // Determine if EDT (UTC-4) or EST (UTC-5)
  const d = candle.timestamp
  const year = d.getUTCFullYear()
  // EDT starts 2nd Sunday of March
  const edtStart = new Date(Date.UTC(year, 2, 8 + ((7 - new Date(Date.UTC(year, 2, 8)).getUTCDay()) % 7), 7))
  // EDT ends 1st Sunday of November
  const edtEnd = new Date(Date.UTC(year, 10, 1 + ((7 - new Date(Date.UTC(year, 10, 1)).getUTCDay()) % 7), 6))
  const isEDT = d >= edtStart && d < edtEnd
  const marketOpenUtcHour = isEDT ? 13 : 14
  const marketOpenUtcMin = 30

  return d.getUTCHours() === marketOpenUtcHour && d.getUTCMinutes() === marketOpenUtcMin
}

export function initialState(symbol: string): OBState {
  return {
    status: 'WAITING_OPEN_CANDLE',
    date: getUtcDateStr(),
    symbol,
    box: null,
    direction: null,
    breakoutTime: null,
    breakoutCandleClose: null,
    retracementCandles: 0,
    entryPrice: null,
    stopLoss: null,
    takeProfit: null,
    entryFillPrice: null,
    exitPrice: null,
    pnl: null,
    pnlPct: null,
    exitReason: null,
    entryAt: null,
    exitAt: null,
  }
}

// ─── Core state machine ───────────────────────────────────────────────────────

/**
 * Feed one closed 5-min candle into the strategy.
 * Returns the updated state and the action to take (if any).
 *
 * Designed to be pure / side-effect-free — caller handles execution.
 */
export function processCandle(
  state: OBState,
  candle: OBCandle
): { state: OBState; action: OBAction } {
  // Reset if a new trading day has started
  const candleDate = getTradingDateStr(candle.timestamp, state.symbol)
  if (candleDate !== state.date && state.status === 'DONE') {
    state = { ...initialState(state.symbol), date: candleDate }
  }

  switch (state.status) {
    case 'WAITING_OPEN_CANDLE':
      return handleWaitingOpenCandle(state, candle)

    case 'WAITING_BREAKOUT':
      return handleWaitingBreakout(state, candle)

    case 'WAITING_RETRACEMENT':
      return handleWaitingRetracement(state, candle)

    case 'IN_TRADE':
      return handleInTrade(state, candle)

    case 'DONE':
      return { state, action: { type: 'NONE' } }
  }
}

// ─── State handlers ───────────────────────────────────────────────────────────

function handleWaitingOpenCandle(
  state: OBState,
  candle: OBCandle
): { state: OBState; action: OBAction } {
  if (!isOpeningCandle(candle, state.symbol)) {
    return { state, action: { type: 'NONE' } }
  }

  const range = candle.high - candle.low
  const minRange = candle.close * (MIN_BOX_RANGE_PCT / 100)

  if (range < minRange) {
    // Box too small — doji / very quiet open. Skip today.
    console.log(`[OpeningBox] Box range ${range.toFixed(6)} too small (min ${minRange.toFixed(6)}), skipping day`)
    return {
      state: { ...state, status: 'DONE', exitReason: 'INVALIDATED', date: getTradingDateStr(candle.timestamp, state.symbol) },
      action: { type: 'INVALIDATE' },
    }
  }

  const box: OBBox = {
    top: candle.high,
    bottom: candle.low,
    range,
    openCandleTime: candle.timestamp,
    openCandleOpen: candle.open,
    openCandleClose: candle.close,
  }

  console.log(
    `[OpeningBox] Box set for ${getUtcDateStr(candle.timestamp)}: ` +
    `top=${box.top.toFixed(4)} bottom=${box.bottom.toFixed(4)} range=${range.toFixed(4)}`
  )

  return {
    state: { ...state, status: 'WAITING_BREAKOUT', box, date: getTradingDateStr(candle.timestamp, state.symbol) },
    action: { type: 'NONE' },
  }
}

function handleWaitingBreakout(
  state: OBState,
  candle: OBCandle
): { state: OBState; action: OBAction } {
  const box = state.box!

  // Skip the opening candle itself if it somehow re-enters this handler
  if (candle.timestamp.getTime() === box.openCandleTime.getTime()) {
    return { state, action: { type: 'NONE' } }
  }

  let direction: OBDirection | null = null

  if (candle.close > box.top) {
    direction = 'LONG'
  } else if (candle.close < box.bottom) {
    direction = 'SHORT'
  }

  if (!direction) {
    return { state, action: { type: 'NONE' } }  // still inside box
  }

  // Calculate trade levels
  const entryPrice = direction === 'LONG' ? box.top : box.bottom
  const stopLoss = direction === 'LONG'
    ? box.top - box.range * 0.45        // 45% down from top (inside box)
    : box.bottom + box.range * 0.45     // 45% up from bottom (inside box)
  const takeProfit = direction === 'LONG'
    ? entryPrice + box.range * 2        // 2× box range above entry
    : entryPrice - box.range * 2        // 2× box range below entry

  console.log(
    `[OpeningBox] Breakout ${direction} at close=${candle.close.toFixed(4)} | ` +
    `entry=${entryPrice.toFixed(4)} SL=${stopLoss.toFixed(4)} TP=${takeProfit.toFixed(4)}`
  )

  return {
    state: {
      ...state,
      status: 'WAITING_RETRACEMENT',
      direction,
      breakoutTime: candle.timestamp,
      breakoutCandleClose: candle.close,
      entryPrice,
      stopLoss,
      takeProfit,
      retracementCandles: 0,
    },
    action: { type: 'NONE' },
  }
}

function handleWaitingRetracement(
  state: OBState,
  candle: OBCandle
): { state: OBState; action: OBAction } {
  const { direction, entryPrice, stopLoss, takeProfit, retracementCandles } = state

  // Check for retracement: wick touches the box edge
  const touched =
    direction === 'LONG'
      ? candle.low <= entryPrice!          // pulled back to box top
      : candle.high >= entryPrice!         // pulled back to box bottom

  if (touched) {
    console.log(
      `[OpeningBox] Retracement confirmed — entering ${direction} at ${entryPrice!.toFixed(4)}`
    )
    return {
      state: {
        ...state,
        status: 'IN_TRADE',
        entryAt: candle.timestamp,
        entryFillPrice: entryPrice!,
      },
      action: {
        type: direction === 'LONG' ? 'ENTER_LONG' : 'ENTER_SHORT',
        price: entryPrice!,
        stopLoss: stopLoss!,
        takeProfit: takeProfit!,
      },
    }
  }

  const newCount = retracementCandles + 1
  if (newCount >= MAX_RETRACEMENT_CANDLES) {
    console.log(`[OpeningBox] No retracement in ${MAX_RETRACEMENT_CANDLES} candles — invalidated`)
    return {
      state: { ...state, status: 'DONE', exitReason: 'INVALIDATED', retracementCandles: newCount },
      action: { type: 'INVALIDATE' },
    }
  }

  return {
    state: { ...state, retracementCandles: newCount },
    action: { type: 'NONE' },
  }
}

function handleInTrade(
  state: OBState,
  candle: OBCandle
): { state: OBState; action: OBAction } {
  const { direction, stopLoss, takeProfit, entryFillPrice } = state

  let exitPrice: number | null = null
  let exitReason: OBExitReason | null = null

  if (direction === 'LONG') {
    // Check SL first (worst case)
    if (candle.low <= stopLoss!) {
      exitPrice = stopLoss!
      exitReason = 'SL'
    } else if (candle.high >= takeProfit!) {
      exitPrice = takeProfit!
      exitReason = 'TP'
    }
  } else {
    if (candle.high >= stopLoss!) {
      exitPrice = stopLoss!
      exitReason = 'SL'
    } else if (candle.low <= takeProfit!) {
      exitPrice = takeProfit!
      exitReason = 'TP'
    }
  }

  if (!exitReason) {
    return { state, action: { type: 'NONE' } }
  }

  const pnl = direction === 'LONG'
    ? exitPrice! - entryFillPrice!
    : entryFillPrice! - exitPrice!
  const pnlPct = (pnl / entryFillPrice!) * 100

  console.log(
    `[OpeningBox] Exit ${exitReason} at ${exitPrice!.toFixed(4)} | ` +
    `PnL: ${pnl > 0 ? '+' : ''}${pnl.toFixed(4)} (${pnlPct.toFixed(2)}%)`
  )

  return {
    state: {
      ...state,
      status: 'DONE',
      exitPrice: exitPrice!,
      exitReason,
      exitAt: candle.timestamp,
      pnl,
      pnlPct,
    },
    action: {
      type: 'EXIT',
      exitPrice: exitPrice!,
      exitReason,
    },
  }
}

// ─── Stats helper ─────────────────────────────────────────────────────────────

export interface OBStats {
  total: number
  wins: number
  losses: number
  invalidated: number
  winRate: number
  avgWinPct: number
  avgLossPct: number
  totalPnlPct: number
  expectancy: number       // avg outcome per trade
  largestWinPct: number
  largestLossPct: number
}

export function calcStats(
  trades: Array<{ pnlPct: number | null; exitReason: string | null }>
): OBStats {
  const completed = trades.filter((t) => t.exitReason === 'TP' || t.exitReason === 'SL')
  const wins = completed.filter((t) => (t.pnlPct ?? 0) > 0)
  const losses = completed.filter((t) => (t.pnlPct ?? 0) <= 0)
  const invalidated = trades.filter((t) => t.exitReason === 'INVALIDATED').length

  const avgWinPct = wins.length ? wins.reduce((s, t) => s + (t.pnlPct ?? 0), 0) / wins.length : 0
  const avgLossPct = losses.length ? losses.reduce((s, t) => s + (t.pnlPct ?? 0), 0) / losses.length : 0
  const winRate = completed.length ? wins.length / completed.length : 0
  const totalPnlPct = completed.reduce((s, t) => s + (t.pnlPct ?? 0), 0)
  const expectancy = completed.length ? totalPnlPct / completed.length : 0
  const largestWinPct = wins.length ? Math.max(...wins.map((t) => t.pnlPct ?? 0)) : 0
  const largestLossPct = losses.length ? Math.min(...losses.map((t) => t.pnlPct ?? 0)) : 0

  return {
    total: trades.length,
    wins: wins.length,
    losses: losses.length,
    invalidated,
    winRate,
    avgWinPct,
    avgLossPct,
    totalPnlPct,
    expectancy,
    largestWinPct,
    largestLossPct,
  }
}

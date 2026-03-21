/**
 * CCXT-based multi-exchange client.
 * Supports unlimited exchanges — configured via:
 *   1. Numbered env vars  (EXCHANGE_1_*, EXCHANGE_2_*, …, EXCHANGE_N_*)
 *   2. Database           (TradingExchange table — managed from the UI)
 *
 * Both sources are merged at runtime; DB entries take precedence over env vars
 * for exchanges with the same `exchangeId`.
 *
 * CCXT supports 250+ exchanges: binance, bybit, kraken, okx, coinbase,
 * kucoin, gate, bitget, mexc, huobi, and hundreds more.
 */

import ccxt, { type Exchange as CcxtExchange, type Ticker as CcxtTicker, type Position as CcxtPosition, type Order as CcxtOrder } from 'ccxt'

// Any string is valid — CCXT has 250+ exchange IDs
export type ExchangeId = string

export interface ExchangeConfig {
  id: ExchangeId
  label?: string        // human name, e.g. "Binance Main"
  apiKey?: string
  secret?: string
  sandbox?: boolean
  isPrimary?: boolean
}

export interface Bar {
  timestamp: Date
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface Quote {
  symbol: string
  exchange: string
  bid: number
  ask: number
  last: number
  timestamp: Date
}

export interface AccountBalance {
  exchange: string
  totalUsdt: number
  freeUsdt: number
  positions: Array<{
    symbol: string
    size: number
    entryPrice: number
    unrealizedPnl: number
  }>
}

export interface OrderResult {
  orderId: string
  symbol: string
  side: 'buy' | 'sell'
  qty: number
  price?: number
  status: string
  exchange: string
}

// ─── Exchange Client ───────────────────────────────────────────────────────────

export class ExchangeClient {
  private exchange: CcxtExchange
  public readonly id: ExchangeId
  public readonly label: string
  public readonly sandbox: boolean

  constructor(config: ExchangeConfig) {
    this.id = config.id
    this.label = config.label ?? config.id
    this.sandbox = config.sandbox ?? false

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exchangeClass = (ccxt as any)[config.id] as
      | (new (params: Record<string, unknown>) => CcxtExchange)
      | undefined

    if (!exchangeClass) {
      throw new Error(
        `[exchange.ts] Unknown CCXT exchange: "${config.id}". ` +
          `See https://github.com/ccxt/ccxt/wiki/Exchange-Markets for a full list.`
      )
    }

    this.exchange = new exchangeClass({
      apiKey: config.apiKey,
      secret: config.secret,
      enableRateLimit: true,
    })

    if (this.sandbox) {
      try {
        this.exchange.setSandboxMode(true)
      } catch {
        // Some exchanges (Kraken, Coinbase) don't have a testnet — silently skip
      }
    }
  }

  // ─── Balance ───────────────────────────────────────────────────────────────

  async getBalance(): Promise<AccountBalance> {
    try {
      const balance = await this.exchange.fetchBalance()
      const balanceAny = balance as Record<string, unknown>
      const total = balanceAny.total as Record<string, number> | undefined
      const free = balanceAny.free as Record<string, number> | undefined
      const totalUsdt = total?.USDT ?? 0
      const freeUsdt = free?.USDT ?? 0

      let positions: AccountBalance['positions'] = []
      try {
        const raw = await this.exchange.fetchPositions()
        positions = raw
          .filter((p: CcxtPosition) => p.contracts && p.contracts !== 0)
          .map((p: CcxtPosition) => ({
            symbol: p.symbol,
            size: p.contracts ?? 0,
            entryPrice: p.entryPrice ?? 0,
            unrealizedPnl: p.unrealizedPnl ?? 0,
          }))
      } catch {
        // Spot-only exchanges don't expose positions
      }

      return { exchange: this.id, totalUsdt, freeUsdt, positions }
    } catch (err) {
      throw new Error(`[${this.id}] getBalance: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // ─── OHLCV Bars ────────────────────────────────────────────────────────────

  async getBars(symbol: string, timeframe: '3m' | '5m' | '1d', limit = 200): Promise<Bar[]> {
    try {
      const ohlcv = await this.exchange.fetchOHLCV(symbol, timeframe, undefined, limit)
      return (ohlcv as number[][]).map((row) => ({
        timestamp: new Date(row[0]),
        open: row[1],
        high: row[2],
        low: row[3],
        close: row[4],
        volume: row[5],
      }))
    } catch (err) {
      throw new Error(
        `[${this.id}] getBars(${symbol}, ${timeframe}): ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  // ─── Single Ticker ─────────────────────────────────────────────────────────

  async getTicker(symbol: string): Promise<Quote> {
    try {
      const t = await this.exchange.fetchTicker(symbol)
      return {
        symbol,
        exchange: this.id,
        bid: (t.bid as number) ?? 0,
        ask: (t.ask as number) ?? 0,
        last: (t.last as number) ?? 0,
        timestamp: t.timestamp ? new Date(t.timestamp as number) : new Date(),
      }
    } catch (err) {
      throw new Error(
        `[${this.id}] getTicker(${symbol}): ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  // ─── Multiple Tickers ──────────────────────────────────────────────────────

  async getTickers(symbols: string[]): Promise<Map<string, Quote>> {
    try {
      const tickers = await this.exchange.fetchTickers(symbols)
      const result = new Map<string, Quote>()
      for (const [sym, t] of Object.entries(tickers) as [string, CcxtTicker][]) {
        result.set(sym, {
          symbol: sym,
          exchange: this.id,
          bid: t.bid ?? 0,
          ask: t.ask ?? 0,
          last: t.last ?? 0,
          timestamp: t.timestamp ? new Date(t.timestamp) : new Date(),
        })
      }
      return result
    } catch {
      // Fallback: fetch one by one
      const result = new Map<string, Quote>()
      await Promise.allSettled(
        symbols.map(async (sym) => {
          try {
            result.set(sym, await this.getTicker(sym))
          } catch {
            /* skip */
          }
        })
      )
      return result
    }
  }

  // ─── Submit Order ──────────────────────────────────────────────────────────

  async submitOrder(params: {
    symbol: string
    side: 'buy' | 'sell'
    qty: number
    stopLoss?: number
    takeProfit?: number
  }): Promise<OrderResult> {
    try {
      const extra: Record<string, unknown> = {}
      if (params.stopLoss !== undefined) extra.stopLossPrice = params.stopLoss
      if (params.takeProfit !== undefined) extra.takeProfitPrice = params.takeProfit

      const order = await this.exchange.createOrder(
        params.symbol,
        'market',
        params.side,
        params.qty,
        undefined,
        Object.keys(extra).length > 0 ? extra : undefined
      )

      return {
        orderId: order.id,
        symbol: order.symbol,
        side: params.side,
        qty: params.qty,
        price: (order.average as number) ?? (order.price as number) ?? undefined,
        status: order.status ?? 'open',
        exchange: this.id,
      }
    } catch (err) {
      throw new Error(
        `[${this.id}] submitOrder(${params.symbol}): ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  // ─── Cancel Order ──────────────────────────────────────────────────────────

  async cancelOrder(orderId: string, symbol: string): Promise<void> {
    try {
      await this.exchange.cancelOrder(orderId, symbol)
    } catch (err) {
      throw new Error(
        `[${this.id}] cancelOrder(${orderId}): ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  // ─── Get Order ─────────────────────────────────────────────────────────────

  async getOrder(
    orderId: string,
    symbol: string
  ): Promise<{ status: string; filled: number; avgPrice: number }> {
    try {
      const o = await this.exchange.fetchOrder(orderId, symbol)
      return {
        status: o.status ?? 'open',
        filled: (o.filled as number) ?? 0,
        avgPrice: (o.average as number) ?? (o.price as number) ?? 0,
      }
    } catch (err) {
      throw new Error(
        `[${this.id}] getOrder(${orderId}): ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  // ─── Open Orders ───────────────────────────────────────────────────────────

  async getOpenOrders(symbol?: string): Promise<OrderResult[]> {
    try {
      const orders = await this.exchange.fetchOpenOrders(symbol)
      return orders.map((o: CcxtOrder) => ({
        orderId: o.id,
        symbol: o.symbol,
        side: (o.side as 'buy' | 'sell') ?? 'buy',
        qty: o.amount ?? 0,
        price: o.price ?? undefined,
        status: o.status ?? 'open',
        exchange: this.id,
      }))
    } catch (err) {
      throw new Error(
        `[${this.id}] getOpenOrders: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  // ─── Supported timeframes ──────────────────────────────────────────────────

  supportsTimeframe(timeframe: string): boolean {
    return !this.exchange.timeframes || timeframe in this.exchange.timeframes
  }
}

// ─── Factories ────────────────────────────────────────────────────────────────

/**
 * Build exchange clients from numbered env vars.
 *
 * Format:
 *   EXCHANGE_1_ID=binance
 *   EXCHANGE_1_API_KEY=abc
 *   EXCHANGE_1_SECRET=xyz
 *   EXCHANGE_1_SANDBOX=true
 *   EXCHANGE_1_LABEL=Binance Main        (optional)
 *   EXCHANGE_1_PRIMARY=true              (optional, marks as primary)
 *
 *   EXCHANGE_2_ID=bybit
 *   EXCHANGE_2_API_KEY=...
 *   ...
 *
 * Supports any number of exchanges — just keep incrementing the index.
 * Also still supports the legacy PRIMARY_EXCHANGE / EXCHANGE_API_KEY pattern
 * as index 0 for backwards compatibility.
 */
export function loadExchangesFromEnv(): ExchangeConfig[] {
  const configs: ExchangeConfig[] = []

  // Legacy single-exchange env vars (backwards compat)
  const legacyId = process.env.PRIMARY_EXCHANGE
  const legacyKey = process.env.EXCHANGE_API_KEY
  const legacySecret = process.env.EXCHANGE_SECRET_KEY
  if (legacyId && legacyKey && legacySecret) {
    configs.push({
      id: legacyId,
      label: `${legacyId} (primary)`,
      apiKey: legacyKey,
      secret: legacySecret,
      sandbox: (process.env.EXCHANGE_SANDBOX ?? 'true') === 'true',
      isPrimary: true,
    })
  }

  // Numbered env vars: EXCHANGE_1_*, EXCHANGE_2_*, ... (no upper limit)
  let i = 1
  while (true) {
    const id = process.env[`EXCHANGE_${i}_ID`]
    const apiKey = process.env[`EXCHANGE_${i}_API_KEY`]
    const secret = process.env[`EXCHANGE_${i}_SECRET`]
    if (!id || !apiKey || !secret) break  // stop at first gap

    configs.push({
      id,
      label: process.env[`EXCHANGE_${i}_LABEL`] ?? `${id} #${i}`,
      apiKey,
      secret,
      sandbox: (process.env[`EXCHANGE_${i}_SANDBOX`] ?? 'true') === 'true',
      isPrimary: (process.env[`EXCHANGE_${i}_PRIMARY`] ?? 'false') === 'true',
    })
    i++
  }

  return configs
}

/**
 * Build exchange clients from DB rows (TradingExchange table).
 * Caller must pass the raw DB rows to avoid a Prisma import cycle.
 */
export function loadExchangesFromDb(
  rows: Array<{
    exchangeId: string
    name: string
    apiKey: string
    secretKey: string
    sandbox: boolean
    isPrimary: boolean
  }>
): ExchangeConfig[] {
  return rows.map((r) => ({
    id: r.exchangeId,
    label: r.name,
    apiKey: r.apiKey,
    secret: r.secretKey,
    sandbox: r.sandbox,
    isPrimary: r.isPrimary,
  }))
}

/**
 * Main factory used by the orchestrator.
 * Merges env-var configs + DB configs (DB wins on duplicate exchangeId).
 * Returns { primary, exchanges[] } where primary is the isPrimary one
 * (or the first exchange if none is explicitly flagged).
 */
export function createExchangeClients(
  dbConfigs: ExchangeConfig[] = []
): { primary: ExchangeClient; exchanges: ExchangeClient[] } {
  const envConfigs = loadExchangesFromEnv()

  // Merge: env first, DB overrides duplicates by exchangeId
  const merged = new Map<string, ExchangeConfig>()
  for (const c of envConfigs) merged.set(c.id, c)
  for (const c of dbConfigs) merged.set(c.id, c)   // DB wins

  const allConfigs = Array.from(merged.values())

  if (allConfigs.length === 0) {
    throw new Error(
      'No exchanges configured. Add EXCHANGE_1_ID / EXCHANGE_1_API_KEY / EXCHANGE_1_SECRET ' +
        'to your .env, or add an exchange via the trading dashboard.'
    )
  }

  const clients = allConfigs.map((c) => new ExchangeClient(c))

  // Primary = explicitly flagged, or first
  const primaryClient =
    clients.find((_, i) => allConfigs[i].isPrimary) ?? clients[0]

  return { primary: primaryClient, exchanges: clients }
}

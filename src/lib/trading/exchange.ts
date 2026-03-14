/**
 * CCXT-based multi-exchange client.
 * Replaces alpaca.ts entirely — supports Binance, Bybit, Kraken, OKX, Coinbase and 250+ more.
 */

import ccxt from 'ccxt'

export type SupportedExchange = 'binance' | 'bybit' | 'kraken' | 'okx' | 'coinbase'

export interface ExchangeConfig {
  id: SupportedExchange
  apiKey?: string
  secret?: string
  sandbox?: boolean
  enableRateLimit?: boolean
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

// ─────────────────────────────────────────────────────────────────────────────

export class ExchangeClient {
  private exchange: ccxt.Exchange
  public readonly id: SupportedExchange
  public readonly sandbox: boolean

  constructor(config: ExchangeConfig) {
    this.id = config.id
    this.sandbox = config.sandbox ?? false

    const exchangeClass = ccxt[config.id] as new (params: Record<string, unknown>) => ccxt.Exchange
    if (!exchangeClass) {
      throw new Error(`Unsupported exchange: ${config.id}`)
    }

    this.exchange = new exchangeClass({
      apiKey: config.apiKey,
      secret: config.secret,
      enableRateLimit: config.enableRateLimit ?? true,
    })

    if (this.sandbox) {
      try {
        this.exchange.setSandboxMode(true)
      } catch {
        // Some exchanges (e.g. Kraken) don't support sandbox — silently ignore
      }
    }
  }

  // ─── Balance ─────────────────────────────────────────────────────────────

  async getBalance(): Promise<AccountBalance> {
    try {
      const balance = await this.exchange.fetchBalance()
      const totalUsdt = (balance.total?.USDT as number) ?? 0
      const freeUsdt = (balance.free?.USDT as number) ?? 0

      let positions: AccountBalance['positions'] = []
      try {
        const rawPositions = await this.exchange.fetchPositions()
        positions = rawPositions
          .filter((p) => p.contracts && (p.contracts as number) !== 0)
          .map((p) => ({
            symbol: p.symbol,
            size: (p.contracts as number) ?? 0,
            entryPrice: (p.entryPrice as number) ?? 0,
            unrealizedPnl: (p.unrealizedPnl as number) ?? 0,
          }))
      } catch {
        // Not all exchanges support fetchPositions (spot-only)
      }

      return { exchange: this.id, totalUsdt, freeUsdt, positions }
    } catch (err) {
      throw new Error(`[${this.id}] getBalance failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // ─── OHLCV Bars ───────────────────────────────────────────────────────────

  async getBars(
    symbol: string,
    timeframe: '3m' | '5m' | '1d',
    limit = 200
  ): Promise<Bar[]> {
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
        `[${this.id}] getBars(${symbol}, ${timeframe}) failed: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  // ─── Single Ticker ────────────────────────────────────────────────────────

  async getTicker(symbol: string): Promise<Quote> {
    try {
      const ticker = await this.exchange.fetchTicker(symbol)
      return {
        symbol,
        exchange: this.id,
        bid: (ticker.bid as number) ?? 0,
        ask: (ticker.ask as number) ?? 0,
        last: (ticker.last as number) ?? 0,
        timestamp: ticker.timestamp ? new Date(ticker.timestamp as number) : new Date(),
      }
    } catch (err) {
      throw new Error(
        `[${this.id}] getTicker(${symbol}) failed: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  // ─── Multiple Tickers ─────────────────────────────────────────────────────

  async getTickers(symbols: string[]): Promise<Map<string, Quote>> {
    try {
      const tickers = await this.exchange.fetchTickers(symbols)
      const result = new Map<string, Quote>()
      for (const [sym, ticker] of Object.entries(tickers)) {
        result.set(sym, {
          symbol: sym,
          exchange: this.id,
          bid: (ticker.bid as number) ?? 0,
          ask: (ticker.ask as number) ?? 0,
          last: (ticker.last as number) ?? 0,
          timestamp: ticker.timestamp ? new Date(ticker.timestamp as number) : new Date(),
        })
      }
      return result
    } catch (err) {
      // Fallback: fetch one by one if batch not supported
      const result = new Map<string, Quote>()
      await Promise.allSettled(
        symbols.map(async (sym) => {
          try {
            const q = await this.getTicker(sym)
            result.set(sym, q)
          } catch {
            // skip failed symbol
          }
        })
      )
      return result
    }
  }

  // ─── Submit Order ─────────────────────────────────────────────────────────

  async submitOrder(params: {
    symbol: string
    side: 'buy' | 'sell'
    qty: number
    stopLoss?: number
    takeProfit?: number
  }): Promise<OrderResult> {
    try {
      const orderParams: Record<string, unknown> = {}
      if (params.stopLoss !== undefined) orderParams.stopLossPrice = params.stopLoss
      if (params.takeProfit !== undefined) orderParams.takeProfitPrice = params.takeProfit

      const order = await this.exchange.createOrder(
        params.symbol,
        'market',
        params.side,
        params.qty,
        undefined,
        Object.keys(orderParams).length > 0 ? orderParams : undefined
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
        `[${this.id}] submitOrder(${params.symbol}) failed: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  // ─── Cancel Order ─────────────────────────────────────────────────────────

  async cancelOrder(orderId: string, symbol: string): Promise<void> {
    try {
      await this.exchange.cancelOrder(orderId, symbol)
    } catch (err) {
      throw new Error(
        `[${this.id}] cancelOrder(${orderId}) failed: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  // ─── Get Order ────────────────────────────────────────────────────────────

  async getOrder(
    orderId: string,
    symbol: string
  ): Promise<{ status: string; filled: number; avgPrice: number }> {
    try {
      const order = await this.exchange.fetchOrder(orderId, symbol)
      return {
        status: order.status ?? 'open',
        filled: (order.filled as number) ?? 0,
        avgPrice: (order.average as number) ?? (order.price as number) ?? 0,
      }
    } catch (err) {
      throw new Error(
        `[${this.id}] getOrder(${orderId}) failed: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  // ─── Open Orders ──────────────────────────────────────────────────────────

  async getOpenOrders(symbol?: string): Promise<OrderResult[]> {
    try {
      const orders = await this.exchange.fetchOpenOrders(symbol)
      return orders.map((o) => ({
        orderId: o.id,
        symbol: o.symbol,
        side: (o.side as 'buy' | 'sell') ?? 'buy',
        qty: (o.amount as number) ?? 0,
        price: (o.price as number) ?? undefined,
        status: o.status ?? 'open',
        exchange: this.id,
      }))
    } catch (err) {
      throw new Error(
        `[${this.id}] getOpenOrders failed: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Creates primary + secondary exchange clients from environment variables.
 *
 * Env vars:
 *   PRIMARY_EXCHANGE=binance (default)
 *   EXCHANGE_API_KEY / EXCHANGE_SECRET_KEY / EXCHANGE_SANDBOX=true
 *   EXCHANGE2_ID=bybit / EXCHANGE2_API_KEY / EXCHANGE2_SECRET_KEY / EXCHANGE2_SANDBOX=true
 *   EXCHANGE3_ID=kraken / EXCHANGE3_API_KEY / EXCHANGE3_SECRET_KEY / EXCHANGE3_SANDBOX=false
 */
export function createExchangeClients(): {
  primary: ExchangeClient
  exchanges: ExchangeClient[]
} {
  const primaryId = (process.env.PRIMARY_EXCHANGE ?? 'binance') as SupportedExchange
  const primaryKey = process.env.EXCHANGE_API_KEY
  const primarySecret = process.env.EXCHANGE_SECRET_KEY
  const primarySandbox = (process.env.EXCHANGE_SANDBOX ?? 'true') === 'true'

  if (!primaryKey || !primarySecret) {
    throw new Error(
      'EXCHANGE_API_KEY and EXCHANGE_SECRET_KEY environment variables are required'
    )
  }

  const primary = new ExchangeClient({
    id: primaryId,
    apiKey: primaryKey,
    secret: primarySecret,
    sandbox: primarySandbox,
    enableRateLimit: true,
  })

  const exchanges: ExchangeClient[] = [primary]

  // Exchange 2
  const ex2Id = process.env.EXCHANGE2_ID as SupportedExchange | undefined
  const ex2Key = process.env.EXCHANGE2_API_KEY
  const ex2Secret = process.env.EXCHANGE2_SECRET_KEY
  if (ex2Id && ex2Key && ex2Secret) {
    const ex2Sandbox = (process.env.EXCHANGE2_SANDBOX ?? 'true') === 'true'
    exchanges.push(
      new ExchangeClient({
        id: ex2Id,
        apiKey: ex2Key,
        secret: ex2Secret,
        sandbox: ex2Sandbox,
        enableRateLimit: true,
      })
    )
  }

  // Exchange 3
  const ex3Id = process.env.EXCHANGE3_ID as SupportedExchange | undefined
  const ex3Key = process.env.EXCHANGE3_API_KEY
  const ex3Secret = process.env.EXCHANGE3_SECRET_KEY
  if (ex3Id && ex3Key && ex3Secret) {
    const ex3Sandbox = (process.env.EXCHANGE3_SANDBOX ?? 'false') === 'true'
    exchanges.push(
      new ExchangeClient({
        id: ex3Id,
        apiKey: ex3Key,
        secret: ex3Secret,
        sandbox: ex3Sandbox,
        enableRateLimit: true,
      })
    )
  }

  return { primary, exchanges }
}

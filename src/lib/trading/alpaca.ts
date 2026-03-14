/**
 * Alpaca Markets API Client
 * Uses direct fetch — no external Alpaca SDK needed.
 */

export interface AlpacaAccount {
  id: string
  account_number: string
  status: string
  currency: string
  buying_power: string
  cash: string
  portfolio_value: string
  equity: string
  last_equity: string
  long_market_value: string
  short_market_value: string
  daytrade_count: number
  daytrading_buying_power: string
}

export interface AlpacaPosition {
  asset_id: string
  symbol: string
  exchange: string
  asset_class: string
  qty: string
  qty_available: string
  side: string
  market_value: string
  cost_basis: string
  unrealized_pl: string
  unrealized_plpc: string
  current_price: string
  lastday_price: string
  change_today: string
}

export interface AlpacaOrder {
  id: string
  client_order_id: string
  created_at: string
  updated_at: string
  submitted_at: string
  filled_at: string | null
  expired_at: string | null
  canceled_at: string | null
  failed_at: string | null
  asset_id: string
  symbol: string
  asset_class: string
  qty: string
  filled_qty: string
  filled_avg_price: string | null
  order_class: string
  order_type: string
  type: string
  side: string
  time_in_force: string
  limit_price: string | null
  stop_price: string | null
  status: string
  legs: AlpacaOrder[] | null
}

export interface SubmitOrderParams {
  symbol: string
  qty: number
  side: 'buy' | 'sell'
  type: 'market' | 'limit' | 'stop' | 'stop_limit'
  time_in_force?: 'day' | 'gtc' | 'ioc' | 'fok'
  limit_price?: number
  stop_price?: number
  order_class?: 'simple' | 'bracket' | 'oco' | 'oto'
  stop_loss?: { stop_price: number; limit_price?: number }
  take_profit?: { limit_price: number }
}

export interface Bar {
  t: string   // ISO timestamp
  o: number   // open
  h: number   // high
  l: number   // low
  c: number   // close
  v: number   // volume
  vw?: number // vwap
}

export interface GetBarsParams {
  symbols: string[]
  timeframe: '3Min' | '5Min' | '1Day' | '1Hour'
  start: string   // ISO date
  end?: string    // ISO date
  limit?: number
}

export interface Quote {
  bid: number
  ask: number
  last: number
}

export class AlpacaClient {
  private tradeBaseUrl: string
  private dataBaseUrl: string
  private headers: Record<string, string>

  constructor(config: { apiKey: string; secretKey: string; paper: boolean }) {
    this.tradeBaseUrl = config.paper
      ? 'https://paper-api.alpaca.markets'
      : 'https://api.alpaca.markets'
    this.dataBaseUrl = 'https://data.alpaca.markets'
    this.headers = {
      'APCA-API-KEY-ID': config.apiKey,
      'APCA-API-SECRET-KEY': config.secretKey,
      'Content-Type': 'application/json',
    }
  }

  private async request<T>(
    baseUrl: string,
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${baseUrl}${path}`
    const res = await fetch(url, {
      ...options,
      headers: { ...this.headers, ...(options.headers as Record<string, string> || {}) },
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Alpaca API error ${res.status} on ${path}: ${errorText}`)
    }

    const text = await res.text()
    if (!text) return {} as T
    return JSON.parse(text) as T
  }

  async getAccount(): Promise<AlpacaAccount> {
    return this.request<AlpacaAccount>(this.tradeBaseUrl, '/v2/account')
  }

  async getPositions(): Promise<AlpacaPosition[]> {
    return this.request<AlpacaPosition[]>(this.tradeBaseUrl, '/v2/positions')
  }

  async getOrders(status: 'open' | 'closed' | 'all' = 'open'): Promise<AlpacaOrder[]> {
    return this.request<AlpacaOrder[]>(
      this.tradeBaseUrl,
      `/v2/orders?status=${status}&limit=100`
    )
  }

  async getOrder(orderId: string): Promise<AlpacaOrder> {
    return this.request<AlpacaOrder>(this.tradeBaseUrl, `/v2/orders/${orderId}`)
  }

  async submitOrder(params: SubmitOrderParams): Promise<AlpacaOrder> {
    const body: Record<string, unknown> = {
      symbol: params.symbol,
      qty: params.qty.toString(),
      side: params.side,
      type: params.type,
      time_in_force: params.time_in_force ?? 'day',
    }

    if (params.limit_price !== undefined) body.limit_price = params.limit_price.toFixed(2)
    if (params.stop_price !== undefined) body.stop_price = params.stop_price.toFixed(2)
    if (params.order_class) body.order_class = params.order_class

    if (params.order_class === 'bracket') {
      if (params.stop_loss) {
        body.stop_loss = {
          stop_price: params.stop_loss.stop_price.toFixed(2),
          ...(params.stop_loss.limit_price
            ? { limit_price: params.stop_loss.limit_price.toFixed(2) }
            : {}),
        }
      }
      if (params.take_profit) {
        body.take_profit = { limit_price: params.take_profit.limit_price.toFixed(2) }
      }
    }

    return this.request<AlpacaOrder>(this.tradeBaseUrl, '/v2/orders', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  async cancelOrder(orderId: string): Promise<void> {
    await this.request<void>(this.tradeBaseUrl, `/v2/orders/${orderId}`, {
      method: 'DELETE',
    })
  }

  async getBars(params: GetBarsParams): Promise<Map<string, Bar[]>> {
    const symbolsParam = params.symbols.join(',')
    const queryParams = new URLSearchParams({
      symbols: symbolsParam,
      timeframe: params.timeframe,
      start: params.start,
      feed: 'iex', // Free tier data source
      limit: (params.limit ?? 200).toString(),
    })
    if (params.end) queryParams.set('end', params.end)

    const data = await this.request<{ bars: Record<string, Bar[]> }>(
      this.dataBaseUrl,
      `/v2/stocks/bars?${queryParams.toString()}`
    )

    const result = new Map<string, Bar[]>()
    if (data.bars) {
      for (const [symbol, bars] of Object.entries(data.bars)) {
        result.set(symbol, bars)
      }
    }
    return result
  }

  async getLatestQuotes(symbols: string[]): Promise<Map<string, Quote>> {
    const symbolsParam = symbols.join(',')
    const queryParams = new URLSearchParams({
      symbols: symbolsParam,
      feed: 'iex',
    })

    const data = await this.request<{
      quotes: Record<string, { bp: number; ap: number; sp?: number }>
    }>(this.dataBaseUrl, `/v2/stocks/quotes/latest?${queryParams.toString()}`)

    const result = new Map<string, Quote>()
    if (data.quotes) {
      for (const [symbol, q] of Object.entries(data.quotes)) {
        result.set(symbol, {
          bid: q.bp ?? 0,
          ask: q.ap ?? 0,
          last: q.sp ?? (q.bp + q.ap) / 2,
        })
      }
    }
    return result
  }

  async getLatestBars(symbols: string[]): Promise<Map<string, Bar>> {
    const symbolsParam = symbols.join(',')
    const queryParams = new URLSearchParams({
      symbols: symbolsParam,
      feed: 'iex',
    })

    const data = await this.request<{ bars: Record<string, Bar> }>(
      this.dataBaseUrl,
      `/v2/stocks/bars/latest?${queryParams.toString()}`
    )

    const result = new Map<string, Bar>()
    if (data.bars) {
      for (const [symbol, bar] of Object.entries(data.bars)) {
        result.set(symbol, bar)
      }
    }
    return result
  }
}

export function createAlpacaClient(): AlpacaClient {
  const apiKey = process.env.ALPACA_API_KEY
  const secretKey = process.env.ALPACA_SECRET_KEY
  const paper = (process.env.ALPACA_PAPER ?? 'true') === 'true'

  if (!apiKey || !secretKey) {
    throw new Error('ALPACA_API_KEY and ALPACA_SECRET_KEY environment variables are required')
  }

  return new AlpacaClient({ apiKey, secretKey, paper })
}

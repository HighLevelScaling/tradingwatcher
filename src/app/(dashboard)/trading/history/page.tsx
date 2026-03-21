"use client"

import { useEffect, useState } from 'react'
import { History, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react'

interface Trade {
  id: string
  symbol: string
  side: 'BUY' | 'SELL'
  qty: number
  entryPrice: number
  exitPrice?: number | null
  stopLoss?: number | null
  takeProfit?: number | null
  status: 'OPEN' | 'CLOSED' | 'CANCELLED'
  mode: 'PAPER' | 'LIVE'
  pnl?: number | null
  pnlPct?: number | null
  strategy: string
  timeframe: string
  createdAt: string
  exitAt?: string | null
  agent?: { name: string; type: string } | null
}

export default function TradeHistoryPage() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL')
  const [mode, setMode] = useState<'PAPER' | 'LIVE'>('PAPER')

  useEffect(() => {
    const params = new URLSearchParams({ limit: '200', mode })
    if (filter !== 'ALL') params.set('status', filter)

    fetch(`/api/trading/trades?${params}`)
      .then((r) => r.json())
      .then((data: { trades: Trade[] }) => setTrades(data.trades ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filter, mode])

  const closedTrades = trades.filter((t) => t.status === 'CLOSED')
  const totalPnl = closedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0)
  const winners = closedTrades.filter((t) => (t.pnl ?? 0) > 0)
  const losers = closedTrades.filter((t) => (t.pnl ?? 0) <= 0)
  const winRate = closedTrades.length > 0 ? winners.length / closedTrades.length : 0
  const avgWin = winners.length > 0 ? winners.reduce((s, t) => s + (t.pnl ?? 0), 0) / winners.length : 0
  const avgLoss = losers.length > 0 ? losers.reduce((s, t) => s + (t.pnl ?? 0), 0) / losers.length : 0

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <History className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Trade History</h1>
            <p className="text-xs text-slate-500">{trades.length} trades · {closedTrades.length} closed</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          {(['ALL', 'OPEN', 'CLOSED'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  : 'bg-[#1e1e2e] text-slate-400 border border-transparent hover:bg-[#2e2e45]'
              }`}
            >
              {f}
            </button>
          ))}
          <span className="text-xs text-slate-600 mx-1">|</span>
          {(['PAPER', 'LIVE'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                mode === m
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  : 'bg-[#1e1e2e] text-slate-400 border border-transparent hover:bg-[#2e2e45]'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total P&L', value: `${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}`, color: totalPnl >= 0 ? 'text-green-400' : 'text-red-400' },
          { label: 'Win Rate', value: `${(winRate * 100).toFixed(1)}%`, color: winRate >= 0.5 ? 'text-green-400' : 'text-red-400' },
          { label: 'Winners', value: `${winners.length}`, color: 'text-green-400' },
          { label: 'Losers', value: `${losers.length}`, color: 'text-red-400' },
          { label: 'Avg Win / Loss', value: `${avgWin.toFixed(2)} / ${avgLoss.toFixed(2)}`, color: 'text-slate-300' },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#0d0d14] border border-[#1e1e2e] rounded-xl p-3">
            <p className={`text-lg font-bold tabular-nums ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Trade table */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : trades.length === 0 ? (
        <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-8 text-center text-slate-500">
          <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No trades yet</p>
        </div>
      ) : (
        <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1e1e2e] text-slate-500">
                  <th className="text-left p-3 font-medium">Symbol</th>
                  <th className="text-left p-3 font-medium">Side</th>
                  <th className="text-right p-3 font-medium">Qty</th>
                  <th className="text-right p-3 font-medium">Entry</th>
                  <th className="text-right p-3 font-medium">Exit</th>
                  <th className="text-right p-3 font-medium">P&L</th>
                  <th className="text-right p-3 font-medium">P&L %</th>
                  <th className="text-left p-3 font-medium">Strategy</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.id} className="border-b border-[#1e1e2e]/50 hover:bg-[#12121a]">
                    <td className="p-3 font-medium text-white">{trade.symbol}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 ${trade.side === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                        {trade.side === 'BUY' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {trade.side}
                      </span>
                    </td>
                    <td className="p-3 text-right text-slate-300 tabular-nums">{trade.qty.toFixed(4)}</td>
                    <td className="p-3 text-right text-slate-300 tabular-nums">{trade.entryPrice.toFixed(2)}</td>
                    <td className="p-3 text-right text-slate-300 tabular-nums">
                      {trade.exitPrice != null ? trade.exitPrice.toFixed(2) : '—'}
                    </td>
                    <td className={`p-3 text-right tabular-nums font-medium ${
                      (trade.pnl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {trade.pnl != null ? `${trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}` : '—'}
                    </td>
                    <td className={`p-3 text-right tabular-nums ${
                      (trade.pnlPct ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {trade.pnlPct != null ? `${trade.pnlPct >= 0 ? '+' : ''}${trade.pnlPct.toFixed(2)}%` : '—'}
                    </td>
                    <td className="p-3 text-slate-400">{trade.strategy}</td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        trade.status === 'OPEN' ? 'bg-yellow-500/10 text-yellow-400' :
                        trade.status === 'CLOSED' ? 'bg-slate-500/10 text-slate-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {trade.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500">{new Date(trade.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

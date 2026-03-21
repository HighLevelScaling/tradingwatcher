"use client"

import { useEffect, useState } from 'react'
import { FlaskConical, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react'

interface Backtest {
  id: string
  strategy: string
  startDate: string
  endDate: string
  totalReturn: number
  maxDrawdown: number
  sharpeRatio: number
  winRate: number
  totalTrades: number
  config: Record<string, unknown>
  results: {
    bestConfig?: Record<string, unknown>
    pnls?: number[]
    avgReturn?: number
  }
  createdAt: string
  agent?: { name: string } | null
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[#12121a] border border-[#2e2e45] rounded-xl p-3">
      <p className={`text-lg font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}

export default function BacktestsPage() {
  const [backtests, setBacktests] = useState<Backtest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/trading/backtests')
      .then((r) => r.json())
      .then((data: { backtests: Backtest[] }) => {
        setBacktests(data.backtests ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
          <FlaskConical className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Backtests</h1>
          <p className="text-xs text-slate-500">{backtests.length} backtest run{backtests.length !== 1 ? 's' : ''} recorded</p>
        </div>
      </div>

      {backtests.length === 0 ? (
        <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-8 text-center text-slate-500">
          <FlaskConical className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No backtests recorded yet</p>
          <p className="text-xs mt-1">The Learning Agent runs backtests automatically after every 10 closed trades</p>
        </div>
      ) : (
        <div className="space-y-4">
          {backtests.map((bt) => (
            <div key={bt.id} className="bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-5">
              {/* Header row */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-semibold text-white capitalize">{bt.strategy} Strategy</span>
                    {bt.agent && (
                      <span className="text-[10px] bg-[#1e1e2e] text-slate-400 px-2 py-0.5 rounded-full">
                        {bt.agent.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(bt.startDate).toLocaleDateString()} — {new Date(bt.endDate).toLocaleDateString()}
                    {' · '}
                    {bt.totalTrades} trades
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Created</p>
                  <p className="text-xs text-slate-400">{new Date(bt.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <StatCard
                  label="Total Return"
                  value={`${bt.totalReturn >= 0 ? '+' : ''}${(bt.totalReturn * 100).toFixed(2)}%`}
                  color={bt.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}
                />
                <StatCard
                  label="Sharpe Ratio"
                  value={bt.sharpeRatio.toFixed(2)}
                  color={bt.sharpeRatio >= 1 ? 'text-green-400' : bt.sharpeRatio >= 0 ? 'text-yellow-400' : 'text-red-400'}
                />
                <StatCard
                  label="Win Rate"
                  value={`${(bt.winRate * 100).toFixed(1)}%`}
                  color={bt.winRate >= 0.5 ? 'text-green-400' : 'text-red-400'}
                />
                <StatCard
                  label="Max Drawdown"
                  value={`${(bt.maxDrawdown * 100).toFixed(1)}%`}
                  color={bt.maxDrawdown < 0.1 ? 'text-green-400' : bt.maxDrawdown < 0.2 ? 'text-yellow-400' : 'text-red-400'}
                />
                <StatCard
                  label="Total Trades"
                  value={String(bt.totalTrades)}
                  color="text-slate-300"
                />
              </div>

              {/* P&L distribution mini chart */}
              {bt.results?.pnls && bt.results.pnls.length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] text-slate-500 mb-2">Trade P&L Distribution</p>
                  <div className="flex items-end gap-px h-12">
                    {bt.results.pnls.slice(-50).map((pnl, i) => {
                      const maxAbs = Math.max(...bt.results.pnls!.map(Math.abs), 1)
                      const height = Math.max(2, (Math.abs(pnl) / maxAbs) * 48)
                      return (
                        <div
                          key={i}
                          className="flex-1 min-w-[2px] rounded-t-sm"
                          style={{
                            height: `${height}px`,
                            backgroundColor: pnl >= 0 ? '#22c55e' : '#ef4444',
                            opacity: 0.6,
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Optimized config */}
              {bt.results?.bestConfig && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-slate-500">Optimized params:</span>
                  {Object.entries(bt.results.bestConfig).map(([key, val]) => (
                    <span key={key} className="text-[10px] bg-[#1e1e2e] text-slate-400 px-2 py-0.5 rounded-full">
                      {key}: {String(val)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

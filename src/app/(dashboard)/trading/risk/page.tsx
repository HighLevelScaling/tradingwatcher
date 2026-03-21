"use client"

import { useEffect, useState } from 'react'
import { Shield, AlertTriangle, TrendingDown, Wallet, XCircle } from 'lucide-react'

interface OpenPosition {
  id: string
  symbol: string
  side: 'BUY' | 'SELL'
  qty: number
  entryPrice: number
  stopLoss: number | null
  takeProfit: number | null
  pnl: number | null
  mode: 'PAPER' | 'LIVE'
  strategy: string
  createdAt: string
  agent?: { name: string } | null
}

interface RiskSummary {
  openPositions: number
  totalExposure: number
  unrealizedPnl: number
  dayPnl: number
  equity: number
  maxPositions: number
  dailyLossLimit: number
  riskPerTrade: number
  dailyLossPct: number
}

export default function RiskDashboardPage() {
  const [positions, setPositions] = useState<OpenPosition[]>([])
  const [summary, setSummary] = useState<RiskSummary>({
    openPositions: 0, totalExposure: 0, unrealizedPnl: 0,
    dayPnl: 0, equity: 0, maxPositions: 5, dailyLossLimit: -3,
    riskPerTrade: 2, dailyLossPct: 0,
  })
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState<string | null>(null)

  const loadData = async () => {
    try {
      const [tradesRes, pnlRes] = await Promise.allSettled([
        fetch('/api/trading/trades?status=OPEN&limit=50'),
        fetch('/api/trading/pnl?hours=24'),
      ])

      if (tradesRes.status === 'fulfilled' && tradesRes.value.ok) {
        const data = await tradesRes.value.json() as { trades: OpenPosition[] }
        setPositions(data.trades ?? [])

        const totalExposure = (data.trades ?? []).reduce(
          (s, t) => s + t.qty * t.entryPrice, 0
        )
        const unrealizedPnl = (data.trades ?? []).reduce(
          (s, t) => s + (t.pnl ?? 0), 0
        )

        setSummary((prev) => ({
          ...prev,
          openPositions: data.trades?.length ?? 0,
          totalExposure,
          unrealizedPnl,
        }))
      }

      if (pnlRes.status === 'fulfilled' && pnlRes.value.ok) {
        const data = await pnlRes.value.json() as {
          summary: { dayPnl: number; equity: number }
        }
        if (data.summary) {
          const dayPnlPct = data.summary.equity > 0
            ? (data.summary.dayPnl / data.summary.equity) * 100
            : 0
          setSummary((prev) => ({
            ...prev,
            dayPnl: data.summary.dayPnl,
            equity: data.summary.equity,
            dailyLossPct: dayPnlPct,
          }))
        }
      }
    } catch {
      // Silent failure
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleClosePosition = async (tradeId: string) => {
    setClosing(tradeId)
    try {
      await fetch(`/api/trading/trades`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeId }),
      })
      await loadData()
    } catch {
      // Silent failure
    } finally {
      setClosing(null)
    }
  }

  const dailyLimitBreached = summary.dailyLossPct <= summary.dailyLossLimit
  const positionLimitNear = summary.openPositions >= summary.maxPositions - 1

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Risk Manager</h1>
          <p className="text-xs text-slate-500">Monitor exposure, manage positions, track risk limits</p>
        </div>
      </div>

      {/* Alerts */}
      {(dailyLimitBreached || positionLimitNear) && (
        <div className="space-y-2">
          {dailyLimitBreached && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-400">Daily loss limit breached</p>
                <p className="text-xs text-red-400/70">
                  Day P&L: {summary.dailyLossPct.toFixed(2)}% (limit: {summary.dailyLossLimit}%). New trades are blocked.
                </p>
              </div>
            </div>
          )}
          {positionLimitNear && (
            <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />
              <p className="text-sm text-yellow-400">
                Position limit near: {summary.openPositions}/{summary.maxPositions}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Risk metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            icon: Wallet,
            label: 'Account Equity',
            value: `$${summary.equity.toFixed(2)}`,
            color: 'text-slate-300',
          },
          {
            icon: TrendingDown,
            label: 'Day P&L',
            value: `${summary.dayPnl >= 0 ? '+' : ''}$${summary.dayPnl.toFixed(2)} (${summary.dailyLossPct.toFixed(2)}%)`,
            color: summary.dayPnl >= 0 ? 'text-green-400' : 'text-red-400',
          },
          {
            icon: Shield,
            label: 'Open Positions',
            value: `${summary.openPositions} / ${summary.maxPositions}`,
            color: positionLimitNear ? 'text-yellow-400' : 'text-green-400',
          },
          {
            icon: AlertTriangle,
            label: 'Total Exposure',
            value: `$${summary.totalExposure.toFixed(2)}`,
            color: 'text-slate-300',
          },
        ].map((metric) => (
          <div key={metric.label} className="bg-[#0d0d14] border border-[#1e1e2e] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <metric.icon className="w-4 h-4 text-slate-500" />
              <span className="text-[10px] text-slate-500">{metric.label}</span>
            </div>
            <p className={`text-lg font-bold tabular-nums ${metric.color}`}>{metric.value}</p>
          </div>
        ))}
      </div>

      {/* Risk parameters */}
      <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-white mb-3">Risk Parameters</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Risk per Trade', value: `${summary.riskPerTrade}%` },
            { label: 'Max Positions', value: String(summary.maxPositions) },
            { label: 'Daily Loss Limit', value: `${summary.dailyLossLimit}%` },
          ].map((param) => (
            <div key={param.label} className="flex justify-between items-center bg-[#12121a] rounded-lg p-3">
              <span className="text-xs text-slate-500">{param.label}</span>
              <span className="text-sm font-medium text-white">{param.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Open positions */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">Open Positions</h2>
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : positions.length === 0 ? (
          <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-6 text-center text-slate-500">
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No open positions</p>
          </div>
        ) : (
          <div className="space-y-2">
            {positions.map((pos) => (
              <div key={pos.id} className="bg-[#0d0d14] border border-[#1e1e2e] rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-sm font-medium text-white">{pos.symbol}</span>
                    <span className={`ml-2 text-xs ${pos.side === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                      {pos.side}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    <span>Qty: {pos.qty.toFixed(4)}</span>
                    <span className="mx-2">|</span>
                    <span>Entry: {pos.entryPrice.toFixed(2)}</span>
                    {pos.stopLoss && <><span className="mx-2">|</span><span className="text-red-400/60">SL: {pos.stopLoss.toFixed(2)}</span></>}
                    {pos.takeProfit && <><span className="mx-2">|</span><span className="text-green-400/60">TP: {pos.takeProfit.toFixed(2)}</span></>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-500">{pos.strategy}</span>
                  <span className={`text-sm font-medium tabular-nums ${(pos.pnl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {pos.pnl != null ? `${pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)}` : '—'}
                  </span>
                  <button
                    onClick={() => handleClosePosition(pos.id)}
                    disabled={closing === pos.id}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-3 h-3" />
                    Close
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

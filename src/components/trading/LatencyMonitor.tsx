"use client"

import { useEffect, useState } from "react"
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from "lucide-react"

interface ExchangeLatency {
  exchangeId: string
  name: string
  lastLatencyMs: number | null
  lastLatencyAt: string | null
  isPrimary: boolean
  sandbox: boolean
}

interface LatencyData {
  exchanges: ExchangeLatency[]
  history: Array<{ exchangeId: string; latencyMs: number; tier: string; measuredAt: string }>
}

type Tier = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'UNREACHABLE' | 'UNKNOWN'

function getTier(ms: number | null): Tier {
  if (ms === null) return 'UNKNOWN'
  if (ms < 100)  return 'EXCELLENT'
  if (ms < 250)  return 'GOOD'
  if (ms < 500)  return 'FAIR'
  if (ms < 9000) return 'POOR'
  return 'UNREACHABLE'
}

const TIER_CONFIG: Record<Tier, { color: string; bar: string; label: string; dot: string }> = {
  EXCELLENT:   { color: "text-green-400",  bar: "bg-green-400",   label: "Excellent",   dot: "bg-green-400" },
  GOOD:        { color: "text-emerald-400",bar: "bg-emerald-400", label: "Good",        dot: "bg-emerald-400" },
  FAIR:        { color: "text-yellow-400", bar: "bg-yellow-400",  label: "Fair",        dot: "bg-yellow-400" },
  POOR:        { color: "text-red-400",    bar: "bg-red-400",     label: "Poor",        dot: "bg-red-400" },
  UNREACHABLE: { color: "text-slate-500",  bar: "bg-slate-600",   label: "Unreachable", dot: "bg-slate-600" },
  UNKNOWN:     { color: "text-slate-500",  bar: "bg-slate-700",   label: "Unknown",     dot: "bg-slate-700" },
}

// Width % for latency bar (max 500ms = 100%)
function barWidth(ms: number | null): number {
  if (!ms) return 0
  return Math.min(100, (ms / 500) * 100)
}

function timeAgo(iso: string | null): string {
  if (!iso) return "never"
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  return `${Math.floor(secs / 3600)}h ago`
}

export default function LatencyMonitor() {
  const [data, setData] = useState<LatencyData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const res = await fetch("/api/trading/latency")
      if (res.ok) setData(await res.json())
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [])

  const exchanges = data?.exchanges ?? []
  const arbReady = exchanges.filter((e) => e.lastLatencyMs !== null && e.lastLatencyMs < 500).length >= 2

  // Derive slowest exchange
  const sorted = [...exchanges].sort((a, b) => (b.lastLatencyMs ?? 0) - (a.lastLatencyMs ?? 0))
  const bottleneck = sorted[0]

  return (
    <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Exchange Latency</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Arb readiness indicator */}
          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
            arbReady
              ? "bg-green-500/10 text-green-400 border-green-500/20"
              : "bg-red-500/10 text-red-400 border-red-500/20"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${arbReady ? "bg-green-400" : "bg-red-400"}`} />
            {arbReady ? "Arb Ready" : "Not Ready"}
          </span>
          <button onClick={load} className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-[#1e1e2e] transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2].map((i) => <div key={i} className="h-12 bg-[#1e1e2e] rounded-xl" />)}
        </div>
      ) : exchanges.length === 0 ? (
        <div className="text-center py-4 text-slate-600 text-sm">
          No exchanges configured
        </div>
      ) : (
        <div className="space-y-2">
          {exchanges.map((ex) => {
            const tier = getTier(ex.lastLatencyMs)
            const cfg = TIER_CONFIG[tier]
            return (
              <div key={ex.exchangeId} className="bg-[#12121a] rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className="text-sm font-medium text-white">{ex.name}</span>
                    {ex.isPrimary && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Primary
                      </span>
                    )}
                    {ex.sandbox && (
                      <span className="text-xs text-slate-600">testnet</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold tabular-nums ${cfg.color}`}>
                      {ex.lastLatencyMs !== null ? `${Math.round(ex.lastLatencyMs)}ms` : "—"}
                    </span>
                    <span className="text-xs text-slate-600 ml-1.5">{cfg.label}</span>
                  </div>
                </div>
                {/* Latency bar */}
                <div className="h-1.5 bg-[#1e1e2e] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`}
                    style={{ width: `${barWidth(ex.lastLatencyMs)}%` }}
                  />
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  {ex.lastLatencyAt ? `Measured ${timeAgo(ex.lastLatencyAt)}` : "Not yet measured — will update on first agent cycle"}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Bottleneck warning */}
      {bottleneck && bottleneck.lastLatencyMs !== null && bottleneck.lastLatencyMs >= 500 && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="text-xs text-red-400">
            <span className="font-semibold">{bottleneck.name}</span> latency is &gt;500ms.
            Arbitrage legs involving this exchange are being skipped to prevent partial fills.
          </div>
        </div>
      )}

      {/* How it affects arb */}
      {!loading && exchanges.length >= 2 && (
        <div className="text-xs text-slate-500 pt-1 border-t border-[#1e1e2e] space-y-0.5">
          <p>→ Arb skipped if leg imbalance &gt;300ms between exchanges</p>
          <p>→ Spread threshold increases by 0.05–0.20% per FAIR/POOR leg</p>
          <p>→ POOR (&gt;500ms) exchange legs are never used for arbitrage</p>
        </div>
      )}

      {exchanges.length < 2 && (
        <div className="flex items-center gap-2 text-xs text-slate-500 pt-1 border-t border-[#1e1e2e]">
          <WifiOff className="w-3.5 h-3.5" />
          Add a second exchange to enable cross-exchange arbitrage
        </div>
      )}
    </div>
  )
}

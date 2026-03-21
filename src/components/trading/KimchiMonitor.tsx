"use client"

import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"

interface KimchiReading {
  premiumPct: number
  btcKrw: number
  btcUsdt: number
  krwPerUsdt: number
  signal: string
  label: string
  createdAt: string
}

interface KimchiData {
  latest: KimchiReading | null
  history: Array<{ premiumPct: number; signal: string; createdAt: string }>
}

const SIGNAL_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.ElementType; label: string }> = {
  STRONG_BULL: { color: "text-green-300",  bg: "bg-green-500/20",  border: "border-green-500/40",  icon: TrendingUp,   label: "Strong Bull" },
  BULL:        { color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20",  icon: TrendingUp,   label: "Bull" },
  NEUTRAL:     { color: "text-slate-300",  bg: "bg-slate-500/10",  border: "border-slate-500/20",  icon: Minus,        label: "Neutral" },
  BEAR:        { color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20",    icon: TrendingDown, label: "Bear" },
  STRONG_BEAR: { color: "text-red-300",    bg: "bg-red-500/20",    border: "border-red-500/40",    icon: TrendingDown, label: "Strong Bear" },
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
}

export default function KimchiMonitor() {
  const [data, setData] = useState<KimchiData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const res = await fetch("/api/trading/kimchi?hours=6")
      if (res.ok) setData(await res.json())
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [])

  const latest = data?.latest
  const cfg = latest ? (SIGNAL_CONFIG[latest.signal] ?? SIGNAL_CONFIG.NEUTRAL) : null
  const Icon = cfg?.icon ?? Minus

  const chartData = (data?.history ?? []).map((h) => ({
    time: formatTime(h.createdAt),
    premium: h.premiumPct,
    signal: h.signal,
  }))

  const isPremiumPositive = (latest?.premiumPct ?? 0) >= 0

  return (
    <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Kimchi Premium</span>
          <p className="text-xs text-slate-600 mt-0.5">Upbit (KRW) vs Binance — leading indicator</p>
        </div>
        <button onClick={load} className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-[#1e1e2e] transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && !data ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-10 bg-[#1e1e2e] rounded-xl" />
          <div className="h-24 bg-[#1e1e2e] rounded-xl" />
        </div>
      ) : !latest ? (
        <div className="text-center py-6 text-slate-600 text-sm">
          No data yet — starts collecting on first agent cycle
        </div>
      ) : (
        <>
          {/* Signal badge + premium value */}
          <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${cfg?.bg} ${cfg?.border}`}>
            <div className="flex items-center gap-2">
              <Icon className={`w-5 h-5 ${cfg?.color}`} />
              <div>
                <div className={`text-sm font-bold ${cfg?.color}`}>{cfg?.label}</div>
                <div className="text-xs text-slate-500 mt-0.5 max-w-[200px] truncate">{latest.label}</div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold tabular-nums ${isPremiumPositive ? "text-green-400" : "text-red-400"}`}>
                {isPremiumPositive ? "+" : ""}{latest.premiumPct.toFixed(2)}%
              </div>
              <div className="text-xs text-slate-500">Upbit premium</div>
            </div>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#12121a] rounded-xl p-2.5">
              <div className="text-xs text-slate-500 mb-0.5">BTC on Upbit</div>
              <div className="text-sm font-semibold text-white">
                ₩{latest.btcKrw.toLocaleString()}
              </div>
              <div className="text-xs text-slate-600">
                ≈ ${(latest.btcKrw / latest.krwPerUsdt).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="bg-[#12121a] rounded-xl p-2.5">
              <div className="text-xs text-slate-500 mb-0.5">BTC on Binance</div>
              <div className="text-sm font-semibold text-white">
                ${latest.btcUsdt.toLocaleString()}
              </div>
              <div className="text-xs text-slate-600">
                KRW/USDT: {latest.krwPerUsdt.toFixed(1)}
              </div>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 2 && (
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="kimchiGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isPremiumPositive ? "#22c55e" : "#ef4444"} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={isPremiumPositive ? "#22c55e" : "#ef4444"} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(1)}%`} />
                  <Tooltip
                    contentStyle={{ background: "#12121a", border: "1px solid #2e2e45", borderRadius: 8, fontSize: 11 }}
                    formatter={((v: number) => [`${v.toFixed(2)}%`, "Premium"]) as never}
                  />
                  <ReferenceLine y={0} stroke="#334155" strokeDasharray="3 3" />
                  <ReferenceLine y={1.5} stroke="#22c55e" strokeDasharray="2 2" strokeOpacity={0.4} label={{ value: "Bull", fill: "#22c55e", fontSize: 9 }} />
                  <ReferenceLine y={-1} stroke="#ef4444" strokeDasharray="2 2" strokeOpacity={0.4} label={{ value: "Bear", fill: "#ef4444", fontSize: 9 }} />
                  <Area
                    type="monotone"
                    dataKey="premium"
                    stroke={isPremiumPositive ? "#22c55e" : "#ef4444"}
                    strokeWidth={1.5}
                    fill="url(#kimchiGrad)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* How it affects trades */}
          <div className="text-xs text-slate-500 pt-1 border-t border-[#1e1e2e]">
            {latest.signal === 'STRONG_BULL' && "→ Long signals boosted +20%, short signals vetoed"}
            {latest.signal === 'BULL'        && "→ Long signals boosted +10%, sizing increased"}
            {latest.signal === 'NEUTRAL'     && "→ No directional adjustment to signals"}
            {latest.signal === 'BEAR'        && "→ Long signals reduced -10%, caution"}
            {latest.signal === 'STRONG_BEAR' && "→ Long signals vetoed, short signals boosted +20%"}
          </div>
        </>
      )}
    </div>
  )
}

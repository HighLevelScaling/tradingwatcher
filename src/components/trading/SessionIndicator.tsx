"use client"

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"

interface Session {
  name: string
  label: string
  description: string
  signalThreshold: number
  arbMinSpreadPct: number
  sizingMultiplier: number
  volatilityProfile: string
  dominantExchanges: string[]
}

interface SessionData {
  current: Session
  next: Session
  minsUntilNext: number
  utcTime: string
}

const VOLATILITY_COLOR: Record<string, string> = {
  VERY_HIGH: "text-red-400",
  HIGH:      "text-orange-400",
  MEDIUM:    "text-yellow-400",
  LOW:       "text-slate-400",
}

const SIZING_COLOR = (m: number) =>
  m >= 1.1 ? "text-green-400" : m >= 1.0 ? "text-slate-300" : "text-orange-400"

export default function SessionIndicator() {
  const [data, setData] = useState<SessionData | null>(null)
  const [utcNow, setUtcNow] = useState(new Date())

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/trading/sessions")
        if (res.ok) setData(await res.json())
      } catch { /* ignore */ }
    }
    load()
    const dataInterval = setInterval(load, 60_000)
    const clockInterval = setInterval(() => setUtcNow(new Date()), 1000)
    return () => { clearInterval(dataInterval); clearInterval(clockInterval) }
  }, [])

  if (!data) return (
    <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-4 animate-pulse">
      <div className="h-4 bg-[#1e1e2e] rounded w-32 mb-2" />
      <div className="h-6 bg-[#1e1e2e] rounded w-24" />
    </div>
  )

  const { current, next, minsUntilNext } = data
  const hours = Math.floor(minsUntilNext / 60)
  const mins = minsUntilNext % 60
  const countdown = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`

  return (
    <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Trading Session</span>
        </div>
        <span className="text-xs text-slate-500 font-mono">
          {utcNow.toUTCString().slice(17, 25)} UTC
        </span>
      </div>

      {/* Current session */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white font-bold text-sm">{current.label}</span>
          <span className={`text-xs font-semibold ${VOLATILITY_COLOR[current.volatilityProfile] ?? "text-slate-400"}`}>
            {current.volatilityProfile.replace("_", " ")}
          </span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">{current.description}</p>
      </div>

      {/* Agent parameters for this session */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#12121a] rounded-xl p-2.5 text-center">
          <div className="text-xs text-slate-500 mb-0.5">Signal Min</div>
          <div className="text-sm font-bold text-white">{(current.signalThreshold * 100).toFixed(0)}%</div>
        </div>
        <div className="bg-[#12121a] rounded-xl p-2.5 text-center">
          <div className="text-xs text-slate-500 mb-0.5">Arb Spread</div>
          <div className="text-sm font-bold text-white">{current.arbMinSpreadPct.toFixed(2)}%</div>
        </div>
        <div className="bg-[#12121a] rounded-xl p-2.5 text-center">
          <div className="text-xs text-slate-500 mb-0.5">Sizing</div>
          <div className={`text-sm font-bold ${SIZING_COLOR(current.sizingMultiplier)}`}>
            {current.sizingMultiplier.toFixed(1)}x
          </div>
        </div>
      </div>

      {/* Dominant exchanges */}
      {current.dominantExchanges.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-slate-500">Active:</span>
          {current.dominantExchanges.map((ex) => (
            <span key={ex} className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 text-xs">
              {ex}
            </span>
          ))}
        </div>
      )}

      {/* Next session */}
      <div className="flex items-center justify-between pt-1 border-t border-[#1e1e2e]">
        <span className="text-xs text-slate-500">Next: <span className="text-slate-300">{next.label}</span></span>
        <span className="text-xs text-slate-500">in <span className="text-slate-300 font-mono">{countdown}</span></span>
      </div>
    </div>
  )
}

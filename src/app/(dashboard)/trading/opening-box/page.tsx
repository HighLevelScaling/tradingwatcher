"use client"

import { useCallback, useEffect, useState } from "react"
import {
  TrendingUp, TrendingDown, Minus, RefreshCw, Clock,
  Target, ShieldAlert, ArrowUpRight, ArrowDownRight,
  CheckCircle2, XCircle, AlertCircle, BarChart2
} from "lucide-react"
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell
} from "recharts"

// ─── Types ────────────────────────────────────────────────────────────────────

interface OBTrade {
  id: string
  date: string
  symbol: string
  mode: string
  status: string
  boxTop: number | null
  boxBottom: number | null
  boxRange: number | null
  openCandleTime: string | null
  breakoutDirection: string | null
  breakoutTime: string | null
  retracementCandles: number
  entryPrice: number | null
  stopLoss: number | null
  takeProfit: number | null
  entryFillPrice: number | null
  exitPrice: number | null
  pnl: number | null
  pnlPct: number | null
  exitReason: string | null
  entryAt: string | null
  exitAt: string | null
}

interface OBStats {
  total: number
  wins: number
  losses: number
  invalidated: number
  winRate: number
  avgWinPct: number
  avgLossPct: number
  totalPnlPct: number
  expectancy: number
  largestWinPct: number
  largestLossPct: number
}

interface OBData {
  today: OBTrade[]
  history: OBTrade[]
  stats: OBStats
  symbol: string
  mode: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SYMBOLS = ["QQQ/USD"]

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  WAITING_OPEN_CANDLE:  { label: "Waiting for open candle",  color: "text-slate-400",  bg: "bg-slate-500/10",  border: "border-slate-500/20", icon: Clock },
  WAITING_BREAKOUT:     { label: "Box set — watching for breakout", color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20",  icon: BarChart2 },
  WAITING_RETRACEMENT:  { label: "Breakout! Awaiting retracement",  color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20", icon: ArrowDownRight },
  IN_TRADE:             { label: "In trade",                  color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20", icon: TrendingUp },
  DONE:                 { label: "Done for today",            color: "text-slate-500",  bg: "bg-slate-500/10",  border: "border-slate-500/20", icon: CheckCircle2 },
}

const EXIT_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  TP:          { label: "Take Profit ✓",  color: "text-green-400",  icon: CheckCircle2 },
  SL:          { label: "Stop Loss ✗",   color: "text-red-400",    icon: XCircle },
  INVALIDATED: { label: "Invalidated",   color: "text-slate-500",  icon: AlertCircle },
}

function pct(n: number | null, dp = 2) {
  if (n === null) return "—"
  return `${n >= 0 ? "+" : ""}${n.toFixed(dp)}%`
}

function price(n: number | null, dp = 4) {
  if (n === null) return "—"
  return n.toFixed(dp)
}

// ─── Box Diagram ──────────────────────────────────────────────────────────────

function BoxDiagram({ trade }: { trade: OBTrade }) {
  if (!trade.boxTop || !trade.boxBottom || !trade.boxRange) return null

  const dir = trade.breakoutDirection
  const isLong = dir === "LONG"

  // Normalise levels to 0–100 within a view window of 3× the box range
  const viewMin = trade.boxBottom - trade.boxRange * 0.8
  const viewMax = trade.boxTop + trade.boxRange * 2.5
  const viewRange = viewMax - viewMin
  const toY = (v: number) => ((viewMax - v) / viewRange) * 100  // invert: higher = lower y%

  const levels = {
    tp:     trade.takeProfit,
    entry:  trade.entryPrice,
    boxTop: trade.boxTop,
    mid:    (trade.boxTop + trade.boxBottom) / 2,
    sl45:   trade.stopLoss,
    boxBot: trade.boxBottom,
  }

  return (
    <div className="relative bg-[#08080f] rounded-xl overflow-hidden" style={{ height: 240 }}>
      {/* Box fill */}
      <div
        className="absolute left-8 right-4 bg-indigo-500/10 border-y border-indigo-500/30"
        style={{
          top: `${toY(trade.boxTop)}%`,
          height: `${(trade.boxRange / viewRange) * 100}%`,
        }}
      />

      {/* TP line */}
      {levels.tp && (
        <div className="absolute left-0 right-0 border-t border-dashed border-green-500/60 flex items-center"
          style={{ top: `${toY(levels.tp)}%` }}>
          <span className="text-[9px] text-green-400 pl-1">TP {price(levels.tp)}</span>
        </div>
      )}

      {/* Entry line */}
      {levels.entry && (
        <div className="absolute left-0 right-0 border-t-2 border-indigo-400 flex items-center"
          style={{ top: `${toY(levels.entry)}%` }}>
          <span className="text-[9px] text-indigo-400 pl-1">Entry {price(levels.entry)}</span>
        </div>
      )}

      {/* Box top */}
      <div className="absolute left-0 right-0 border-t border-slate-500/50 flex items-center justify-end"
        style={{ top: `${toY(trade.boxTop)}%` }}>
        <span className="text-[9px] text-slate-500 pr-1">Top {price(trade.boxTop)}</span>
      </div>

      {/* Mid / 50% line */}
      <div className="absolute left-0 right-0 border-t border-dashed border-slate-600/40"
        style={{ top: `${toY(levels.mid)}%` }}>
        <span className="text-[9px] text-slate-600 pl-1">50%</span>
      </div>

      {/* SL line (45%) */}
      {levels.sl45 && (
        <div className="absolute left-0 right-0 border-t border-dashed border-red-500/60 flex items-center"
          style={{ top: `${toY(levels.sl45)}%` }}>
          <span className="text-[9px] text-red-400 pl-1">SL 45% {price(levels.sl45)}</span>
        </div>
      )}

      {/* Box bottom */}
      <div className="absolute left-0 right-0 border-t border-slate-500/50 flex items-center justify-end"
        style={{ top: `${toY(trade.boxBottom)}%` }}>
        <span className="text-[9px] text-slate-500 pr-1">Bot {price(trade.boxBottom)}</span>
      </div>

      {/* Direction arrow */}
      {dir && (
        <div
          className={`absolute right-4 flex items-center gap-1 text-xs font-bold ${isLong ? "text-green-400" : "text-red-400"}`}
          style={{ top: `${toY(isLong ? trade.boxTop + trade.boxRange * 0.5 : trade.boxBottom - trade.boxRange * 0.5)}%` }}
        >
          {isLong ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          {dir}
        </div>
      )}

      {/* Entry fill marker */}
      {trade.entryFillPrice && (
        <div
          className="absolute right-4 w-3 h-3 rounded-full bg-indigo-400 border-2 border-white"
          style={{ top: `calc(${toY(trade.entryFillPrice)}% - 6px)` }}
          title={`Fill: ${price(trade.entryFillPrice)}`}
        />
      )}

      {/* Exit marker */}
      {trade.exitPrice && (
        <div
          className={`absolute right-4 w-3 h-3 rounded-full border-2 border-white ${trade.exitReason === "TP" ? "bg-green-400" : "bg-red-400"}`}
          style={{ top: `calc(${toY(trade.exitPrice)}% - 6px)` }}
          title={`Exit: ${price(trade.exitPrice)}`}
        />
      )}
    </div>
  )
}

// ─── Stats card ───────────────────────────────────────────────────────────────

function StatsPanel({ stats }: { stats: OBStats }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[
        { label: "Win Rate",     value: `${(stats.winRate * 100).toFixed(1)}%`,   sub: `${stats.wins}W / ${stats.losses}L`, color: stats.winRate >= 0.5 ? "text-green-400" : "text-red-400" },
        { label: "Expectancy",   value: pct(stats.expectancy),                     sub: "avg per trade",                     color: stats.expectancy >= 0 ? "text-green-400" : "text-red-400" },
        { label: "Avg Win",      value: pct(stats.avgWinPct),                      sub: `Best: ${pct(stats.largestWinPct)}`,  color: "text-green-400" },
        { label: "Avg Loss",     value: pct(stats.avgLossPct),                     sub: `Worst: ${pct(stats.largestLossPct)}`,color: "text-red-400" },
        { label: "Total Return", value: pct(stats.totalPnlPct, 1),                 sub: `${stats.total} trades`,             color: stats.totalPnlPct >= 0 ? "text-green-400" : "text-red-400" },
        { label: "Invalidated",  value: String(stats.invalidated),                 sub: "no retracement",                    color: "text-slate-500" },
      ].map((s) => (
        <div key={s.label} className="bg-[#12121a] rounded-xl p-3">
          <div className="text-xs text-slate-500 mb-1">{s.label}</div>
          <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
          <div className="text-xs text-slate-600">{s.sub}</div>
        </div>
      ))}
    </div>
  )
}

// ─── History table ────────────────────────────────────────────────────────────

function HistoryRow({ trade }: { trade: OBTrade }) {
  const exitCfg = trade.exitReason ? EXIT_CONFIG[trade.exitReason] : null
  const ExitIcon = exitCfg?.icon ?? Minus
  const isWin = (trade.pnlPct ?? 0) > 0

  return (
    <tr className="border-b border-[#1e1e2e] hover:bg-[#12121a] transition-colors text-sm">
      <td className="px-4 py-3 text-slate-400 font-mono text-xs">{trade.date}</td>
      <td className="px-4 py-3">
        {trade.breakoutDirection === "LONG"
          ? <span className="flex items-center gap-1 text-green-400"><TrendingUp className="w-3.5 h-3.5" /> Long</span>
          : trade.breakoutDirection === "SHORT"
          ? <span className="flex items-center gap-1 text-red-400"><TrendingDown className="w-3.5 h-3.5" /> Short</span>
          : <span className="text-slate-600">—</span>}
      </td>
      <td className="px-4 py-3 text-slate-300 font-mono text-xs">{price(trade.entryFillPrice)}</td>
      <td className="px-4 py-3 text-slate-300 font-mono text-xs">{price(trade.exitPrice)}</td>
      <td className="px-4 py-3">
        {exitCfg
          ? <span className={`flex items-center gap-1 ${exitCfg.color}`}><ExitIcon className="w-3.5 h-3.5" />{exitCfg.label}</span>
          : <span className="text-slate-600">—</span>}
      </td>
      <td className={`px-4 py-3 font-bold font-mono ${isWin ? "text-green-400" : trade.pnlPct !== null ? "text-red-400" : "text-slate-600"}`}>
        {pct(trade.pnlPct)}
      </td>
    </tr>
  )
}

// ─── PnL sparkline ───────────────────────────────────────────────────────────

function PnLSparkline({ history }: { history: OBTrade[] }) {
  const data = [...history].reverse().map((t, i) => ({
    i,
    date: t.date,
    pnl: t.pnlPct ?? 0,
    cum: 0,
  }))
  let cum = 0
  for (const d of data) { cum += d.pnl; d.cum = cum }

  return (
    <div className="h-32">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} tickFormatter={(v) => v.slice(5)} />
          <YAxis tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(1)}%`} />
          <Tooltip
            contentStyle={{ background: "#12121a", border: "1px solid #2e2e45", borderRadius: 8, fontSize: 11 }}
            formatter={((v: number, name: string) => [`${v.toFixed(2)}%`, name === "pnl" ? "Trade" : "Cumulative"]) as never}
          />
          <ReferenceLine y={0} stroke="#334155" strokeDasharray="3 3" />
          <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.pnl >= 0 ? "#22c55e" : "#ef4444"} fillOpacity={0.7} />
            ))}
          </Bar>
          <Line type="monotone" dataKey="cum" stroke="#818cf8" strokeWidth={1.5} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OpeningBoxPage() {
  const [symbol, setSymbol] = useState("BTC/USDT")
  const [mode] = useState<"PAPER" | "LIVE">("PAPER")
  const [data, setData] = useState<OBData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/trading/opening-box?symbol=${encodeURIComponent(symbol)}&mode=${mode}`)
      if (res.ok) setData(await res.json())
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [symbol, mode])

  useEffect(() => { load() }, [load])
  useEffect(() => { const t = setInterval(load, 30_000); return () => clearInterval(t) }, [load])

  const todayForSymbol = data?.today.find((t) => t.symbol === symbol)
  const statusCfg = todayForSymbol ? STATUS_CONFIG[todayForSymbol.status] : null
  const StatusIcon = statusCfg?.icon ?? Clock

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Opening Box Strategy</h1>
          <p className="text-sm text-slate-400 mt-1">
            One trade per day — first 5-min candle sets the box, breakout + retracement = entry
          </p>
        </div>
        <div className="flex items-center gap-2">
          {SYMBOLS.map((s) => (
            <button
              key={s}
              onClick={() => setSymbol(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${symbol === s ? "bg-indigo-500 text-white" : "bg-[#12121a] text-slate-400 hover:text-white border border-[#2e2e45]"}`}
            >
              {s.replace("/USDT", "")}
            </button>
          ))}
          <button onClick={load} className="p-2 text-slate-500 hover:text-white rounded-lg hover:bg-[#1e1e2e] transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Strategy rule summary */}
      <div className="bg-[#0d0d14] border border-[#2e2e45] rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-white mb-3">How it works</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { step: "1", icon: Clock,         color: "text-blue-400",  title: "Opening Box",     desc: "First 5-min candle wick marks the box top and bottom" },
            { step: "2", icon: BarChart2,     color: "text-violet-400",title: "Breakout",        desc: "First candle to close outside the box sets the direction" },
            { step: "3", icon: ArrowDownRight,color: "text-amber-400", title: "Retracement",     desc: "Next candle pulls back to the box edge — that's the entry" },
            { step: "4", icon: Target,        color: "text-green-400", title: "Trade",           desc: "SL at 45% inside the box · TP at 2× the box range" },
          ].map((s) => (
            <div key={s.step} className="flex gap-3">
              <div className={`w-8 h-8 rounded-xl bg-[#12121a] flex items-center justify-center shrink-0 ${s.color}`}>
                <s.icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">{s.title}</div>
                <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Today's status + box diagram */}
        <div className="lg:col-span-2 space-y-4">
          {/* Today's trade status */}
          {todayForSymbol ? (
            <div className={`bg-[#0d0d14] border rounded-2xl p-5 ${statusCfg?.border ?? "border-[#2e2e45]"}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <StatusIcon className={`w-5 h-5 ${statusCfg?.color}`} />
                  <span className="text-white font-semibold">{symbol} — Today</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusCfg?.bg} ${statusCfg?.border} ${statusCfg?.color}`}>
                  {statusCfg?.label ?? todayForSymbol.status}
                </span>
              </div>

              {/* Level grid */}
              {todayForSymbol.boxTop && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Box Top",    value: price(todayForSymbol.boxTop),    color: "text-slate-300" },
                    { label: "Box Bottom", value: price(todayForSymbol.boxBottom),  color: "text-slate-300" },
                    { label: "Box Range",  value: price(todayForSymbol.boxRange, 6),color: "text-slate-300" },
                    { label: "Entry",      value: price(todayForSymbol.entryPrice), color: "text-indigo-400" },
                    { label: "Stop Loss",  value: price(todayForSymbol.stopLoss),   color: "text-red-400" },
                    { label: "Take Profit",value: price(todayForSymbol.takeProfit), color: "text-green-400" },
                  ].map((l) => (
                    <div key={l.label} className="bg-[#12121a] rounded-xl p-2.5">
                      <div className="text-xs text-slate-500 mb-0.5">{l.label}</div>
                      <div className={`text-sm font-bold font-mono ${l.color}`}>{l.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Direction */}
              {todayForSymbol.breakoutDirection && (
                <div className={`flex items-center gap-2 mb-4 text-sm font-semibold ${todayForSymbol.breakoutDirection === "LONG" ? "text-green-400" : "text-red-400"}`}>
                  {todayForSymbol.breakoutDirection === "LONG"
                    ? <><ArrowUpRight className="w-4 h-4" /> Breakout: LONG — waiting for pullback to box top</>
                    : <><ArrowDownRight className="w-4 h-4" /> Breakout: SHORT — waiting for rally to box bottom</>}
                </div>
              )}

              {/* Exit result */}
              {todayForSymbol.exitReason && (
                <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                  todayForSymbol.exitReason === "TP" ? "bg-green-500/10 border-green-500/20" :
                  todayForSymbol.exitReason === "SL" ? "bg-red-500/10 border-red-500/20" :
                  "bg-slate-500/10 border-slate-500/20"
                }`}>
                  <span className={`text-sm font-bold ${
                    todayForSymbol.exitReason === "TP" ? "text-green-400" :
                    todayForSymbol.exitReason === "SL" ? "text-red-400" : "text-slate-400"
                  }`}>
                    {EXIT_CONFIG[todayForSymbol.exitReason]?.label ?? todayForSymbol.exitReason}
                  </span>
                  <span className={`text-xl font-bold font-mono ${(todayForSymbol.pnlPct ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {pct(todayForSymbol.pnlPct)}
                  </span>
                </div>
              )}

              {/* Box diagram */}
              <div className="mt-4">
                <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> Visual — levels diagram
                </div>
                <BoxDiagram trade={todayForSymbol} />
              </div>
            </div>
          ) : (
            <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-12 text-center">
              <Clock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">Waiting for today&apos;s opening candle</p>
              <p className="text-slate-600 text-sm mt-1">The first 5-min candle at 00:00 UTC will set the box</p>
            </div>
          )}

          {/* History table */}
          {data && data.history.length > 0 && (
            <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#1e1e2e]">
                <h2 className="text-sm font-semibold text-white">Trade History</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-slate-500 border-b border-[#1e1e2e]">
                      <th className="text-left px-4 py-3">Date</th>
                      <th className="text-left px-4 py-3">Direction</th>
                      <th className="text-left px-4 py-3">Entry</th>
                      <th className="text-left px-4 py-3">Exit</th>
                      <th className="text-left px-4 py-3">Result</th>
                      <th className="text-left px-4 py-3">PnL %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.history.map((t) => <HistoryRow key={t.id} trade={t} />)}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right: Stats + PnL chart */}
        <div className="space-y-4">
          {/* Stats */}
          {data && (
            <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-white mb-3">Strategy Stats ({symbol})</h2>
              {data.stats.total === 0 ? (
                <p className="text-slate-600 text-sm text-center py-4">No completed trades yet</p>
              ) : (
                <StatsPanel stats={data.stats} />
              )}
            </div>
          )}

          {/* PnL chart */}
          {data && data.history.length > 1 && (
            <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-white mb-3">Daily PnL + Cumulative</h2>
              <PnLSparkline history={data.history} />
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500/70 rounded-sm inline-block" /> Win</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500/70 rounded-sm inline-block" /> Loss</span>
                <span className="flex items-center gap-1"><span className="w-6 border-t border-indigo-400 inline-block" /> Cumulative</span>
              </div>
            </div>
          )}

          {/* All symbols today */}
          {data && data.today.length > 0 && (
            <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-white mb-3">All Symbols — Today</h2>
              <div className="space-y-2">
                {data.today.map((t) => {
                  const cfg = STATUS_CONFIG[t.status]
                  const Ic = cfg?.icon ?? Clock
                  return (
                    <div key={t.id} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${cfg?.bg} ${cfg?.border}`}>
                      <div className="flex items-center gap-2">
                        <Ic className={`w-3.5 h-3.5 ${cfg?.color}`} />
                        <span className="text-sm text-white font-medium">{t.symbol.replace("/USDT", "")}</span>
                      </div>
                      <div className="text-right">
                        {t.pnlPct !== null
                          ? <span className={`text-sm font-bold ${t.pnlPct >= 0 ? "text-green-400" : "text-red-400"}`}>{pct(t.pnlPct)}</span>
                          : <span className={`text-xs ${cfg?.color}`}>{cfg?.label}</span>
                        }
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

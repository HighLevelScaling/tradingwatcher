"use client"

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react'

type TradeSide = 'BUY' | 'SELL'
type TradeStatus = 'OPEN' | 'CLOSED' | 'CANCELLED'
type TradingMode = 'PAPER' | 'LIVE'

interface Trade {
  id: string
  symbol: string
  side: TradeSide
  qty: number
  entryPrice: number
  exitPrice?: number | null
  status: TradeStatus
  mode: TradingMode
  pnl?: number | null
  pnlPct?: number | null
  strategy: string
  timeframe: string
  createdAt: Date | string
  agent?: { name: string; type: string } | null
}

interface Props {
  trades: Trade[]
  mode?: 'PAPER' | 'LIVE' | 'ALL'
}

const STATUS_CONFIG: Record<TradeStatus, { label: string; className: string }> = {
  OPEN: { label: 'Open', className: 'bg-yellow-400/10 text-yellow-400' },
  CLOSED: { label: 'Closed', className: 'bg-slate-400/10 text-slate-400' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-400/10 text-red-400' },
}

function TradeRow({ trade }: { trade: Trade }) {
  const isBuy = trade.side === 'BUY'
  const hasPnl = trade.pnl !== null && trade.pnl !== undefined
  const isWin = hasPnl && (trade.pnl ?? 0) > 0
  const statusCfg = STATUS_CONFIG[trade.status]

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.25 }}
      className="flex items-center gap-3 py-3 px-4 hover:bg-[#12121a] transition-colors rounded-lg"
    >
      {/* Side icon */}
      <div
        className={`p-1.5 rounded-lg shrink-0 ${
          isBuy ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'
        }`}
      >
        {isBuy ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
      </div>

      {/* Symbol + strategy */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">{trade.symbol}</span>
          <span
            className={`text-xs font-semibold ${
              isBuy ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {trade.side}
          </span>
          <span className="text-xs text-slate-500">{trade.qty} sh</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs text-slate-500">
            @${trade.entryPrice.toFixed(2)}
          </span>
          {trade.exitPrice && (
            <>
              <span className="text-xs text-slate-600">→</span>
              <span className="text-xs text-slate-400">${trade.exitPrice.toFixed(2)}</span>
            </>
          )}
          <span className="text-xs text-slate-600">•</span>
          <span className="text-xs text-slate-500">{trade.timeframe}</span>
        </div>
      </div>

      {/* P&L + status */}
      <div className="text-right shrink-0">
        {hasPnl ? (
          <p
            className={`text-sm font-bold tabular-nums ${
              isWin ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {isWin ? '+' : ''}${(trade.pnl ?? 0).toFixed(2)}
          </p>
        ) : trade.status === 'OPEN' ? (
          <div className="flex items-center gap-1 text-yellow-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="text-xs">Live</span>
          </div>
        ) : null}
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusCfg.className}`}>
          {statusCfg.label}
        </span>
      </div>

      {/* Mode badge */}
      <span
        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
          trade.mode === 'PAPER'
            ? 'bg-sky-500/10 text-sky-400'
            : 'bg-orange-500/10 text-orange-400'
        }`}
      >
        {trade.mode}
      </span>

      {/* Time */}
      <span className="text-[10px] text-slate-600 shrink-0">
        {formatDistanceToNow(new Date(trade.createdAt), { addSuffix: true })}
      </span>
    </motion.div>
  )
}

export function TradeFeed({ trades, mode = 'ALL' }: Props) {
  const [activeMode, setActiveMode] = useState<'ALL' | 'PAPER' | 'LIVE'>(mode)

  const filtered = trades.filter((t) => activeMode === 'ALL' || t.mode === activeMode)

  const tabs = [
    { key: 'ALL' as const, label: 'All' },
    { key: 'PAPER' as const, label: 'Paper' },
    { key: 'LIVE' as const, label: 'Live' },
  ]

  return (
    <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e2e]">
        <span className="text-sm font-semibold text-white">Trade Feed</span>
        <div className="flex items-center gap-1 bg-[#12121a] rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveMode(tab.key)}
              className={`text-xs px-3 py-1 rounded-md transition-colors ${
                activeMode === tab.key
                  ? 'bg-indigo-500/20 text-indigo-300'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trades list */}
      <div className="max-h-80 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <span className="text-sm">No trades yet</span>
            <span className="text-xs mt-1">Waiting for signals...</span>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((trade) => (
              <TradeRow key={trade.id} trade={trade} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

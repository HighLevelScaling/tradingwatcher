"use client"

import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { Zap, TrendingUp, BarChart2, ArrowUpRight, ArrowDownRight, GitMerge } from 'lucide-react'

type SignalType = 'MOMENTUM' | 'MEAN_REVERSION' | 'BREAKOUT' | 'ARBITRAGE'
type TradeSide = 'BUY' | 'SELL'

interface Signal {
  id: string
  symbol: string
  type: SignalType
  direction: TradeSide
  strength: number
  price: number
  timeframe: string
  actedOn: boolean
  createdAt: Date | string
  agent?: { name: string } | null
}

interface Props {
  signals: Signal[]
}

const TYPE_CONFIG: Record<SignalType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  MOMENTUM: { label: 'Momentum', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  MEAN_REVERSION: { label: 'Mean Rev', icon: BarChart2, color: 'text-violet-400', bg: 'bg-violet-400/10' },
  BREAKOUT: { label: 'Breakout', icon: TrendingUp, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
  ARBITRAGE: { label: 'Arbitrage', icon: GitMerge, color: 'text-green-400', bg: 'bg-green-400/10' },
}

function StrengthBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color =
    pct >= 80 ? 'bg-green-400' : pct >= 60 ? 'bg-yellow-400' : 'bg-slate-500'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#1e1e2e] rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <span className="text-[10px] text-slate-500 tabular-nums w-8 text-right">{pct}%</span>
    </div>
  )
}

export function SignalFeed({ signals }: Props) {
  return (
    <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e2e]">
        <span className="text-sm font-semibold text-white">Signal Feed</span>
        <span className="text-xs text-slate-500">{signals.length} recent</span>
      </div>

      {/* Signals */}
      <div className="max-h-80 overflow-y-auto">
        {signals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <span className="text-sm">No signals yet</span>
            <span className="text-xs mt-1">Agents will generate signals during market hours</span>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {signals.map((signal) => {
              const typeCfg = TYPE_CONFIG[signal.type]
              const TypeIcon = typeCfg.icon
              const isBuy = signal.direction === 'BUY'

              return (
                <motion.div
                  key={signal.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 py-3 px-4 hover:bg-[#12121a] transition-colors"
                >
                  {/* Type icon */}
                  <div className={`p-1.5 rounded-lg shrink-0 ${typeCfg.bg} ${typeCfg.color}`}>
                    <TypeIcon className="w-3.5 h-3.5" />
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{signal.symbol}</span>
                      <span
                        className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                          isBuy ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {isBuy ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {signal.direction}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${typeCfg.bg} ${typeCfg.color}`}>
                        {typeCfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 mb-1.5">
                      <span className="text-xs text-slate-500">@${signal.price.toFixed(2)}</span>
                      <span className="text-xs text-slate-600">•</span>
                      <span className="text-xs text-slate-500">{signal.timeframe}</span>
                      {signal.actedOn && (
                        <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded-full">
                          Executed
                        </span>
                      )}
                    </div>
                    <StrengthBar value={signal.strength} />
                  </div>

                  {/* Time */}
                  <span className="text-[10px] text-slate-600 shrink-0">
                    {formatDistanceToNow(new Date(signal.createdAt), { addSuffix: true })}
                  </span>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
